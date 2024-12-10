# backend/api/services.py

import os
import json
import logging
import requests
from jsonschema import validate, ValidationError
from django.conf import settings
from .models import TrainingSession, WorkoutPlan
from .helpers import (
    send_workout_plan_to_group,
    assign_video_ids_to_exercises,
    assign_video_ids_to_exercise_list
)
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.db import transaction, IntegrityError
import re
from replicate import Client
from django.core.files.base import ContentFile
import time
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Define custom exceptions
class ReplicateServiceUnavailable(Exception):
    """Exception raised when the Replicate service is unavailable."""
    pass

class WorkoutPlanCreationError(Exception):
    """Exception raised when creating or updating a WorkoutPlan fails."""
    pass

# Define the JSON schema for the entire workout plan
WORKOUT_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "workoutDays": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {"type": "string"},
                    "type": {"type": "string", "enum": ["workout", "rest", "active_recovery"]},
                    "workout_type": {"type": ["string", "null"]},
                    "duration": {"type": ["string", "integer"]},
                    "exercises": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "setsReps": {"type": "string"},
                                "equipment": {"type": "string"},
                                "instructions": {"type": "string"},
                                "videoId": {"type": ["string", "null"]},
                                "exercise_type": {
                                    "type": "string",
                                    "enum": [
                                        "strength",
                                        "flexibility",
                                        "balance",
                                        "endurance",
                                        "power",
                                        "speed",
                                        "agility",
                                        "plyometric",
                                        "core",
                                        "cardio"
                                    ]
                                },
                            },
                            "required": ["name", "setsReps", "equipment", "instructions"],
                            "additionalProperties": True,
                        },
                    },
                    "notes": {"type": "string"}
                },
                "required": ["day", "type", "exercises", "notes"],
                "allOf": [
                    {
                        "if": {
                            "properties": { "type": { "const": "workout" } }
                        },
                        "then": {
                            "required": ["workout_type", "duration"]
                        }
                    }
                ],
                "additionalProperties": True,
            }
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["workoutDays"],
    "additionalProperties": True,
}

def is_json_complete(json_str):
    """
    Checks if the JSON string has matching opening and closing braces.
    """
    return json_str.count('{') == json_str.count('}')

def validate_workout_plan(workout_plan):
    """
    Validates the workout plan against the predefined JSON schema.

    Args:
        workout_plan (dict): The workout plan data to validate.

    Returns:
        bool: True if valid, False otherwise.
    """
    try:
        validate(instance=workout_plan, schema=WORKOUT_PLAN_SCHEMA)
        logger.debug("Workout plan JSON is valid.")
        return True
    except ValidationError as ve:
        logger.error(f"Workout plan JSON validation error: {ve.message}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during workout plan JSON validation: {e}")
        raise

def get_latest_feedback(user):
    """
    Retrieves the latest feedback from the user.

    Args:
        user (User): The user instance.

    Returns:
        str: The latest feedback text or None if no feedback exists.
    """
    try:
        training_session = TrainingSession.objects.filter(user=user).latest('date')
        return training_session.comments
    except TrainingSession.DoesNotExist:
        return None

def extract_json_from_text(text):
    """
    Extracts the JSON content from text, handling code blocks and triple backticks.
    """
    try:
        # Remove any triple backticks and language identifiers
        text = re.sub(r'^```[a-zA-Z]*\n?', '', text, flags=re.MULTILINE)
        text = text.replace('```', '')  # Remove any remaining backticks
        # Remove any leading/trailing whitespace
        text = text.strip()
        # Find the first opening brace
        start_index = text.find('{')
        if start_index == -1:
            return None
        # Find the last closing brace
        end_index = text.rfind('}')
        if end_index == -1:
            return None
        json_str = text[start_index:end_index+1]
        # Verify that braces are balanced
        if json_str.count('{') != json_str.count('}'):
            logger.error("Braces are not balanced in JSON string.")
            return None
        return json_str
    except Exception as e:
        logger.error(f"Error extracting JSON: {e}")
        return None

