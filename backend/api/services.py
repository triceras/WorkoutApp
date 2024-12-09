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
                    "workout_type": {"type": "string"},
                    "duration": {"type": "string"},
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
    strength_goals_str = ', '.join(strength_goals) if isinstance(strength_goals, list) else strength_goals or 'None'
    available_equipment_str = ', '.join(equipment) if isinstance(equipment, list) else equipment or 'None'
    additional_goals_str = additional_goals or 'None'
    user_comments_str = user_comments or 'No additional comments provided.'

    # Determine the rest or active recovery days based on workout_days
    if workout_days <= 5:
        rest_days_count = 7 - workout_days
        rest_days_instructions = f"{rest_days_count} rest day{'s' if rest_days_count > 1 else ''}."
        day_type_rules = """
3. Day Type Rules:
   - The "type" field for each day MUST be one of: ["workout", "rest"]
   - For workout days:
     * "type": "workout"
     * Include "workout_type" and "duration" fields
   - For rest days:
     * "type": "rest"
     * Do NOT include "workout_type" or "duration" fields
     * Exercises are optional but should be light (e.g., stretching)
   - ALL days must include the "exercises" array and "notes" field
"""
        examples = """
Here's a complete example of a workout day:
{
  "day": "Day 1: Upper Body Strength",
  "type": "workout",
  "workout_type": "Strength",
  "duration": "45 minutes",
  "exercises": [
    {
      "name": "Bench Press",
      "setsReps": "3 sets of 8 reps",
      "equipment": "Barbell",
      "instructions": "Lie on the bench, grip the bar slightly wider than shoulder-width, lower to chest, and press back up.",
      "videoId": null,
      "exercise_type": "strength"
    },
    {
      "name": "Dumbbell Rows",
      "setsReps": "3 sets of 10 reps",
      "equipment": "Dumbbell",
      "instructions": "Bend over at the waist, row the dumbbells to your torso while keeping your back straight.",
      "videoId": null,
      "exercise_type": "strength"
    }
  ],
  "notes": "Focus on controlled movements and proper form."
}

And here's a complete example of a rest day:
{
  "day": "Day 7: Rest Day",
  "type": "rest",
  "exercises": [],
  "notes": "Take this day to recover and prepare for the next week's workouts."
}
"""
    else:
        rest_days_count = 7 - workout_days
        rest_days_instructions = f"{rest_days_count} active recovery day{'s' if rest_days_count > 1 else ''}."
        day_type_rules = """
3. Day Type Rules:
   - The "type" field for each day MUST be one of: ["workout", "active_recovery"]
   - For workout days:
     * "type": "workout"
     * Include "workout_type" and "duration" fields
   - For active recovery days:
     * "type": "active_recovery"
     * Do NOT include "workout_type" or "duration" fields
     * Include 2-3 light exercises (e.g., stretching, mobility work)
   - ALL days must include the "exercises" array and "notes" field
"""
        examples = """
Here's a complete example of a workout day:
{
  "day": "Day 1: Lower Body Strength",
  "type": "workout",
  "workout_type": "Strength",
  "duration": "60 minutes",
  "exercises": [
    {
      "name": "Squats",
      "setsReps": "4 sets of 6 reps",
      "equipment": "Barbell",
      "instructions": "Stand with feet shoulder-width apart, squat down keeping your back straight, and return to standing.",
      "videoId": null,
      "exercise_type": "strength"
    },
    {
      "name": "Deadlifts",
      "setsReps": "3 sets of 8 reps",
      "equipment": "Barbell",
      "instructions": "Stand with feet hip-width apart, bend at the hips and knees to grip the bar, lift by extending hips and knees.",
      "videoId": null,
      "exercise_type": "strength"
    }
  ],
  "notes": "Ensure proper form to prevent injury."
}

And here's a complete example of an active recovery day:
{
  "day": "Day 7: Active Recovery Day",
  "type": "active_recovery",
  "exercises": [
    {
      "name": "Light Cycling",
      "setsReps": "20 minutes",
      "equipment": "Stationary Bike",
      "instructions": "Cycle at a comfortable pace to promote blood flow.",
      "videoId": null,
      "exercise_type": "cardio"
    },
    {
      "name": "Foam Rolling",
      "setsReps": "15 minutes",
      "equipment": "Foam Roller",
      "instructions": "Roll out major muscle groups to release tension.",
      "videoId": null,
      "exercise_type": "flexibility"
    }
  ],
  "notes": "Focus on gentle movement and muscle recovery."
}
"""

    prompt = f"""
You are a professional fitness trainer. Create a personalized workout plan in JSON format based on the following user information:

Age: {age}
Sex: {sex}
Weight: {weight} kg
Height: {height} cm
Fitness Level: {fitness_level}
Strength Goals: {strength_goals_str}
Additional Goals: {additional_goals_str}
Available Equipment: {available_equipment_str}
Time per Session: {workout_time} minutes
Workout Days per Week: {workout_days}

Latest Feedback: {feedback_note}
Additional Comments: {user_comments}

RESPONSE FORMAT (MANDATORY):
The response MUST be a JSON object with the following structure:
{{
  "workoutDays": [
    {{
      "day": "string (e.g., 'Day 1: Upper Body')",
      "type": "workout | rest | active_recovery",
      "workout_type": "string (required if type is workout)",
      "duration": "string (required if type is workout)",
      "exercises": [
        {{
          "name": "string",
          "setsReps": "string",
          "equipment": "string",
          "instructions": "string",
          "videoId": "string | null",
          "exercise_type": "string"
        }}
      ],
      "notes": "string"
    }}
  ]
}}

CRITICAL REQUIREMENTS - YOUR RESPONSE WILL BE REJECTED IF ANY OF THESE ARE NOT MET:

1. Schedule Requirements (MANDATORY):
   * Total of 7 days per week
   * If workout_days <= 5:
     - Exactly {workout_days} workout days
     - Remaining days must be REST days (not active recovery)
   * If workout_days > 5:
     - Exactly {workout_days} workout days
     - Remaining days must be ACTIVE RECOVERY days (not rest)
   * Distribute workout days evenly throughout the week
   * Label days as "Day X: [Focus Area]" where X is 1 to 7
   * Ensure proper rest/recovery between similar muscle groups

2. Exercise Requirements (MANDATORY):
   - Each exercise MUST include ALL of these fields:
     * "name": Exercise name
     * "setsReps": Sets and reps or duration
     * "equipment": Equipment needed
     * "instructions": How to perform
     * "videoId": null
     * "exercise_type": Exercise category
   - The "exercise_type" MUST be one of: ['strength', 'flexibility', 'balance', 'endurance', 'power', 'speed', 'agility', 'plyometric', 'core', 'cardio']

{day_type_rules}

Example format:
{examples}

{rest_days_instructions}

FINAL VERIFICATION CHECKLIST - VERIFY BEFORE SUBMITTING:
1. EXACTLY {workout_days} days have type: "workout"
2. EXACTLY {7 - workout_days} days have type: {"rest" if workout_days <= 5 else "active_recovery"}
3. EVERY exercise has "videoId": null
4. EVERY exercise has ALL required fields
5. ALL days include exercises array and notes field
6. Only workout days have workout_type and duration fields
7. Total number of days equals 7
8. Days follow the specified Monday-Sunday pattern

IMPORTANT: Do NOT use any other root keys like "week", "schedule", "weekly_schedule", or "workout_plan". The root key must be "workoutDays".

Return ONLY the JSON. No text before or after. No comments or backticks.
"""
    return prompt

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
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"HTTP error occurred during AI model invocation: {http_err}")
        raise ReplicateServiceUnavailable(f"AI model HTTP error: {http_err}") from http_err
    except Exception as err:
        logger.error(f"Error during AI model invocation: {err}")
        raise ReplicateServiceUnavailable(f"AI model error: {err}") from err

    # Log the AI output for debugging
    logger.debug(f"AI Model Output:\n{output_str}")

    try:
        # Parse the workout plan data
        workout_plan_data = json.loads(output_str)
        logger.info("Successfully parsed workout plan data from JSON response")

        # Verify the required workoutDays field is present
        if 'workoutDays' not in workout_plan_data:
            logger.error("No 'workoutDays' field in workout plan data")
            raise ValueError("Invalid workout plan format: missing 'workoutDays' field")

        # Auto-correct the number of days if necessary
        if len(workout_plan_data['workoutDays']) < 7:
            logger.warning(f"Workout plan has fewer than 7 days ({len(workout_plan_data['workoutDays'])}). Auto-correcting...")
            
            # Add default rest or active recovery days to reach 7 days
            while len(workout_plan_data['workoutDays']) < 7:
                default_day_number = len(workout_plan_data['workoutDays']) + 1
                default_day_type = 'rest' if workout_days <= 5 else 'active_recovery'
                default_day = {
                    'day': f"Day {default_day_number}: {'Rest Day' if default_day_type == 'rest' else 'Active Recovery Day'}",
                    'type': default_day_type,
                    'exercises': [],
                    'notes': 'Added automatically to complete 7-day plan.'
                }
                workout_plan_data['workoutDays'].append(default_day)
            logger.info(f"Auto-corrected workout plan to include {len(workout_plan_data['workoutDays'])} days.")

        try:
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
        
        # For workout_days > 5, expect active recovery days
        else:
            if actual_workout_days != workout_days:
                logger.error(f"Expected exactly {workout_days} workout days, but got {actual_workout_days}.")
                raise ValueError(f"Expected exactly {workout_days} workout days, but got {actual_workout_days}.")
            
            expected_active_recovery = 7 - workout_days
            if actual_active_recovery_days != expected_active_recovery:
                logger.error(f"Expected exactly {expected_active_recovery} active recovery days, but got {actual_active_recovery_days}.")
                raise ValueError(f"Expected exactly {expected_active_recovery} active recovery days, but got {actual_active_recovery_days}.")
            
            if actual_rest_days > 0:
                logger.error(f"Expected no rest days when workout_days > 5, but got {actual_rest_days}.")
                raise ValueError(f"No rest days should be present when workout_days > 5.")

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

    except Exception as e:
        logger.error(f"Error processing feedback with AI: {e}")
        logger.info("Task completed with error")
        raise WorkoutPlanCreationError(f"Error generating workout plan: {e}") from e

    return None
