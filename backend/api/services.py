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
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from collections import Counter
import jsonschema
import copy

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
                    "type": {
                        "type": "string",
                        "enum": ["workout", "active_recovery", "rest"]
                    },
                    "workout_type": {"type": ["string", "null"]},
                    "duration": {"type": ["string", "null"]},
                    "exercises": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "exercise_type": {
                                    "type": "string",
                                    "enum": [
                                        "strength",
                                        "cardio",
                                        "flexibility",
                                        "core",
                                        "balance",
                                        "power",
                                        "endurance",
                                        "plyometric",
                                        "agility",
                                        "mobility",
                                        "bodyweight",
                                        "calisthenics",
                                        "hiit",
                                        "compound",
                                        "isolation",
                                        "functional",
                                        "recovery",
                                        "stretching",
                                        "yoga",
                                        "pilates",
                                        "stretching",
                                        "full body"
                                    ]
                                },
                                "tracking_type": {
                                    "type": "string",
                                    "enum": ["time_based", "reps_based", "weight_based", "bodyweight"]
                                },
                                "weight": {"type": ["string", "null"]},
                                "sets": {"type": ["string", "integer", "null"]},
                                "reps": {"type": ["string", "null"]},
                                "duration": {"type": ["string", "null"]},
                                "rest_time": {"type": ["string", "integer", "null"]},
                                "intensity": {"type": ["string", "null"]},
                                "instructions": {
                                    "type": "object",
                                    "properties": {
                                        "setup": {"type": "string"},
                                        "execution": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "form_tips": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "common_mistakes": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "safety_tips": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "modifications": {
                                            "type": "object",
                                            "properties": {
                                                "beginner": {"type": "string"},
                                                "advanced": {"type": "string"}
                                            }
                                        },
                                        "sensation_guidance": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        },
                                        "hold_duration": {"type": "string"},
                                        "contraindications": {
                                            "type": "array",
                                            "items": {"type": "string"}
                                        }
                                    },
                                    "required": ["setup", "execution", "form_tips"]
                                },
                                "videoId": {"type": ["string", "null"]}
                            },
                            "required": ["name", "exercise_type", "tracking_type", "instructions"]
                        }
                    },
                    "notes": {"type": ["string", "null"]},
                    "suggested_activities": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["day", "type"]
            }
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["workoutDays"]
}

def is_json_complete(json_str):
    """
    Checks if the JSON string has matching opening and closing braces.
    """
    return json_str.count('{') == json_str.count('}')

def validate_workout_plan(workout_plan):
    """
    Validates the workout plan against the predefined JSON schema.
    """
    try:
        jsonschema.validate(instance=workout_plan, schema=WORKOUT_PLAN_SCHEMA)
        
        # Additional validation for flexibility exercises
        for day in workout_plan['workoutDays']:
            if 'exercises' in day:
                for exercise in day['exercises']:
                    if exercise['exercise_type'] == 'flexibility':
                        required_fields = ['sensation_guidance', 'hold_duration', 'contraindications']
                        missing_fields = [field for field in required_fields if field not in exercise['instructions']]
                        if missing_fields:
                            raise jsonschema.exceptions.ValidationError(
                                f"Flexibility exercise missing required fields: {', '.join(missing_fields)}"
                            )
                        
                        # Validate field types
                        if not isinstance(exercise['instructions']['sensation_guidance'], list):
                            raise jsonschema.exceptions.ValidationError(
                                "sensation_guidance must be an array"
                            )
                        if not isinstance(exercise['instructions']['hold_duration'], str):
                            raise jsonschema.exceptions.ValidationError(
                                "hold_duration must be a string"
                            )
                        if not isinstance(exercise['instructions']['contraindications'], list):
                            raise jsonschema.exceptions.ValidationError(
                                "contraindications must be an array"
                            )
        
        # Count the different types of days
        day_types = Counter(day['type'] for day in workout_plan['workoutDays'])
        total_days = len(workout_plan['workoutDays'])
        
        # Validate the distribution of day types based on total days
        if total_days == 7:  # Full week
            # Allow more flexible distribution:
            # - 4-6 workout days
            # - 0-2 active recovery days
            # - 0-2 rest days
            if not (4 <= day_types['workout'] <= 6 and
                   0 <= day_types.get('active_recovery', 0) + day_types.get('rest', 0) <= 3):
                logger.warning(f"Suboptimal day type distribution in 7-day plan: {dict(day_types)}")
        elif total_days == 6:  # 6-day plan
            # Allow more flexible distribution:
            # - 4-6 workout days
            # - 0-2 active recovery or rest days combined
            if not (4 <= day_types['workout'] <= 6 and
                   0 <= day_types.get('active_recovery', 0) + day_types.get('rest', 0) <= 2):
                logger.warning(f"Suboptimal day type distribution in 6-day plan: {dict(day_types)}")
        elif total_days == 5:  # 5-day plan
            # Allow more flexible distribution:
            # - 3-4 workout days
            # - 0-1 active recovery days
            # - 0-1 rest days
            if not (3 <= day_types['workout'] <= 4 and
                   0 <= day_types.get('active_recovery', 0) + day_types.get('rest', 0) <= 2):
                logger.warning(f"Suboptimal day type distribution in 5-day plan: {dict(day_types)}")
        elif total_days == 4:  # 4-day plan
            # Allow more flexible distribution:
            # - 2-3 workout days
            # - 0-1 active recovery days
            # - 0-1 rest days
            if not (2 <= day_types['workout'] <= 3 and
                   0 <= day_types.get('active_recovery', 0) + day_types.get('rest', 0) <= 2):
                logger.warning(f"Suboptimal day type distribution in 4-day plan: {dict(day_types)}")
        elif total_days == 3:  # 3-day plan
            # Allow more flexible distribution:
            # - 2-3 workout days
            # - 0-1 active recovery or rest days
            if not (2 <= day_types['workout'] <= 3 and
                   0 <= day_types.get('active_recovery', 0) + day_types.get('rest', 0) <= 1):
                logger.warning(f"Suboptimal day type distribution in 3-day plan: {dict(day_types)}")

        return True

    except jsonschema.exceptions.ValidationError as e:
        logger.error(f"Workout plan validation failed: {str(e)}")
        raise WorkoutPlanCreationError(f"Invalid workout plan format: {str(e)}")

