# api/services.py

import os
import replicate
import json
import logging
import requests
from jsonschema import validate, ValidationError
from django.conf import settings
from .models import TrainingSession, WorkoutPlan, Exercise
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import re

logger = logging.getLogger(__name__)

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
                                "youtube_video_id": {"type": ["string", "null"]},  # Updated to include video ID
                            },
                            "required": ["name", "setsReps", "equipment", "instructions"]
                        }
                    }
                },
                "required": ["day", "duration", "exercises"]
            }
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["workoutDays", "additionalTips"]
}

# Define the JSON schema for a single session
SESSION_SCHEMA = {
    "type": "object",
    "properties": {
        "day": {"type": "string"},
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
                    "youtube_video_id": {"type": ["string", "null"]},  # Updated to include video ID
                },
                "required": ["name", "setsReps", "equipment", "instructions"]
            }
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["day", "duration", "exercises"]
}

class ReplicateServiceUnavailable(Exception):
    """Exception raised when the Replicate service is unavailable."""
    pass

def validate_workout_plan(workout_plan):
    """Validates the entire workout plan against the JSON schema."""
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

def validate_session(session):
    """Validates a single session against the JSON schema."""
    try:
        validate(instance=session, schema=SESSION_SCHEMA)
        logger.debug("Session JSON is valid.")
        return True
    except ValidationError as ve:
        logger.error(f"Session JSON validation error: {ve.message}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during session JSON validation: {e}")
        raise

