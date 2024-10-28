# api/services.py

import os
import replicate
import json
import logging
import requests
from jsonschema import validate, ValidationError
from django.conf import settings
from .models import TrainingSession, WorkoutPlan
from .helpers import send_workout_plan_to_group, assign_video_ids_to_exercises, assign_video_ids_to_exercise_list
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
import re
from django.utils import timezone
import asyncio
import aiohttp
from aiohttp import TCPConnector
import ssl



logger = logging.getLogger(__name__)

# Define custom exceptions
class ReplicateServiceUnavailable(Exception):
    """Exception raised when the Replicate service is unavailable."""
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
                            },
                            "required": ["name", "setsReps", "equipment", "instructions", "videoId"],
                        },
                    },
                },
                "required": ["day", "duration", "exercises"],
            },
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["workoutDays"],
}


def validate_workout_plan(workout_plan):
    """
    Validates the entire workout plan against the JSON schema.

    Args:
        workout_plan (dict): The workout plan data to validate.

    Returns:
        bool: True if valid, False otherwise.
    """
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
                                    "videoId": {"type": ["string", "null"]},
                                },
                                # Remove 'videoId' from the required list
                                "required": ["name", "setsReps", "equipment", "instructions"],
                            },
                        },
                    },
                    "required": ["day", "duration", "exercises"],
                },
            },
            "additionalTips": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["workoutDays"],
    }
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
    """
    Validates a single workout session against the JSON schema.

    Args:
        session (dict): The workout session data to validate.

    Returns:
        bool: True if valid, False otherwise.
    """
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
                        "videoId": {"type": ["string", "null"]},
                    },
                    "required": ["name", "setsReps", "equipment", "instructions"],
                },
            },
            "additionalTips": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["day", "duration", "exercises"],
    }
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

# def assign_video_ids_to_session(session_data):
#     assign_video_ids_to_exercise_list(session_data.get('exercises', []))


# def assign_video_ids_to_exercise_list(exercise_list):
#     """
#     Assigns YouTube video IDs to a list of exercises.
#     """
#     async def fetch_all_video_ids(exercise_names):
#         ssl_context = ssl.create_default_context()
#         connector = TCPConnector(ssl=ssl_context)
#         async with aiohttp.ClientSession(connector=connector) as session:
#             tasks = [fetch_video_id(session, name) for name in exercise_names]
#             results = await asyncio.gather(*tasks)
#             return results

#     # Collect all unique exercise names
#     exercise_names = set()
#     for exercise in exercise_list:
#         exercise_name = exercise.get('name')
#         if exercise_name:
#             exercise_names.add(exercise_name)

#     # Run the asynchronous fetching of video IDs
#     loop = asyncio.new_event_loop()
#     asyncio.set_event_loop(loop)
#     results = loop.run_until_complete(fetch_all_video_ids(exercise_names))
#     loop.close()

#     # Create a mapping from exercise names to video IDs
#     exercise_video_id_map = {name: video_id for name, video_id in results}

#     # Assign video IDs to exercises
#     for exercise in exercise_list:
#         exercise_name = exercise.get('name')
#         if exercise_name:
#             exercise['videoId'] = exercise_video_id_map.get(exercise_name)
#             logger.info(f"Assigned videoId '{exercise['videoId']}' to exercise '{exercise_name}'.")
#         else:
#             exercise['videoId'] = None
#             logger.warning("Exercise name is missing.")


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

def extract_json_from_text(text):
    """
    Extracts the first JSON object found in the text.

    Args:
        text (str): The text containing JSON.

    Returns:
        str or None: The extracted JSON string, or None if not found.
    """
    try:
        # Find the first opening brace
        start_index = text.find('{')
        if start_index == -1:
            return None

        # Initialize a stack to keep track of braces
        stack = []
        for index in range(start_index, len(text)):
            char = text[index]
            if char == '{':
                stack.append('{')
            elif char == '}':
                if stack:
                    stack.pop()
                    if not stack:
                        # Found the matching closing brace
                        return text[start_index:index+1]
                else:
                    # Unbalanced closing brace
                    break
        return None  # No matching closing brace found
    except Exception as e:
        logger.error(f"Error extracting JSON: {e}")
        return None

