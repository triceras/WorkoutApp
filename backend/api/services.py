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
                                # Aerobic-specific fields
                                "duration": {"type": ["integer", "null"]},
                                "calories_burned": {"type": ["integer", "null"]},
                                "average_heart_rate": {"type": ["integer", "null"]},
                                "max_heart_rate": {"type": ["integer", "null"]},
                                "intensity": {"type": ["string", "null"], "enum": ["Low", "Moderate", "High", None]},
                            },
                            "required": ["name", "setsReps", "equipment", "instructions", "videoId"],
                            "additionalProperties": False
                        },
                    },
                    "notes": {"type": "string"},
                },
                "required": ["day", "type"],
                "additionalProperties": False
            },
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["workoutDays"],
    "additionalProperties": False
}

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
    Extracts the first JSON object found in the text, handling code blocks.

    Args:
        text (str): The text containing JSON.

    Returns:
        str or None: The extracted JSON string, or None if not found.
    """
    try:
        # Remove any backticks and language identifiers
        text = re.sub(r'```(\w+)?\n', '', text).strip('`\n ')
        # Find the first opening brace
        start_index = text.find('{')
        if start_index == -1:
            return None
        # Initialize a counter for braces
        brace_count = 0
        for index in range(start_index, len(text)):
            char = text[index]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return text[start_index:index+1]
        return None  # No matching closing brace found
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
    equipment, workout_time, workout_days, feedback_note=None
):
    """
    Generates the prompt for the AI model to create a workout plan.

    Args:
        age (int): User's age.
        sex (str): User's sex.
        weight (float): User's weight in kg.
        height (float): User's height in cm.
        fitness_level (str): User's fitness level.
        strength_goals (list): List of user's strength goals.
        additional_goals (str): User's additional goals.
        equipment (list): List of available equipment.
        workout_time (int): Minutes available per workout session.
        workout_days (int): Number of workout days per week.
        feedback_note (str, optional): User's latest feedback.

    Returns:
        str: The formatted prompt for the AI model.
    """
    strength_goals_str = ', '.join(strength_goals) if isinstance(strength_goals, list) else strength_goals or 'None'
    available_equipment_str = ', '.join(equipment) if isinstance(equipment, list) else equipment or 'None'
    additional_goals_str = additional_goals or 'None'

    # Define the JSON schema example separately
    json_schema_example = '''
{
  "workoutDays": [
    {
      "day": "Day 1: Chest and Triceps",
      "type": "workout",
      "duration": "60 minutes",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "setsReps": "3 sets of 8-12 reps",
          "equipment": "Barbell, Bench",
          "instructions": "Lie on the bench with your feet firmly on the ground...",
          "videoId": "VIDEO_ID_HERE"
        }
        // ... additional exercises ...
      ]
    },
    {
      "day": "Day 2: Rest Day",
      "type": "rest",
      "notes": "Use this day to recover. Light stretching or walking is encouraged."
    }
    // ... additional days ...
  ],
  "additionalTips": [
    "Ensure proper form to prevent injuries.",
    "Stay hydrated throughout your workouts."
  ]
}
'''

    prompt = f"""
You are a professional fitness trainer specializing in creating personalized workout plans. Generate a comprehensive **weekly workout plan** for the user based on the following profile and feedback. The plan should strictly adhere to the provided JSON schema without any additional explanations or text.

**User Profile:**
- **Age:** {age}
- **Sex:** {sex}
- **Weight:** {weight} kg
- **Height:** {height} cm
- **Fitness Level:** {fitness_level}
- **Strength Goals:** {strength_goals_str}
- **Additional Goals:** {additional_goals_str}
- **Available Equipment:** {available_equipment_str}
- **Workout Availability:** {workout_time} minutes per session, {workout_days} days per week

**User Feedback:** {feedback_note or 'No feedback provided.'}

**Plan Requirements:**
1. **Exercise Selection:**
   - Ensure a balanced distribution of exercises targeting all major muscle groups (e.g., chest, back, legs, shoulders, arms, core).
   - Align exercise selection with the user's strength and additional goals.

2. **Time-Based Exercise Count:**
   - For **30 minutes** per session: Include **4 to 5 exercises**.
   - For **60 minutes** per session: Include **7 to 8 exercises**.
   - For other durations: Adjust the number of exercises proportionally.
   - **Maximum:** Do not exceed **10 exercises** per session.

3. **Sets and Reps Adjustment:**
   - Modify the number of sets and reps based on the user's fitness level:
     - **Beginner:** Higher reps (12-15) with moderate sets (2-3).
     - **Intermediate:** Moderate reps (8-12) with higher sets (3-4).
     - **Advanced:** Lower reps (6-8) with intensive sets (4-5).