def create_prompt(age, sex, weight, height, fitness_level, strength_goals, equipment, workout_days, workout_time, additional_goals, feedback_note=""):
    """
    Creates a detailed prompt based on user's profile to generate a personalized workout plan.
    Instructs the AI to return the plan in a predefined JSON format.

    Args:
        All user attributes as parameters.
        feedback_note (str): Optional feedback to incorporate.

    Returns:
        str: The formatted prompt.
    """
    equipment_list = ', '.join(equipment) if equipment else 'None'
    strength_goals_list = ', '.join(strength_goals) if strength_goals else 'None'

    prompt = (
        f"Create a personalized weekly workout plan for the following user in strict JSON format. "
        f"Ensure the JSON adheres exactly to the provided schema without any additional text or explanations.\n\n"
        f"**User Profile:**\n"
        f"- Age: {age}\n"
        f"- Sex: {sex}\n"
        f"- Weight: {weight} kg\n"
        f"- Height: {height} cm\n"
        f"- Fitness Level: {fitness_level}\n"
        f"- Strength Goals: {strength_goals_list}\n"
        f"- Additional Goals: {additional_goals}\n"
        f"- Available Equipment: {equipment_list}\n"
        f"- Workout Availability: {workout_time} minutes per session, {workout_days} days per week\n\n"
    )

    if feedback_note:
        prompt += f"**Feedback:** {feedback_note}\n\n"

    prompt += (
        f"**Requirements:**\n"
        f"1. Adjust the number of exercises, sets, and reps based on the user's available time.\n"
        f"2. Incorporate cardio exercises using the available equipment or generic cardio equipment if specific ones are not available.\n"
        f"3. Tailor the intensity and complexity of exercises based on the user's fitness level, age, and sex.\n"
        f"4. Vary the workout plan weekly based on user feedback and progression.\n\n"
        f"5. Present at least 4 exercises for each day of the week.\n\n"
        f"6. Users with more time available will have more exercises or/and more sets/reps.\n\n"
        f"7. If Feedback field is provided then change the workout plan accordingly.\n\n"
        f"**Instructions for Each Exercise:**\n"
        f"Provide detailed, step-by-step instructions on how to perform each exercise correctly and safely.\n\n"
        f"**JSON Schema:**\n"
        f"```json\n"
        f"{{\n"
        f"  \"workoutDays\": [\n"
        f"    {{\n"
        f"      \"day\": \"Day 1: Chest and Triceps\",\n"
        f"      \"duration\": \"60 minutes\",\n"
        f"      \"exercises\": [\n"
        f"        {{\n"
        f"          \"name\": \"Barbell Bench Press\",\n"
        f"          \"setsReps\": \"3 sets of 8-12 reps\",\n"
        f"          \"equipment\": \"Barbell, Bench\",\n"
        f"          \"instructions\": \"Lie on the bench with your feet planted firmly on the ground. Grip the barbell slightly wider than shoulder-width apart. Lower the barbell to your chest while inhaling, then press it back up while exhaling. Maintain a steady pace and control throughout the movement.\",\n"
        f"          \"youtube_video_id\": \"IODxDxX7oi4\"\n"
        f"        }},\n"
        f"        {{\n"
        f"          \"name\": \"Tricep Pushdown\",\n"
        f"          \"setsReps\": \"3 sets of 12-15 reps\",\n"
        f"          \"equipment\": \"Cable Machine\",\n"
        f"          \"instructions\": \"Attach a straight bar to the high pulley of the cable machine. Grasp the bar with an overhand grip, keeping your elbows close to your body. Push the bar down until your arms are fully extended, then slowly return to the starting position.\",\n"
        f"          \"youtube_video_id\": \"0bv57hyZ1kI\"\n"
        f"        }}\n"
        f"      ]\n"
        f"    }},\n"
        f"    {{\n"
        f"      \"day\": \"Day 2: Back and Biceps\",\n"
        f"      \"duration\": \"60 minutes\",\n"
        f"      \"exercises\": [\n"
        f"        {{\n"
        f"          \"name\": \"Deadlifts\",\n"
        f"          \"setsReps\": \"3 sets of 8-12 reps\",\n"
        f"          \"equipment\": \"Barbell\",\n"
        f"          \"instructions\": \"Stand with your feet shoulder-width apart, gripping the barbell with your hands shoulder-width apart. Keeping your back straight and your core engaged, lift the barbell off the ground. Stand up, squeezing your glutes and pushing your hips back. Lower the barbell to the starting position, keeping control throughout the entire range of motion. Repeat for the desired number of reps and sets.\",\n"
        f"          \"youtube_video_id\": \"ytGaGIn3SjE\"\n"
        f"        }},\n"
        f"        {{\n"
        f"          \"name\": \"Bicep Curl\",\n"
        f"          \"setsReps\": \"3 sets of 10-12 reps\",\n"
        f"          \"equipment\": \"Dumbbells\",\n"
        f"          \"instructions\": \"Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing forward. Curl the dumbbells up towards your shoulders, keeping your upper arms still. Lower the dumbbells to the starting position, keeping control throughout the entire range of motion. Repeat for the desired number of reps and sets.\",\n"
        f"          \"youtube_video_id\": \"ykJmrZ5v0Oo\"\n"
        f"        }}\n"
        f"      ]\n"
        f"    }}\n"
        f"  ],\n"
        f"  \"additionalTips\": [\n"
        f"    \"Ensure proper form to prevent injuries.\",\n"
        f"    \"Stay hydrated throughout your workouts.\"\n"
        f"  ]\n"
        f"}}\n"
        f"```\n\n"
        f"**Instructions:**\n"
        f"1. **Provide only the JSON response without any additional explanations or text.**\n"
        f"2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**\n"
        f"3. **Do not include any text before or after the JSON.**\n"
        f"4. **If you need to mention anything, include it within the JSON as 'additionalTips'.**\n"
    )

    return prompt

def extract_json_from_text(text):
    """
    Extracts the first JSON object found in the text.
    """
    try:
        # Regular expression to find JSON object
        json_pattern = r'\{.*?\}'
        matches = re.findall(json_pattern, text, re.DOTALL)

        if matches:
            # Return the first JSON object found
            return matches[0]
        else:
            return None
    except Exception as e:
        logger.error(f"Error extracting JSON: {e}")
        return None