def process_feedback_with_ai(feedback_data, modify_specific_session=False):
    """
    Processes user feedback using AI to modify the workout plan.

    Args:
        feedback_data (dict): Data containing user feedback and workout plan details.
        modify_specific_session (bool): Flag indicating whether to modify a specific session.

    Returns:
        dict or None: The modified session if successful, else None.
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
            
            prompt = f"""
            The user {feedback_data['user']['username']} has provided feedback for the session '{feedback_data['session_name']}'.
            They rated it as '{feedback_data['emoji_feedback']}' and commented: '{feedback_data['comments']}'.

            Below is the current workout plan for '{feedback_data['session_name']}':

            {json.dumps(current_session, indent=2)}

            Please analyze the current session and make necessary adjustments based on the user's feedback.

            Important Instructions:

            - Do not change the session day name.
            - Only modify the exercises, sets, reps, or instructions for the specified session '{session_name}'.
            - Do not include any other sessions in your response.
            - Provide the modified session in JSON format as per the schema:

            ```json
            {{
                "day": "{feedback_data['session_name']}",
                "duration": "Duration",
                "exercises": [
                    {{
                        "name": "Exercise Name",
                        "setsReps": "Sets and Reps",
                        "equipment": "Equipment",
                        "instructions": "Instructions"
                    }},
                    // ... more exercises ...
                ],
                "additionalTips": [
                    "Tip 1",
                    "Tip 2"
                ]
            }}
            ```
            **Instructions:**
            1. **Provide only the JSON response without any additional explanations or text.**
            2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**
            3. **Do not include any text before or after the JSON.**
            4. **If you need to mention anything, include it within the JSON as 'additionalTips'.**
            """
        else:
            # Modify the entire workout plan based on feedback
            prompt = f"""
            The user {feedback_data['user']['username']} has provided the following feedback:
            Rating: '{feedback_data['emoji_feedback']}'
            Comments: '{feedback_data['comments']}'

            Below is the current workout plan:

            ```json
            {json.dumps(current_plan, indent=2)}
            ```

            Please analyze the entire workout plan and make necessary adjustments based on the user's feedback.

            Important Instructions:

            1. Do not change or shuffle the session days.
            2. Modify exercises, sets, reps, instructions, or add/remove exercises as needed.
            3. Ensure the workout plan adheres to the original schema.

            Provide the modified workout plan in JSON format as per the schema:

            ```json
            {{
                "workoutDays": [
                    {{
                        "day": "Monday",
                        "duration": "60 minutes",
                        "exercises": [
                            {{
                                "name": "Exercise Name",
                                "setsReps": "Sets and Reps",
                                "equipment": "Equipment",
                                "instructions": "Instructions",
                            }},
                            // ... more exercises ...
                        ]
                    }},
                    // ... more days ...
                ],
                "additionalTips": [
                    "Stay hydrated.",
                    "Maintain proper form."
                ]
            }}
            ```

            **Instructions:**
            1. **Provide only the JSON response without any additional explanations or text.**
            2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**
            3. **Do not include any text before or after the JSON.**
            4. **If you need to mention anything, include it within the JSON as 'additionalTips'.**
            """

        # Get the Replicate API token
        # replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
        # if not replicate_api_token:
        #     logger.error("Replicate API token not found in environment variables.")
        #     return None
        
        # Get OpenRouter AI API Key
        openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_api_key:
            logger.error("OpenRouter API Key not found in environment variables.")
            return None

        #os.environ["REPLICATE_API_TOKEN"] = replicate_api_token  # Set the environment variable

        client = replicate.Client(api_token=openrouter_api_key, timeout=300)

        # Define the model name (Update with the correct model name)
        # model_name = "meta/meta-llama-3-70b-instruct"

        # # Define the inputs
        # inputs = {
        #     "prompt": prompt,
        #     "temperature": 0.7,
        #     "max_new_tokens": 1500,  # Adjust as needed
        #     # Add other parameters if needed
        # }
        # Prepare the payload for OpenRouter AI
        payload = {
            "model": "openai/gpt-4o-mini",
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
        
        # Run the model using OpenRouter AI
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                data=json.dumps(payload)
            )
            response.raise_for_status()  # Raise an error for bad status codes
            ai_response = response.json()
            # Extract the assistant's reply
            output_str = ai_response['choices'][0]['message']['content']
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred during AI model invocation: {http_err}")
            raise AIServiceUnavailable(f"AI model HTTP error: {http_err}")
        except Exception as err:
            logger.error(f"Error during AI model invocation: {err}")
            raise AIServiceUnavailable(f"AI model error: {err}")

        # Log the AI output for debugging
        logger.debug(f"AI Model Output:\n{output_str}")

        # Clean the output
        output_str = output_str.strip()

        if not output_str:
            logger.error("AI model returned an empty response.")
            raise ValueError("AI model returned an empty response.")

        # Parse the JSON content
        try:
            workout_plan_data = json.loads(output_str)
        except json.JSONDecodeError:
            # Try to extract the JSON from within the output
            json_content = extract_json_from_text(output_str)
            if json_content:
                try:
                    workout_plan_data = json.loads(json_content)
                except json.JSONDecodeError as e2:
                    logger.error(f"Failed to parse extracted JSON content: {str(e2)}")
                    raise ValueError("Failed to parse JSON content")
            else:
                logger.error("No JSON content found in AI output")
                logger.debug(f"AI Output Received:\n{output_str}")
                raise ValueError("No JSON content found in AI output")

        # Check if 'workoutDays' exists and has at least one item
        if modify_specific_session:
            # For specific session modification, expect a single session dict
            modified_session = workout_plan_data  # Assign the parsed data to modified_session
            if validate_session(modified_session):
                # Assign video IDs to the exercises
                assign_video_ids_to_exercise_list(modified_session.get('exercises', []))
                return modified_session
            else:
                raise ValueError("Modified session JSON does not adhere to the required schema.")
        else:
            # For full workout plan modification
            modified_plan = workout_plan_data  # Assign the parsed data to modified_plan
            if validate_workout_plan(modified_plan):
                # Assign video IDs to the exercises
                assign_video_ids_to_exercises(modified_plan)
                return modified_plan
            else:
                raise ValueError("Modified workout plan JSON does not adhere to the required schema.")
    
    except Exception as e:
        logger.exception("Error processing feedback with AI")
        raise ValueError("Error processing feedback with AI") from e




def generate_workout_plan(user_id, feedback_text=None):
    # Retrieve the user instance
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User does not exist for user_id {user_id}")
        raise ValueError(f"User does not exist for user_id {user_id}")
    
    # Collect user data
    # Adjust the following lines to match your User model fields
    age = user.age  # For example, if age is a field on User
    sex = user.sex
    weight = user.weight
    height = user.height
    fitness_level = user.fitness_level
    strength_goals = list(user.strength_goals.all().values_list('name', flat=True))
    equipment = list(user.equipment.all().values_list('name', flat=True))
    workout_days = user.workout_days
    workout_time = user.workout_time
    additional_goals = user.additional_goals
    
    # Incorporate user feedback for dynamic adjustments
    feedback_note = get_latest_feedback(user)

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
        feedback_note=feedback_note
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
        "model": "openai/gpt-4o-mini",
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
        "Content-Type": "application/json"
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
            data=json.dumps(payload)
        )
        response.raise_for_status()  # Raise an error for bad status codes
        ai_response = response.json()
        
        # Log AI model response
        logger.info(f"AI Model Response: {ai_response}")

        # Extract the assistant's reply
        output_str = ai_response['choices'][0]['message']['content']
    except requests.exceptions.HTTPError as http_err:
        logger.error(f"HTTP error occurred during AI model invocation: {http_err}")
        raise AIServiceUnavailable(f"AI model HTTP error: {http_err}")
    except Exception as err:
        logger.error(f"Error during AI model invocation: {err}")
        raise AIServiceUnavailable(f"AI model error: {err}")

    # Log the AI output for debugging
    logger.debug(f"AI Model Output:\n{output_str}")

    # Clean the output
    output_str = output_str.strip()

    if not output_str:
        logger.error("AI model returned an empty response.")
        raise ValueError("AI model returned an empty response.")

    # Parse the JSON content
    try:
        workout_plan_data = json.loads(output_str)
    except json.JSONDecodeError:
        # Try to extract the JSON from within the output
        json_content = extract_json_from_text(output_str)
        if json_content:
            try:
                workout_plan_data = json.loads(json_content)
            except json.JSONDecodeError as e2:
                logger.error(f"Failed to parse extracted JSON content: {str(e2)}")
                raise ValueError("Failed to parse JSON content")
        else:
            logger.error("No JSON content found in AI output")
            logger.debug(f"AI Output Received:\n{output_str}")
            raise ValueError("No JSON content found in AI output")

    # Validate the workout plan
    if not validate_workout_plan(workout_plan_data):
        logger.error("Generated workout plan does not conform to the schema.")
        raise ValueError("Generated workout plan does not conform to the schema.")

    # Assign YouTube video IDs to exercises
    assign_video_ids_to_exercises(workout_plan_data)

    # Save the workout plan to the database
    try:
        plan = WorkoutPlan.objects.create(
            user=user,
            plan_data=workout_plan_data,
            created_at=timezone.now()
        )
        # plan, created = WorkoutPlan.objects.update_or_create(
        #     user=user,
        #     defaults={
        #         'plan_data': workout_plan_data,
        #         'created_at': timezone.now()
        #     }
        # )
    except Exception as e:
        logger.error(f"Error saving WorkoutPlan: {e}")
        raise Exception(f"Error saving WorkoutPlan: {e}")

    return plan


def remove_comments(json_str):
    """
    Removes JavaScript-style comments from a JSON string.
    """
    import re
    json_str = re.sub(r'//.*?\n', '', json_str)
    return json_str


def generate_prompt(
    age, sex, weight, height, fitness_level, strength_goals, additional_goals,
    equipment, workout_time, workout_days, feedback_note=None
):
    # Build the prompt using the updated prompt template
    strength_goals_str = ', '.join(strength_goals) if isinstance(strength_goals, list) else strength_goals or 'None'
    available_equipment_str = ', '.join(equipment) if isinstance(equipment, list) else equipment or 'None'
    additional_goals_str = additional_goals or 'None'

    prompt = f"""