def remove_comments(json_str):
    """
    Removes JavaScript-style comments from a JSON string.

    Args:
        json_str (str): The JSON string with potential comments.

    Returns:
        str: The cleaned JSON string without comments.
    """
    json_str = re.sub(r'//.*?\n', '\n', json_str)
    return json_str

def generate_prompt(
    age, sex, weight, height, fitness_level, strength_goals, additional_goals,
    equipment, workout_time, workout_days, feedback_note=None, user_comments=None
):
    """
    Generates the prompt for the AI model to create a customized workout plan.
    """
    # Convert workout_days to int if it's a string
    workout_days_int = int(workout_days) if isinstance(workout_days, str) else workout_days
    
    base_prompt = f"""Create a personalized 7-day workout plan based on the following information:

User Profile:
- Age: {age}
- Sex: {sex}
- Weight: {weight}
- Height: {height}
- Fitness Level: {fitness_level}
- Available Equipment: {equipment}
- Time per workout: {workout_time} minutes
- Requested workout days per week: {workout_days}

Goals:
- Strength Goals: {strength_goals}
- Additional Goals: {additional_goals}

Requirements:
1. Structure the plan as a JSON object with EXACTLY 7 DAYS total
2. Include specific exercises with sets, reps, and rest periods
3. Provide clear instructions for each exercise
4. Consider the user's fitness level and available equipment
5. Include warm-up and cool-down routines
6. Specify workout duration and intensity
7. Add variation in exercises and muscle groups"""

    # Add specific instructions for high-frequency training
    if workout_days_int >= 6:
        base_prompt += f"""
8. IMPORTANT: Distribution of the 7 days:
   - {workout_days_int - 1} workout days
   - Exactly ONE active recovery day
   - ONE complete rest day
   
   The active recovery day:
   - Should focus on mobility, stretching, and light cardio
   - Must be placed strategically between intense workout days
   - Label as 'type': 'active_recovery'
   
   The rest day:
   - Should be a complete rest day with no planned activities
   - Label as 'type': 'rest'"""
    else:
        base_prompt += f"""
8. Distribution of the 7 days:
   - {workout_days_int} workout days
   - {7 - workout_days_int} rest days labeled as 'type': 'rest'"""

    if feedback_note:
        base_prompt += f"\n\nPrevious Feedback: {feedback_note}"
    
    if user_comments:
        base_prompt += f"\n\nUser Comments: {user_comments}"

    base_prompt += """

Provide the response in the following JSON format:
{
    "workoutDays": [
        {
            "day": "Day 1",
            "type": "workout",
            "workout_type": "Strength",
            "duration": "60 minutes",
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": 3,
                    "reps": "8-10",
                    "rest": "90 seconds",
                    "instructions": "Detailed form instructions...",
                    "setsReps": "3 sets of 8-10 reps",
                    "equipment": "barbell"
                }
            ],
            "warmup": ["Exercise 1", "Exercise 2"],
            "cooldown": ["Stretch 1", "Stretch 2"],
            "notes": "Focus on proper form and control."
        },
        {
            "day": "Day 7",
            "type": "rest",
            "workout_type": null,
            "duration": "0 minutes",
            "exercises": [],
            "warmup": [],
            "cooldown": [],
            "notes": "Take a complete rest day to allow for recovery."
        }
    ]
}

IMPORTANT NOTES:
1. The response MUST contain EXACTLY 7 days in total.
2. For workout days, workout_type MUST be one of: Cardio, Endurance, Speed, Agility, Plyometric, Core, Strength, Flexibility, Balance.
3. For rest days, workout_type MUST be null."""

    return base_prompt