def get_latest_feedback(user):
    """
    Retrieves the latest feedback from the user's training sessions to adjust the workout plan.

    Args:
        user: A User object.

    Returns:
        str: A note based on the user's latest feedback.
    """
    latest_session = TrainingSession.objects.filter(user=user).order_by('-date').first()
    if latest_session:
        feedback = latest_session.emoji_feedback
        comments = latest_session.comments.strip()
        if feedback == '😊':
            feedback_note = "The user rated their last session as 'Good'. Maintain or slightly increase the intensity."
            if comments:
                feedback_note += f" Additional comments: {comments}"
        elif feedback == '😐':
            feedback_note = "The user rated their last session as 'Average'. Maintain the current intensity."
            if comments:
                feedback_note += f" Additional comments: {comments}"
        elif feedback == '😟':
            feedback_note = "The user rated their last session as 'Poor'. Consider reducing the intensity or adjusting the exercises."
            if comments:
                feedback_note += f" Additional comments: {comments}"
        else:
            feedback_note = "No specific feedback available. Create a balanced workout plan."
            if comments:
                feedback_note += f" User comments: {comments}"
    else:
        feedback_note = "No feedback available. Create a balanced workout plan."

    return feedback_note

def get_youtube_video_id(exercise_name):
    """
    Uses Replicate's LLaMA model to generate a YouTube search query based on the exercise name,
    then fetches the top YouTube video ID using the YouTube Data API.

    Args:
        exercise_name (str): The name of the exercise.

    Returns:
        str or None: The YouTube video ID if found, else None.
    """
    try:
        # Step 1: Generate a YouTube search query using Replicate's LLaMA model
        prompt = f"Generate a concise YouTube search query to find instructional videos for the exercise: {exercise_name}."

        logger.debug(f"Generating YouTube search query for exercise: {exercise_name}")

        # Initialize Replicate client with your API token
        replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
        if not replicate_api_token:
            logger.error("Replicate API token not found in environment variables.")
            return None

        client = replicate.Client(api_token=replicate_api_token)

        # Specify the model version
        model_version = "meta/meta-llama-3-70b-instruct"  # Ensure this is the correct model identifier on Replicate

        # Set the input parameters for the model
        inputs = {
            'prompt': prompt,
            'temperature': 0.5,  # Lowered for more deterministic output
            'max_new_tokens': 50,  # Adjust as needed
        }

        # Run the model prediction
        output = client.run(
            model_version,
            input=inputs,
        )

        logger.debug(f"Replicate AI Output for search query: {output}")

        # Extract search query from output
        search_query = output.strip()

        logger.debug(f"Generated YouTube search query: {search_query}")

        # Step 2: Use YouTube Data API to search for videos
        youtube_search_url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            'part': 'snippet',
            'q': search_query,
            'key': settings.YOUTUBE_API_KEY,  # Ensure YOUTUBE_API_KEY is set in Django settings
            'maxResults': 1,
            'type': 'video',
            'videoEmbeddable': 'true',
        }

        youtube_response = requests.get(youtube_search_url, params=params)
        youtube_data = youtube_response.json()

        if 'items' in youtube_data and len(youtube_data['items']) > 0:
            video_id = youtube_data['items'][0]['id']['videoId']
            logger.debug(f"Fetched YouTube video ID: {video_id} for exercise: {exercise_name}")
            return video_id
        else:
            logger.warning(f"No YouTube videos found for exercise: {exercise_name} with search query: {search_query}")
            return None

    except replicate.exceptions.ReplicateError as e:
        logger.error(f"Replicate API Error: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Replicate API Error: {e}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while calling YouTube API: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Network error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in get_youtube_video_id: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Unexpected error: {e}")