def get_latest_feedback(user):
    """
    Retrieves the latest feedback from the user.
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
        text = text.replace('```', '')
        text = text.strip()
        start_index = text.find('{')
        if start_index == -1:
            return None
        end_index = text.rfind('}')
        if end_index == -1:
            return None
        json_str = text[start_index:end_index+1]
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
    """
    json_str = re.sub(r'//.*?\n', '\n', json_str)
    return json_str

def preprocess_workout_plan(workout_plan_data):
    """
    Preprocesses the workout plan data before validation.
    Normalizes field values and formats.
    """
    if isinstance(workout_plan_data, str):
        workout_plan_data = json.loads(workout_plan_data)

    # Create a deep copy to avoid modifying the original
    processed_data = copy.deepcopy(workout_plan_data)

    # Type normalization mapping
    type_mapping = {
        'active recovery': 'active_recovery',
        'active-recovery': 'active_recovery',
        'activerecovery': 'active_recovery',
    }

    # Process each workout day
    for day in processed_data.get('workoutDays', []):
        # Normalize the type field
        if 'type' in day:
            original_type = day['type']
            day_type = day['type'].lower().strip()
            day['type'] = type_mapping.get(day_type, day_type)
            if original_type != day['type']:
                logger.info(f"Normalized workout type from '{original_type}' to '{day['type']}'")

        # Process exercises if present
        if 'exercises' in day:
            for exercise in day['exercises']:
                # Ensure exercise has instructions
                if 'instructions' not in exercise:
                    exercise['instructions'] = {}

                # Convert any None values to appropriate defaults
                exercise['videoId'] = exercise.get('videoId') or None
                exercise['setsReps'] = exercise.get('setsReps') or ''
                exercise['equipment'] = exercise.get('equipment') or 'bodyweight'

    logger.info(f"Preprocessed workout plan data: {json.dumps(processed_data, indent=2)}")

    return processed_data