def generate_workout_plan(user_id, feedback_text=None):
    """
    Generates or updates a workout plan for the given user based on their profile and feedback.

    Args:
        user_id (int): The ID of the user.
        feedback_text (str, optional): Additional feedback from the user.

    Returns:
        WorkoutPlan: The generated or updated workout plan instance.
    """
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User does not exist for user_id {user_id}")
        raise ValueError(f"User does not exist for user_id {user_id}")

    # Collect user data
    age = getattr(user, 'age', None)
    sex = getattr(user, 'sex', None)
    weight = getattr(user, 'weight', None)
    height = getattr(user, 'height', None)
    fitness_level = getattr(user, 'fitness_level', None)
    strength_goals = list(user.strength_goals.all().values_list('name', flat=True)) if hasattr(user, 'strength_goals') else []
    equipment = list(user.equipment.all().values_list('name', flat=True)) if hasattr(user, 'equipment') else []
    workout_days = getattr(user, 'workout_days', 0)
    workout_time = getattr(user, 'workout_time', 0)
    additional_goals = getattr(user, 'additional_goals', None)

    # Incorporate user feedback for dynamic adjustments
    feedback_note = get_latest_feedback(user) if feedback_text is None else feedback_text

    # Prepare the prompt
    prompt = generate_prompt(
        age=age,
        sex=sex,
        weight=weight,
        height=height,
        fitness_level=fitness_level,
        strength_goals=strength_goals,
        equipment=equipment,
        workout_days=workout_days,
        workout_time=workout_time,
        additional_goals=additional_goals,
        feedback_note=feedback_note,
        user_comments=None  # Assuming no additional comments
    )

    # Log the prompt for debugging
    logger.info(f"Prompt for AI model:\n{prompt}")

    # Get OpenRouter AI API Key
    openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
    if not openrouter_api_key:
        logger.error("OpenRouter API Key not found in environment variables.")
        raise ValueError("OpenRouter API Key not found")

    # Prepare the payload for OpenRouter AI
    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.5,
    }

    headers = {
        "Authorization": f"Bearer {openrouter_api_key}",
        "Content-Type": "application/json",
    }

    # Optional headers
    site_url = os.environ.get('YOUR_SITE_URL')
    app_name = os.environ.get('YOUR_APP_NAME')
    if site_url:
        headers["HTTP-Referer"] = site_url
    if app_name:
        headers["X-Title"] = app_name

    # Run the model using OpenRouter AI
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(payload),
            timeout=60,
        )
        response.raise_for_status()  # Raise an error for bad status codes
        ai_response = response.json()

        # Log AI model response
        logger.info(f"AI Model Response: {ai_response}")

        # Extract the assistant's reply
        output_str = ai_response['choices'][0]['message']['content']
        logger.debug(f"Raw AI Output:\n{output_str}")
        
        # Clean and extract the JSON content
        json_str = extract_json_from_text(output_str)
        if not json_str:
            # If the extract_json_from_text failed, try a simpler approach
            # Sometimes the AI response is already a clean JSON
            if output_str.strip().startswith('{') and output_str.strip().endswith('}'):
                json_str = output_str.strip()
            else:
                logger.error("Failed to extract valid JSON from AI response")
                raise ValueError("Invalid response format from AI model")

        try:
            # Parse the workout plan data
            workout_plan_data = json.loads(json_str)
            logger.info("Successfully parsed workout plan data from JSON response")
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            # Try one more time after removing any potential Unicode characters
            try:
                json_str = ''.join(char for char in json_str if ord(char) < 128)
                workout_plan_data = json.loads(json_str)
                logger.info("Successfully parsed workout plan data after cleaning Unicode characters")
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse workout plan data: {e}")

        # Verify the required workoutDays field is present
        if 'workoutDays' not in workout_plan_data:
            logger.error("No 'workoutDays' field in workout plan data")
            raise ValueError("Invalid workout plan format: missing 'workoutDays' field")

        # Process each day in the workout plan
        for idx, day in enumerate(workout_plan_data.get('workoutDays', []), start=1):
            # Ensure day naming follows "Day X: Description" or actual day names
            if 'day' not in day:
                day['day'] = f"Day {idx}: {day.get('workout_type', 'Workout') if day.get('type') == 'workout' else day.get('type').replace('_', ' ').capitalize()}"
            else:
                # Reformat the day name to ensure consistency
                if not day['day'].startswith(f"Day {idx}"):
                    description = day['workout_type'] if day.get('type') == 'workout' else day['type'].replace('_', ' ').capitalize()
                    day['day'] = f"Day {idx}: {description}"

            # Process exercises
            if 'exercises' in day:
                for exercise in day['exercises']:
                    # Initialize videoId if not present
                    if 'videoId' not in exercise:
                        exercise['videoId'] = None
                        logger.debug(f"Added 'videoId': null for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")

                    # Ensure all required fields are present with default values if needed
                    if 'setsReps' not in exercise:
                        exercise['setsReps'] = '3 sets of 10-12 reps'
                        logger.debug(f"Added default 'setsReps' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
                    if 'equipment' not in exercise:
                        exercise['equipment'] = 'bodyweight'
                        logger.debug(f"Added default 'equipment' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
                    if 'instructions' not in exercise:
                        exercise['instructions'] = f"Perform {exercise.get('name', 'the exercise')} with proper form."
                        logger.debug(f"Added default 'instructions' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")

            # Ensure notes field is present
            if 'notes' not in day:
                day['notes'] = "Focus on proper form and technique."
                logger.debug(f"Added default 'notes' for Day {idx}.")

        # Log the processed workout plan data before validation
        logger.info(f"Processed workout plan data before validation: {json.dumps(workout_plan_data, indent=2)}")

    except Exception as e:
        logger.error(f"Error processing workout plan data: {e}", exc_info=True)
        raise

    # Validate the complete workout plan against the schema
    try:
        validate(instance=workout_plan_data, schema=WORKOUT_PLAN_SCHEMA)
    except ValidationError as e:
        logger.error(f"Workout plan validation error: {str(e)}")
        raise ValueError(f"Generated workout plan does not conform to the schema: {str(e)}")

    # Assign YouTube video IDs to exercises
    assign_video_ids_to_exercises(workout_plan_data)

    # Count the different types of days
    workout_days_list = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'workout']
    rest_days_list = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'rest']
    active_recovery_days = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'active_recovery']
    
    actual_workout_days = len(workout_days_list)
    actual_rest_days = len(rest_days_list)
    actual_active_recovery_days = len(active_recovery_days)
    total_days = len(workout_plan_data['workoutDays'])

    # Log the counts
    logger.info(f"Plan breakdown - Workout: {actual_workout_days}, Rest: {actual_rest_days}, Active Recovery: {actual_active_recovery_days}")
    
    # Validate total number of days
    if total_days != 7:
        logger.error(f"Expected 7 total days, but got {total_days}.")
        raise ValueError(f"Expected 7 total days, but got {total_days}.")

    # Verify the day order matches Monday-Sunday pattern
    expected_days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
    for i, (day, expected) in enumerate(zip(workout_plan_data['workoutDays'], expected_days)):
        if not day['day'].startswith(f"Day {i+1}"):
            logger.error(f"Day {i+1} should start with '{expected}', but got '{day['day']}'")
            raise ValueError(f"Invalid day order. Day {i+1} should start with '{expected}'")

    # For workout_days <= 5, expect rest days
    if workout_days <= 5:
        if actual_workout_days != workout_days:
            logger.error(f"Expected exactly {workout_days} workout days, but got {actual_workout_days}.")
            raise ValueError(f"Expected exactly {workout_days} workout days, but got {actual_workout_days}.")
        
        expected_rest_days = 7 - workout_days
        if actual_rest_days != expected_rest_days:
            logger.error(f"Expected exactly {expected_rest_days} rest days, but got {actual_rest_days}.")
            raise ValueError(f"Expected exactly {expected_rest_days} rest days, but got {actual_rest_days}.")
        
        if actual_active_recovery_days > 0:
            logger.error(f"Expected no active recovery days when workout_days <= 5, but got {actual_active_recovery_days}.")
            raise ValueError(f"No active recovery days should be present when workout_days <= 5.")
    
    # For workout_days > 5, handle 6 and 7 day cases differently
    else:
        if workout_days == 6:
            # For 6 days: 5 workouts + 1 active recovery + 1 rest
            if actual_workout_days != 5:
                logger.error(f"For 6-day plan, expected exactly 5 workout days, but got {actual_workout_days}.")
                raise ValueError(f"For 6-day plan, expected exactly 5 workout days, but got {actual_workout_days}.")
            
            if actual_active_recovery_days != 1:
                logger.error(f"Expected exactly 1 active recovery day, but got {actual_active_recovery_days}.")
                raise ValueError(f"Expected exactly 1 active recovery day, but got {actual_active_recovery_days}.")
            
            if actual_rest_days != 1:
                logger.error(f"Expected exactly 1 rest day, but got {actual_rest_days}.")
                raise ValueError(f"Expected exactly 1 rest day, but got {actual_rest_days}.")
        else:  # workout_days == 7
            # For 7 days: 6 workouts + 1 active recovery + 0 rest
            if actual_workout_days != 6:
                logger.error(f"For 7-day plan, expected exactly 6 workout days, but got {actual_workout_days}.")
                raise ValueError(f"For 7-day plan, expected exactly 6 workout days, but got {actual_workout_days}.")
            
            if actual_active_recovery_days != 1:
                logger.error(f"Expected exactly 1 active recovery day, but got {actual_active_recovery_days}.")
                raise ValueError(f"Expected exactly 1 active recovery day, but got {actual_active_recovery_days}.")
            
            if actual_rest_days != 0:
                logger.error(f"Expected 0 rest days for 7-day plan, but got {actual_rest_days}.")
                raise ValueError(f"Expected 0 rest days for 7-day plan, but got {actual_rest_days}.")

    # Log the final breakdown
    logger.info(f"Final plan breakdown - Total days: {total_days}")
    logger.info(f"Workout Days: {actual_workout_days}, Rest Days: {actual_rest_days}, Active Recovery Days: {actual_active_recovery_days}")

    # Save or Update the workout plan to the database
    try:
        with transaction.atomic():
            # Use update_or_create to handle existing WorkoutPlan
            plan, created = WorkoutPlan.objects.update_or_create(
                user=user,
                defaults={ 
                    'plan_data': {
                        'workoutDays': workout_plan_data['workoutDays'],
                        'startDate': timezone.now().isoformat(),  # Add start date in ISO format
                        'createdAt': timezone.now().isoformat(),
                        'userId': user_id
                    },
                    'created_at': timezone.now()
                }
            )
            if created:
                logger.info(f"WorkoutPlan created for user_id {user_id}")
            else:
                logger.info(f"WorkoutPlan updated for user_id {user_id}")
        return plan
    except IntegrityError as e:
        logger.error(f"IntegrityError while saving WorkoutPlan: {e}")
        raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e
    except Exception as e:
        logger.error(f"Unexpected error while saving WorkoutPlan: {e}")
        raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e

    return None