def generate_workout_plan(user):
    """
    Generate a personalized workout plan using the Replicate API and the specified model.

    Args:
        user: A User object containing user information.

    Returns:
        dict: A dictionary containing the workout plan.
    """
    # Extract user attributes
    age = user.age
    sex = user.sex
    weight = user.weight
    height = user.height
    fitness_level = user.fitness_level
    strength_goals = list(user.strength_goals.all().values_list('name', flat=True))
    equipment = list(user.equipment.all().values_list('name', flat=True))
    workout_days = user.workout_days
    workout_time = user.workout_time
    additional_goals = user.additional_goals

    # Log user data for debugging
    logger.info(f"Generating workout plan for user: {user.username}")
    logger.debug(f"Age: {age}, Sex: {sex}, Weight: {weight} kg, Height: {height} cm")
    logger.debug(f"Fitness Level: {fitness_level}")
    logger.debug(f"Strength Goals: {', '.join(strength_goals)}")
    logger.debug(f"Equipment: {', '.join(equipment) if equipment else 'None'}")
    logger.debug(f"Workout Days: {workout_days} days/week, Workout Time: {workout_time} minutes/session")
    logger.debug(f"Additional Goals: {additional_goals}")

    # Do NOT incorporate feedback when generating a new workout plan
    feedback_note = ""  # Empty since no feedback is involved

    # Create the prompt with all required criteria
    prompt = create_prompt(
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
        feedback_note=feedback_note
    )
    logger.debug(f"AI Prompt: {prompt}")

    try:
        # Initialize Replicate client with your API token
        replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
        if not replicate_api_token:
            logger.error("Replicate API token not found in environment variables.")
            return None

        client = replicate.Client(api_token=replicate_api_token)

        # Specify the model version
        model_version = "meta/meta-llama-3-70b-instruct"  # Replace with the actual model identifier

        # Set the input parameters for the model
        inputs = {
            'prompt': prompt,
            'temperature': 0.5,  # Lowered for more deterministic output
            'max_new_tokens': 3000,  # Adjust as needed based on response length requirements
        }

        # Run the model prediction
        output = client.run(
            model_version,
            input=inputs,
        )

        # Log the AI response
        logger.debug(f"Replicate AI Output: {output}")

        # Handle output being a list or a string
        if isinstance(output, list):
            logger.debug("AI output is a list. Joining into a single string.")
            output_str = ''.join(output)
        elif isinstance(output, str):
            output_str = output
        else:
            logger.error(f"Unexpected output type from AI: {type(output)}")
            raise ValueError(f"Unexpected output type: {type(output)}")

        # Log the joined output
        logger.debug(f"Joined AI Output: {output_str}")

        # Parse the AI response as JSON
        try:
            workout_plan = json.loads(output_str)
            logger.debug(f"Parsed Workout Plan JSON: {json.dumps(workout_plan, indent=2)}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON Decode Error: {e}")
            raise ValueError(f"Invalid JSON format: {e}")

        # Validate the JSON structure
        if validate_workout_plan(workout_plan):
            # Assign YouTube video IDs to each exercise
            for day in workout_plan.get('workoutDays', []):
                for exercise in day.get('exercises', []):
                    exercise_name = exercise.get('name')
                    if exercise_name and not exercise.get('youtube_video_id'):
                        video_id = get_youtube_video_id(exercise_name)
                        if video_id:
                            exercise['youtube_video_id'] = video_id
                        else:
                            exercise['youtube_video_id'] = None  # Explicitly set to None if not found

            # Save the workout plan to the database
            WorkoutPlan.objects.create(
                user=user,
                plan_data=workout_plan
            )
            logger.info(f"Workout plan successfully generated and saved for user: {user.username}")

            # Send the workout plan to a group or perform other actions
            send_workout_plan_to_group(user, workout_plan)

            return workout_plan
        else:
            raise ValueError("Transformed workout plan JSON does not adhere to the required schema.")

    except replicate.exceptions.ReplicateError as e:
        logger.error(f"Replicate API Error: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Replicate API Error: {e}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while calling Replicate API: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Network error: {e}")
    except ValueError as ve:
        logger.error(f"Data parsing error: {ve}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Data parsing error: {ve}")
    except Exception as e:
        logger.error(f"Unexpected error generating workout plan: {e}", exc_info=True)
        raise  # Re-raise the exception to be handled by the calling function