4. **Intensity and Complexity:**
   - Adjust exercise intensity and complexity considering the user's age and sex.
   - Incorporate progressive overload principles for continuous improvement.

5. **Cardio Integration:**
   - Include cardio exercises appropriate to the available equipment.
   - If specific equipment isn't available, suggest alternative cardio methods (e.g., running in place, jumping jacks).

6. **Recovery and Rest Days:**
   - Allocate rest days based on workout days to ensure adequate recovery.
   - For rest days, set `"type": "rest"` and include relevant `"notes"`.
   - Suggest active recovery activities (e.g., stretching, light yoga) on rest days.

7. **Stretching and Flexibility:**
   - Include stretching routines at the end of each workout to enhance flexibility and reduce muscle soreness.

8. **Equipment Constraints:**
   - If certain equipment is unavailable, provide substitute exercises that use alternative equipment or body weight.

9. **Weekly Variation:**
   - Ensure each week's plan varies slightly to prevent monotony and promote balanced muscle development.

**JSON Schema:**
{json_schema_example}

**Final Instructions:**
1. **Provide only the JSON response without any additional explanations or text.**
2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**
3. **Do not include any text before or after the JSON.**
4. **Do not include comments, markdown code blocks, or triple backticks.**
5. **If you need to mention anything, include it within the JSON as 'additionalTips' or 'notes' in the relevant day.**
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
        "model": "google/gemini-flash-1.5",
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
        raise ReplicateServiceUnavailable(f"AI model HTTP error: {http_err}") from http_err
    except Exception as err:
        logger.error(f"Error during AI model invocation: {err}")
        raise ReplicateServiceUnavailable(f"AI model error: {err}") from err

    # Log the AI output for debugging
    logger.debug(f"AI Model Output:\n{output_str}")

    # Clean the output
    output_str = output_str.strip()

    if not output_str:
        logger.error("AI model returned an empty response.")
        raise ValueError("AI model returned an empty response.")

    # Parse the JSON content
    try:
        # Remove comments before parsing
        clean_output_str = remove_comments(output_str)
        workout_plan_data = json.loads(clean_output_str)
    except json.JSONDecodeError:
        # Try to extract the JSON from within the output
        json_content = extract_json_from_text(output_str)
        if json_content:
            try:
                clean_json_content = remove_comments(json_content)
                workout_plan_data = json.loads(clean_json_content)
            except json.JSONDecodeError as e2:
                logger.error(f"Failed to parse extracted JSON content: {str(e2)}")
                raise ValueError("Failed to parse JSON content") from e2
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

    # Save or Update the workout plan to the database
    try:
        with transaction.atomic():
            # Use update_or_create to handle existing WorkoutPlan
            plan, created = WorkoutPlan.objects.update_or_create(
                user=user,
                defaults={
                    'plan_data': workout_plan_data,
                    'created_at': timezone.now()
                }
            )
            if created:
                logger.info(f"WorkoutPlan created for user_id {user_id}")
            else:
                logger.info(f"WorkoutPlan updated for user_id {user_id}")
    except IntegrityError as e:
        logger.error(f"IntegrityError while saving WorkoutPlan: {e}")
        raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e
    except Exception as e:
        logger.error(f"Unexpected error while saving WorkoutPlan: {e}")
        raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e

    return plan

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

            prompt = f"""
The user {feedback_data['user']['username']} has provided feedback for the session '{feedback_data['session_name']}'.
They rated it as '{feedback_data['emoji_feedback']}' and commented: '{feedback_data['comments']}'.

Below is the current workout plan for '{feedback_data['session_name']}':
{json.dumps(current_session, indent=2)}

Please analyze the current session and make necessary adjustments based on the user's feedback.

**Instructions:**
1. **Maintain the session day name as '{session_name}'.**
2. **Only modify the exercises, sets, reps, or instructions for this session.**
3. **Do not include or modify other sessions.**
4. **Provide the modified session strictly in JSON format adhering to the provided schema.**

**JSON Schema:**
{{
    "day": "{feedback_data['session_name']}",
    "type": "workout",
    "duration": "Duration",
    "exercises": [
        {{
            "name": "Exercise Name",
            "setsReps": "Sets and Reps",
            "equipment": "Equipment",
            "instructions": "Instructions",
            "videoId": "VIDEO_ID_HERE",
            "duration": 30,
            "calories_burned": 300,
            "average_heart_rate": 150,
            "max_heart_rate": 180,
            "intensity": "High"
        }}
        // ... additional exercises ...
    ],
    "additionalTips": [
        "Tip 1",
        "Tip 2"
    ]
}}

**Final Instructions:**
- **Respond only with the JSON object matching the above schema.**
- **Do not include explanations, comments, or additional text.**
- **Ensure the JSON is valid and free from syntax errors.**
- **Avoid using markdown formatting or code blocks.**
- **Any additional information should be included within the JSON** under `additionalTips`.
"""

        else:
            # Modify the entire workout plan based on feedback
            prompt = f"""
The user {feedback_data['user']['username']} has provided the following feedback:
Rating: '{feedback_data['emoji_feedback']}'
Comments: '{feedback_data['comments']}'

Below is the current workout plan:
{json.dumps(current_plan, indent=2)}

Please analyze the entire workout plan and make necessary adjustments based on the user's feedback.

**Workout Plan Requirements:**
1. **Exercise Quantity:**
   - **30 minutes/session:** Include **4 to 5 exercises** per day.
   - **60 minutes/session:** Include **7 to 8 exercises** per day.
   - **Other durations:** Adjust the number of exercises proportionally.
   - **Maximum:** Do not exceed **10 exercises** per session.
2. **Sets and Reps:** Tailor based on fitness level and available time.
3. **Cardio Integration:** Incorporate cardio exercises using available or generic equipment.
4. **Intensity and Complexity:** Adjust according to user's fitness level, age, and sex.
5. **Weekly Variation:** Vary exercises weekly based on feedback and progression.
6. **Flexibility:** Add stretching exercises at the end of each session.
7. **Rest Days:**
   - If workout days are less than 7, designate remaining days as rest days.
   - For rest days, set `"type": "rest"` and include relevant `"notes"`.

**Instructions for Each Exercise:**
- Provide **clear, step-by-step instructions** for each exercise.
- **Include a `videoId` field** with the YouTube video ID demonstrating the exercise.
- **For aerobic exercises**, include the following additional fields:
  - `duration`: Duration of the exercise in minutes.
  - `calories_burned`: Estimated calories burned during the exercise.
  - `average_heart_rate`: Average heart rate during the exercise.
  - `max_heart_rate`: Maximum heart rate achieved during the exercise.
  - `intensity`: Intensity level of the exercise (`Low`, `Moderate`, `High`).

**JSON Schema:**
{{
  "workoutDays": [
    {{
      "day": "Day 1: Chest and Triceps",
      "type": "workout",
      "duration": "60 minutes",
      "exercises": [
        {{
          "name": "Barbell Bench Press",
          "setsReps": "3 sets of 8-12 reps",
          "equipment": "Barbell, Bench",
          "instructions": "Lie on the bench with your feet firmly on the ground...",
          "videoId": "VIDEO_ID_HERE"
        }},
        // ... additional exercises ...
      ]
    }},
    {{
      "day": "Day 2: Rest Day",
      "type": "rest",
      "notes": "Use this day to recover. Light stretching or walking is encouraged."
    }},
    // ... additional days ...
  ],
  "additionalTips": [
    "Ensure proper form to prevent injuries.",
    "Stay hydrated throughout your workouts."
  ]
}}

**Final Instructions:**
- **Respond only with the JSON object** matching the above schema.
- **Do not include any explanations, comments, or additional text.**
- **Ensure the JSON is valid and free from syntax errors.**
- **Avoid using markdown formatting or code blocks.**
- **Any additional information should be included within the JSON** under `additionalTips` or within the respective day's `notes`.
"""

        # Get OpenRouter AI API Key
        openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
        if not openrouter_api_key:
            logger.error("OpenRouter API Key not found in environment variables.")
            return None

        # Prepare the payload for OpenRouter AI
        payload = {
            "model": "google/gemini-flash-1.5",
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
                    raise ValueError("Failed to parse JSON content") from e2
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

        # Save or Update the workout plan to the database
        try:
            with transaction.atomic():
                # Use update_or_create to handle existing WorkoutPlan
                plan, created = WorkoutPlan.objects.update_or_create(
                    user=user,
                    defaults={
                        'plan_data': workout_plan_data,
                        'created_at': timezone.now()
                    }
                )
                if created:
                    logger.info(f"WorkoutPlan created for user_id {user_id}")
                else:
                    logger.info(f"WorkoutPlan updated for user_id {user_id}")
        except IntegrityError as e:
            logger.error(f"IntegrityError while saving WorkoutPlan: {e}")
            raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error while saving WorkoutPlan: {e}")
            raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e

    except Exception as e:
        logger.error(f"Error processing feedback with AI: {e}")
        return None    
        
    return plan