def generate_prompt(
    age, sex, weight, height, fitness_level, strength_goals, additional_goals,
    equipment, workout_time, workout_days, feedback_note=None, user_comments=None
):
    try:
        workout_days_int = int(workout_days)
    except (ValueError, TypeError):
        workout_days_int = 3

    basic_info = f"""
I need a {workout_days}-day workout plan for a {age}-year-old {sex}.
Height: {height}cm
Weight: {weight}kg
"""
    fitness_info = f"Fitness Level: {fitness_level}"
    goals_info = f"""
Primary Strength Goals: {strength_goals}
Additional Goals: {additional_goals}
"""
    equipment_info = f"Available Equipment: {equipment}"
    time_info = f"Available Time per Session: {workout_time} minutes"
    feedback_section = f"\nPrevious Feedback: {feedback_note}" if feedback_note else None
    if user_comments:
        feedback_section = f"{feedback_section}\nUser Comments: {user_comments}" if feedback_section else f"\nUser Comments: {user_comments}"

    sections = [
        "Create a detailed workout plan based on the following information:",
        basic_info,
        fitness_info,
        goals_info,
        equipment_info,
        time_info,
        feedback_section if feedback_section else None,
        f"""
Training Structure (7-day week with {workout_days} workout days):
The plan should include exactly 7 days total:
- {workout_days} workout days
- {7 - int(workout_days)} rest/active recovery days

Suggested workout splits for {workout_days} workout days:
Option 1 - Push/Pull/Legs:
- Push (Chest, Shoulders, Triceps)
- Pull (Back, Biceps)
- Legs
- Rest/Active Recovery
Repeat pattern as needed to fill {workout_days} workout days

Option 2 - Body Part Split:
- Chest & Triceps
- Back & Biceps
- Legs
- Shoulders & Abs
- Arms & Core
- Full Body
Adjust to fit {workout_days} workout days

Feel free to modify these splits to better match the user's goals and preferences.
Place rest/active recovery days strategically between intense workouts.

Key principles:
- Structure the 7-day week to include exactly {workout_days} workout days and {7 - int(workout_days)} rest/active recovery days
- Allow proper recovery between similar muscle groups
- Include a mix of workout types based on user's goals and fitness level
- Ensure progressive overload by gradually increasing intensity or volume
- Balance volume and intensity across the week
""",
        """
IMPORTANT REQUIREMENTS:
1. MUST create exactly 7 days total:
   - {workout_days} days must be either:
     * Workout day: Full exercise routine
     - Active recovery: Light exercises for recovery
   - {7 - int(workout_days)} days must be:
     * Rest day: Include suggestions for optional light activities

2. For workout days:
   - Include a mix of exercises targeting different muscle groups
   - Provide specific sets, reps, and rest periods
   - Include proper form instructions and safety tips

3. For active recovery days:
   - Include light exercises that promote recovery while maintaining movement
   - Focus on mobility, flexibility, or very light cardio
   - Include duration and intensity guidelines

4. For rest days:
   - Include suggestions for optional light activities (e.g., walking, stretching)
   - Emphasize that these activities are optional
   - Provide tips for recovery and relaxation

Create a detailed workout plan following this format:
{
    "workoutDays": [
        {
            "day": "Day 1",
            "type": "workout",
            "workout_type": "Push Day",
            "duration": "60 minutes",
            "exercises": [
                {
                    "name": "Exercise Name",
                    "exercise_type": "strength",
                    "tracking_type": "weight_based",
                    "weight": "weight in kg",
                    "sets": "number of sets",
                    "reps": "reps per set",
                    "rest_time": "rest time in seconds",
                    "instructions": {
                        "setup": "Setup instructions",
                        "execution": [
                            "Step-by-step execution instructions"
                        ],
                        "form_tips": [
                            "Form tips"
                        ]
                    }
                }
            ],
            "notes": "Important notes about the workout"
        },
        {
            "day": "Day 7",
            "type": "rest",
            "suggested_activities": [
                "Take a 20-30 minute walk",
                "Do some light stretching",
                "Practice deep breathing or meditation"
            ],
            "notes": "Focus on rest and recovery. The suggested activities are optional but can help maintain mobility and promote recovery."
        }
    ],
    "additionalTips": [
        "Additional tips and guidance for the overall workout plan"
    ]
}

Remember:
1. Generate EXACTLY 7 days total
2. Include {workout_days} workout/active recovery days
3. Include {7 - int(workout_days)} rest days with optional activities
4. Ensure exercises match the user's fitness level and available equipment
5. Include proper form guidance and safety tips for each exercise
"""
    ]

    return "\n".join(filter(None, sections))