You are a fitness expert. Create a personalized weekly workout plan for the following user in strict JSON format. Ensure the JSON adheres exactly to the provided schema without any additional text or explanations.

**User Profile:**
- Age: {age}
- Sex: {sex}
- Weight: {weight} kg
- Height: {height} cm
- Fitness Level: {fitness_level}
- Strength Goals: {strength_goals_str}
- Additional Goals: {additional_goals_str}
- Available Equipment: {available_equipment_str}
- Workout Availability: {workout_time} minutes per session, {workout_days} days per week

**Feedback:** {feedback_note or 'No feedback available. Create a balanced workout plan.'}

**Requirements:**
1. **Adjust the number of exercises based on the user's available time:**
   - For **30 minutes** per session, include **4 to 5 exercises** per day.
   - For **60 minutes** per session, include **7 to 8 exercises** per day.
   - For other durations, adjust the number of exercises proportionally.
   - **Do not include more than 10 exercises per session.**
2. Adjust the **sets and reps** based on the user's fitness level and time availability.
3. Incorporate **cardio exercises** using the available equipment or generic cardio equipment if specific ones are not available.
4. Tailor the **intensity and complexity** of exercises based on the user's fitness level, age, and sex.
5. Vary the workout plan weekly based on user feedback and progression.
6. Add some stretches at the end of each session to improve flexibility and reduce muscle soreness.
6. **If the Feedback field is provided, change the workout plan accordingly.**

**Instructions for Each Exercise:**
- Provide **detailed, step-by-step instructions** on how to perform each exercise correctly and safely.
- **Include a `videoId` field with the YouTube video ID demonstrating the exercise.**

**JSON Schema:**
{{
  "workoutDays": [
    {{
      "day": "Day 1: Chest and Triceps",
      "duration": "60 minutes",
      "exercises": [
        {{
          "name": "Barbell Bench Press",
          "setsReps": "3 sets of 8-12 reps",
          "equipment": "Barbell, Bench",
          "instructions": "Lie on the bench with your feet planted firmly on the ground...",
          "videoId": "VIDEO_ID_HERE"
        }},
        // ... other exercises ...
      ]
    }},
    // ... other days ...
  ],
  "additionalTips": [
    "Ensure proper form to prevent injuries.",
    "Stay hydrated throughout your workouts."
  ]
}}

**Instructions:**
1. **Provide only the JSON response without any additional explanations or text.**
2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**
3. **Do not include any text before or after the JSON.**
4. **Do not include comments, markdown code blocks, or triple backticks.**
5. **If you need to mention anything, include it within the JSON as 'additionalTips'.**

"""
    return prompt