def process_feedback_with_ai(feedback_data, modify_specific_session=False):
    """
    Processes user feedback using the AI model to modify the workout plan.

    Args:
        feedback_data (dict): Data containing user feedback and current workout plan.
        modify_specific_session (bool): Whether to modify only a specific session.

    Returns:
        dict: Modified workout plan or session.
    """
    try:
        # Fetch the current workout plan
        current_plan = feedback_data['workout_plan']

        if modify_specific_session:
            # Extract the specific session from the workout plan
            session_name = feedback_data['session_name']
            current_session = None
            for day in current_plan.get('workoutDays', []):
                if day['day'] == session_name:
                    current_session = day
                    break
            if not current_session:
                logger.error(f"Session '{session_name}' not found in the current workout plan.")
                return None
            current_session_json = json.dumps(current_session, indent=2)

            # Build the prompt for modifying the specific session with proper escaping
            prompt = f"""
The user {feedback_data['user']['username']} has provided feedback for the session '{session_name}'.
They rated it as '{feedback_data['emoji_feedback']}' and commented: '{feedback_data['comments']}'.

Below is the current session:

```json
{current_session_json}
```
Please analyze the current session and make necessary adjustments based on the user's feedback.

**Important Instructions:**
    - Do not change the session day name.
    - Only modify the exercises, sets, reps, or instructions for the specified session '{session_name}'.
    - Do not include any other sessions in your response.
    - Provide the modified session in JSON format as per the schema:

```json
{{
    "day": "{session_name}",
    "duration": "60 minutes",
    "exercises": [
        {{
            "name": "Exercise Name",
            "setsReps": "Sets and Reps",
            "equipment": "Equipment",
            "instructions": "Instructions"
            "youtube_video_id": "VideoID"
        }},
        // ... more exercises ...
    ],
    "additionalTips": [
        // Optional additional tips
    ]
}}
```
**Instructions:**

    - Provide only the JSON response of the modified session without any additional explanations or text.
    - Ensure the JSON is properly formatted and adheres strictly to the provided schema.
    - Do not include any text before or after the JSON.
    - If you need to mention anything, include it within the JSON as 'additionalTips'.
"""
            # Log the constructed prompt for debugging
            logger.debug(f"Constructed AI Prompt:\n{prompt}")
     
            # Get the Replicate API token
            replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
            if not replicate_api_token:
                logger.error("Replicate API token not found in environment variables.")
                return None

            # Initialize Replicate client
            client = replicate.Client(api_token=replicate_api_token, timeout=300)

            # Define the model name (Update with the correct model name)
            model_name = "meta/meta-llama-3-70b-instruct"  # Replace with the actual model identifier

            # Define the inputs
            inputs = {
                "prompt": prompt,
                "temperature": 0.7,
                "max_new_tokens": 3000,  # Adjust as needed
                # Add other parameters if needed
            }

            # Run the model and collect the output
            output = client.run(
                model_name,
                input=inputs,
            )

            # Log the AI output
            logger.debug(f"AI Output String: {output}")

            # Convert output to string if it's a list
            if isinstance(output, list):
                output_str = ''.join(output)
            else:
                output_str = str(output)

            # Parse the JSON content
            try:
                modified_session = json.loads(output_str)
            except json.JSONDecodeError:
                # If that fails, try to extract the session object from within the output
                json_match = re.search(r'\{.*\}', output_str, re.DOTALL)
                if json_match:
                    json_content = json_match.group(0)
                    modified_session = json.loads(json_content)
                else:
                    logger.error("No JSON content found in AI output")
                    raise ValueError("No JSON content found in AI output")

        else:
            # When not modifying a specific session (e.g., generating a new workout plan)
            logger.info("No modification needed based on the current feedback.")
            return None

        # Validate the modified session
        if validate_session(modified_session):
            return modified_session
        else:
            raise ValueError("Modified session JSON does not adhere to the required schema.")
    
    except replicate.exceptions.ReplicateError as e:
        logger.error(f"Replicate API Error while processing feedback: {e}", exc_info=True)
        raise ReplicateServiceUnavailable("Replicate service is unavailable.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while processing feedback with AI: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Network error: {e}")
    except ValueError as ve:
        logger.error(f"Data parsing error while processing feedback: {ve}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Data parsing error: {ve}")
    except Exception as e:
        logger.error(f"Unexpected error processing feedback with AI: {e}", exc_info=True)
        raise


def send_workout_plan_to_group(user, workout_plan):
    """ Sends the workout plan to the user via Channels group.
    
    Args:
    user: A User object.
    workout_plan (dict): The workout plan data.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.error("Channel layer is not configured.")
            return

        group_name = f'workout_plan_{user.id}'

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'workout_plan_generated',
                'plan_data': workout_plan, 
            }
        )
        logger.info(f"Workout plan sent to group: {group_name}")
    except Exception as e:
        logger.error(f"Error sending workout plan to group: {e}", exc_info=True)
        raise