def generate_workout_plan(user_id, feedback_text=None):
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"User does not exist for user_id {user_id}")
        raise ValueError(f"User does not exist for user_id {user_id}")

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

    feedback_note = get_latest_feedback(user) if feedback_text is None else feedback_text

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
        user_comments=None
    )

    logger.info(f"Prompt for AI model:\n{prompt}")

    openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
    if not openrouter_api_key:
        logger.error("OpenRouter API Key not found in environment variables.")
        raise ValueError("OpenRouter API Key not found")

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

    site_url = os.environ.get('YOUR_SITE_URL')
    app_name = os.environ.get('YOUR_APP_NAME')
    if site_url:
        headers["HTTP-Referer"] = site_url
    if app_name:
        headers["X-Title"] = app_name

    session = requests.Session()
    retries = Retry(total=3,
                    backoff_factor=0.5,
                    status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    
    response = session.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        data=json.dumps(payload),
        timeout=180,
    )
    response.raise_for_status()

    logger.info(f"AI Model Response: {response.json()}")

    output_str = response.json()['choices'][0]['message']['content']
    logger.debug(f"Raw AI Output:\n{output_str}")
    
    json_str = extract_json_from_text(output_str)
    if not json_str:
        if output_str.strip().startswith('{') and output_str.strip().endswith('}'):
            json_str = output_str.strip()
        else:
            logger.error("Failed to extract valid JSON from AI response")
            raise ValueError("Invalid response format from AI model")

    try:
        workout_plan_data = json.loads(json_str)
        logger.info("Successfully parsed workout plan data from JSON response")
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        try:
            json_str = ''.join(char for char in json_str if ord(char) < 128)
            workout_plan_data = json.loads(json_str)
            logger.info("Successfully parsed workout plan data after cleaning Unicode characters")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse workout plan data: {e}")

    if 'workoutDays' not in workout_plan_data:
        logger.error("No 'workoutDays' field in workout plan data")
        raise ValueError("Invalid workout plan format: missing 'workoutDays' field")

    workout_plan_data = preprocess_workout_plan(workout_plan_data)

    for idx, day in enumerate(workout_plan_data.get('workoutDays', []), start=1):
        if 'day' not in day:
            day['day'] = f"Day {idx}: {day.get('workout_type', 'Workout') if day.get('type') == 'workout' else day.get('type').replace('_', ' ').capitalize()}"
        else:
            if not day['day'].startswith(f"Day {idx}"):
                description = day['workout_type'] if day.get('type') == 'workout' else day['type'].replace('_', ' ').capitalize()
                day['day'] = f"Day {idx}: {description}"

        if 'exercises' in day:
            for exercise in day['exercises']:
                if 'videoId' not in exercise:
                    exercise['videoId'] = None
                    logger.debug(f"Added 'videoId': null for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
                if 'setsReps' not in exercise:
                    exercise['setsReps'] = '3 sets of 10-12 reps'
                    logger.debug(f"Added default 'setsReps' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
                if 'equipment' not in exercise:
                    exercise['equipment'] = 'bodyweight'
                    logger.debug(f"Added default 'equipment' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
                if 'instructions' in exercise:
                    instructions = exercise['instructions']
                    if 'form_tips' not in instructions:
                        instructions['form_tips'] = ["Maintain proper form", "Keep core engaged"]
                        logger.debug(f"Added default 'form_tips' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
                else:
                    # If instructions are missing entirely, add a default
                    exercise['instructions'] = {
                        "setup": f"Setup instructions for {exercise.get('name', 'the exercise')}",
                        "execution": [f"Perform {exercise.get('name', 'the exercise')} with control"],
                        "form_tips": ["Maintain proper form", "Keep core engaged"]
                    }
                    logger.debug(f"Added default 'instructions' with 'form_tips' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")

        if 'notes' not in day:
            day['notes'] = "Focus on proper form and technique."
            logger.debug(f"Added default 'notes' for Day {idx}.")

    logger.info(f"Processed workout plan data before validation: {json.dumps(workout_plan_data, indent=2)}")

    for day in workout_plan_data.get("workoutDays", []):
        if day.get("type") != "rest" and "exercises" in day:
            for exercise in day["exercises"]:
                if exercise.get("tracking_type") == "rep_based":
                    exercise["tracking_type"] = "reps_based"

    try:
        validate(instance=workout_plan_data, schema=WORKOUT_PLAN_SCHEMA)
    except ValidationError as e:
        logger.error(f"Workout plan validation error: {str(e)}")
        raise ValueError(f"Generated workout plan does not conform to the schema: {str(e)}")

    assign_video_ids_to_exercises(workout_plan_data)

    workout_days_list = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'workout']
    rest_days_list = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'rest']
    active_recovery_days = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'active_recovery']
    
    actual_workout_days = len(workout_days_list)
    actual_rest_days = len(rest_days_list)
    actual_active_recovery_days = len(active_recovery_days)
    total_days = len(workout_plan_data['workoutDays'])

    logger.info(f"Plan breakdown - Workout: {actual_workout_days}, Rest: {actual_rest_days}, Active Recovery: {actual_active_recovery_days}")
    
    if total_days != 7:
        logger.error(f"Expected 7 total days, but got {total_days}.")
        raise ValueError(f"Expected 7 total days, but got {total_days}.")

    expected_days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
    for i, (day, expected) in enumerate(zip(workout_plan_data['workoutDays'], expected_days)):
        if not day['day'].startswith(f"Day {i+1}"):
            logger.error(f"Day {i+1} should start with '{expected}', but got '{day['day']}'")
            raise ValueError(f"Invalid day order. Day {i+1} should start with '{expected}'")

    if workout_days == 7:
        # More flexible distribution for 7-day plans:
        # Allow 5 or 6 workout days, 0 or 1 active recovery, rest makes up the difference
        if not (5 <= actual_workout_days <= 6):
            raise ValueError("For a 7-day plan, must have between 5 and 6 workout days.")
        if not (0 <= actual_active_recovery_days <= 1):
            raise ValueError("For a 7-day plan, must have 0 or 1 active recovery day.")
        # The remainder is rest days; ensure the total sums to 7
        if (7 - (actual_workout_days + actual_active_recovery_days)) < 0:
            raise ValueError("Invalid day distribution for 7-day plan.")
            # No strict error if distribution sums correctly.

    elif workout_days == 6:
        # More flexible distribution for 6-day plans:
        # Allow 4-6 workout days
        if not (4 <= actual_workout_days <= 6):
            raise ValueError("For a 6-day plan, must have between 4 and 6 workout days.")
        # Allow 0-1 active recovery day
        if not (0 <= actual_active_recovery_days <= 1):
            raise ValueError("For a 6-day plan, must have between 0 and 1 active recovery day.")
        # The rest are rest days; no strict upper limit, just ensure total = 7
        if (7 - (actual_workout_days + actual_active_recovery_days)) < 0:
            raise ValueError("Invalid day distribution for 6-day plan.")
            # If distribution is valid, no error raised.
    else:
        if actual_workout_days != workout_days:
            logger.error(f"Expected {workout_days} workout days, got {actual_workout_days}.")
            raise ValueError("Invalid number of workout days")
        if actual_active_recovery_days + actual_rest_days != 7 - workout_days:
            logger.error(f"Expected {7 - workout_days} rest/recovery days, got {actual_active_recovery_days + actual_rest_days}.")
            raise ValueError("Invalid number of rest/recovery days")

    logger.info(f"Final plan breakdown - Total days: {total_days}")
    logger.info(f"Workout Days: {actual_workout_days}, Rest Days: {actual_rest_days}, Active Recovery Days: {actual_active_recovery_days}")

    try:
        with transaction.atomic():
            plan, created = WorkoutPlan.objects.update_or_create(
                user=user,
                defaults={
                    'plan_data': {
                        'workoutDays': workout_plan_data['workoutDays'],
                        'startDate': timezone.now().isoformat(),
                        'createdAt': timezone.now().isoformat(),
                        'userId': user.id
                    },
                    'created_at': timezone.now()
                }
            )
            if created:
                logger.info(f"WorkoutPlan created for user_id {user.id}")
            else:
                logger.info(f"WorkoutPlan updated for user_id {user.id}")
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
            old_file_path = user.profile_picture.path
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
        image = Image.open(io.BytesIO(file_content))
        image.verify()
        return True
    except Exception as e:
        logger.error(f"Invalid image file: {str(e)}")
        return False

def generate_profile_picture(user):
    """
    COMMENTED OUT TO AVOID API CALLS DURING TESTING
    This function was used to generate profile pictures using Replicate API

    Args:
        user: The User instance to generate a profile picture for

    Returns:
        str: URL of the default profile picture
    """
    # Return a default profile picture URL instead
    return "https://api.dicebear.com/7.x/avataaars/svg?seed=default"

    # Original implementation commented out:
    # try:
    #     logger.info(f"Starting profile picture generation for user {user.id}")
        
    #     if not settings.REPLICATE_API_TOKEN:
    #         error_msg = "REPLICATE_API_TOKEN is not set in environment variables. Please add it to your .env file."
    #         logger.error(error_msg)
    #         raise ReplicateServiceUnavailable(error_msg)
            
    #     client = Client(api_token=settings.REPLICATE_API_TOKEN)
    #     logger.info("Replicate client initialized successfully")

    #     if user.sex == "Male":
    #         prompt = ("A professional headshot of an Asian male athlete in workout clothes, "
    #                  "muscular build, short black hair, determined expression, "
    #                  "high quality, photorealistic, centered composition, looking at camera, "
    #                  "natural lighting, gym background, clean modern style")
    #         negative_prompt = ("female, woman, long hair, feminine features, "
    #                            "blurry, cartoon, anime, illustration, unrealistic, "
    #                            "distorted, deformed, low quality")
    #     else:
    #         prompt = ("A professional headshot of an Asian female athlete in workout clothes, "
    #                  "athletic build, tied back hair, confident expression, "
    #                  "high quality, photorealistic, centered composition, looking at camera, "
    #                  "natural lighting, gym background, clean modern style")
    #         negative_prompt = ("male, masculine features, facial hair, "
    #                            "blurry, cartoon, anime, illustration, unrealistic, "
    #                            "distorted, deformed, low quality")

    #     prediction = client.run(
    #         "black-forest-labs/flux-dev",
    #         input={
    #             "prompt": prompt,
    #             "negative_prompt": negative_prompt,
    #             "aspect_ratio": "1:1",
    #             "width": 512,
    #             "height": 512,
    #             "output_format": "png",
    #             "output_quality": 100,
    #             "safety_tolerance": 2,
    #             "prompt_upsampling": True,
    #             "seed": -1
    #         }
    #     )
    #     logger.info(f"Image generation completed, prediction: {prediction}")

    #     if not prediction or not isinstance(prediction, list) or not prediction[0]:
    #         logger.error(f"No valid output received from Replicate for user {user.id}. Prediction: {prediction}")
    #         return False

    #     image_url = prediction[0].url
    #     if not image_url:
    #         logger.error(f"No image URL found in prediction for user {user.id}")
    #         return False

    #     max_retries = 3
    #     timeout = 10
        
    #     for attempt in range(max_retries):
    #         try:
    #             response = requests.get(image_url, timeout=timeout)
    #             logger.info(f"Image download attempt {attempt + 1}, status code: {response.status_code}")
                
    #             if response.status_code == 200:
    #                 if not validate_image_file(response.content):
    #                     logger.error(f"Downloaded content is not a valid image for user {user.id}")
    #                     return False
                    
    #                 timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    #                 filename = f"profile_picture_{user.id}_{timestamp}.png"
    #                 logger.info(f"Saving image as: {filename}")
                    
    #                 delete_old_profile_picture(user)
                    
    #                 try:
    #                     user.profile_picture.save(
    #                         filename,
    #                         ContentFile(response.content),
    #                         save=True
    #                     )
                        
    #                     if not os.path.exists(user.profile_picture.path):
    #                         logger.error(f"Failed to verify saved profile picture for user {user.id}")
    #                         return False
                        
    #                     logger.info(f"Successfully generated and saved profile picture for user {user.id}")
    #                     return True
    #                 except Exception as e:
    #                     logger.error(f"Failed to save profile picture for user {user.id}: {str(e)}")
    #                     return False
                
    #             elif response.status_code == 404:
    #                 logger.error(f"Image URL not found for user {user.id}")
    #                 break
    #             else:
    #                 logger.warning(f"Failed download attempt {attempt + 1} with status code: {response.status_code}")
    #                 if attempt < max_retries - 1:
    #                     time.sleep(1)
    #         except requests.Timeout:
    #             logger.warning(f"Timeout on download attempt {attempt + 1}")
    #             if attempt < max_retries - 1:
    #                 time.sleep(1)
    #         except requests.RequestException as e:
    #             logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
    #             if attempt < max_retries - 1:
    #                 time.sleep(1)
        
    #     logger.error(f"All download attempts failed for user {user.id}")
    #     return False
            
    # except Exception as e:
    #     logger.error(f"Error generating profile picture for user {user.id}: {str(e)}", exc_info=True)
    #     return False

def generate_profile_picture_async(user):
    """
    Asynchronously generate a profile picture for a new user.

    Args:
        user: The User instance to generate a profile picture for

    Returns:
        bool: True if the task was successfully queued, False otherwise
    """
    from .tasks import generate_profile_picture_task
    
    try:
        task = generate_profile_picture_task.delay(user.id)
        logger.info(f"Profile picture generation task queued for user {user.id} with task_id {task.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to queue profile picture generation task for user {user.id}: {str(e)}")
        return False