def delete_old_profile_picture(user):
    """
    Delete the user's old profile picture if it exists.
    """
    try:
        if user.profile_picture:
            # Get the old file path
            old_file_path = user.profile_picture.path
            # Delete from storage if exists
            if os.path.isfile(old_file_path):
                os.remove(old_file_path)
                logger.info(f"Deleted old profile picture for user {user.id}")
    except Exception as e:
        logger.warning(f"Error deleting old profile picture for user {user.id}: {str(e)}")

def validate_image_file(file_content):
    """
    Validate that the file content is a valid image file.
    """
    try:
        # Try to open the image using Pillow
        image = Image.open(io.BytesIO(file_content))
        image.verify()
        return True
    except Exception as e:
        logger.error(f"Invalid image file: {str(e)}")
        return False

def generate_profile_picture(user):
    """
    Generate a profile picture for a new user using the black-forest-labs/flux-1.1-pro model.
    """
    try:
        logger.info(f"Starting profile picture generation for user {user.id}")
        
        if not settings.REPLICATE_API_TOKEN:
            error_msg = "REPLICATE_API_TOKEN is not set in environment variables. Please add it to your .env file."
            logger.error(error_msg)
            raise ReplicateServiceUnavailable(error_msg)
            
        # Initialize the Replicate client
        client = Client(api_token=settings.REPLICATE_API_TOKEN)
        logger.info("Replicate client initialized successfully")

        # Adjust prompt based on user's sex
        if user.sex == "Male":
            prompt = ("A professional headshot of an Asian male athlete in workout clothes, "
                     "muscular build, short black hair, determined expression, "
                     "high quality, photorealistic, centered composition, looking at camera, "
                     "natural lighting, gym background, clean modern style")
            negative_prompt = ("female, woman, long hair, feminine features, "
                             "blurry, cartoon, anime, illustration, unrealistic, "
                             "distorted, deformed, low quality")
        else:
            prompt = ("A professional headshot of an Asian female athlete in workout clothes, "
                     "athletic build, tied back hair, confident expression, "
                     "high quality, photorealistic, centered composition, looking at camera, "
                     "natural lighting, gym background, clean modern style")
            negative_prompt = ("male, masculine features, facial hair, "
                             "blurry, cartoon, anime, illustration, unrealistic, "
                             "distorted, deformed, low quality")

        # Generate the image using black-forest-labs/flux-1.1-pro model
        prediction = client.run(
            "black-forest-labs/flux-1.1-pro",
            input={
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "aspect_ratio": "1:1",  # Square aspect ratio for profile picture
                "width": 512,  # Must be multiple of 32
                "height": 512,  # Must be multiple of 32
                "output_format": "png",  # Using PNG for best quality
                "output_quality": 100,  # Maximum quality
                "safety_tolerance": 2,  # Default safety tolerance
                "prompt_upsampling": True,  # Enable creative generation
                "seed": -1  # Random seed for variation
            }
        )
        logger.info(f"Image generation completed, prediction: {prediction}")

        # Check if we got a valid output URL
        if not prediction:
            logger.error(f"No output received from Replicate for user {user.id}. Prediction: {prediction}")
            return False

        # Download the image with timeout and retries
        max_retries = 3
        timeout = 10  # seconds
        
        for attempt in range(max_retries):
            try:
                response = requests.get(prediction, timeout=timeout)
                logger.info(f"Image download attempt {attempt + 1}, status code: {response.status_code}")
                
                if response.status_code == 200:
                    # Validate the downloaded content is an actual image
                    if not validate_image_file(response.content):
                        logger.error(f"Downloaded content is not a valid image for user {user.id}")
                        return False
                    
                    # Create a unique filename with timestamp to prevent conflicts
                    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"profile_picture_{user.id}_{timestamp}.png"
                    logger.info(f"Saving image as: {filename}")
                    
                    # Delete old profile picture if it exists
                    delete_old_profile_picture(user)
                    
                    try:
                        # Save the image to the user's profile
                        user.profile_picture.save(
                            filename,
                            ContentFile(response.content),
                            save=True
                        )
                        
                        # Verify the file was saved correctly
                        if not os.path.exists(user.profile_picture.path):
                            logger.error(f"Failed to verify saved profile picture for user {user.id}")
                            return False
                        
                        logger.info(f"Successfully generated and saved profile picture for user {user.id}")
                        return True
                    except Exception as e:
                        logger.error(f"Failed to save profile picture for user {user.id}: {str(e)}")
                        return False
                
                elif response.status_code == 404:
                    logger.error(f"Image URL not found for user {user.id}")
                    break  # Don't retry on 404
                else:
                    logger.warning(f"Failed download attempt {attempt + 1} with status code: {response.status_code}")
                    if attempt < max_retries - 1:
                        time.sleep(1)  # Wait before retrying
            except requests.Timeout:
                logger.warning(f"Timeout on download attempt {attempt + 1}")
                if attempt < max_retries - 1:
                    time.sleep(1)
            except requests.RequestException as e:
                logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(1)
        
        logger.error(f"All download attempts failed for user {user.id}")
        return False
            
    except Exception as e:
        logger.error(f"Error generating profile picture for user {user.id}: {str(e)}", exc_info=True)
        return False
