"""
This file's functionality has been moved to separate service files:
- workout_plan.py: Workout plan generation and management
- feedback.py: Feedback analysis and processing
- profile.py: Profile picture generation and management

The code below is kept for reference but has been commented out.
"""

# backend/api/services.py

# import os
# import json
# import logging
# import requests
# from jsonschema import validate, ValidationError
# from django.conf import settings
# from .models import TrainingSession, WorkoutPlan
# from .helpers import (
#     send_workout_plan_to_group,
#     assign_video_ids_to_exercises,
#     assign_video_ids_to_exercise_list,
#     get_video_id,
#     get_video_data_by_id
# )
# from channels.layers import get_channel_layer
# from django.contrib.auth import get_user_model
# from asgiref.sync import async_to_sync
# from django.utils import timezone
# from django.db import transaction, IntegrityError
# import re
# from replicate.client import Client
# from django.core.files.base import ContentFile
# import time
# from PIL import Image
# import io
# from requests.adapters import HTTPAdapter
# from urllib3.util.retry import Retry
# from collections import Counter
# import jsonschema
# import copy
# from django.core.cache import cache
# import replicate

# logger = logging.getLogger(__name__)

# # Define custom exceptions
# class ReplicateServiceUnavailable(Exception):
#     """Exception raised when the Replicate service is unavailable."""
#     pass

# class WorkoutPlanCreationError(Exception):
#     """Exception raised when creating or updating a WorkoutPlan fails."""
#     pass

# class ReplicateRateLimitExceeded(Exception):
#     """Exception raised when rate limit is exceeded for Replicate API."""
#     pass

# # Define the JSON schema for the entire workout plan
# WORKOUT_PLAN_SCHEMA = {
#     "type": "object",
#     "properties": {
#         "workoutDays": {
#             "type": "array",
#             "items": {
#                 "type": "object",
#                 "properties": {
#                     "day": {"type": "string"},
#                     "type": {
#                         "type": "string",
#                         "enum": ["workout", "active_recovery", "rest"]
#                     },
#                     "workout_type": {"type": ["string", "null"]},
#                     "duration": {"type": ["string", "integer", "null"]},
#                     "exercises": {
#                         "type": "array",
#                         "items": {
#                             "type": "object",
#                             "properties": {
#                                 "name": {"type": "string"},
#                                 "exercise_type": {
#                                     "type": "string",
#                                     "enum": [
#                                         "strength",
#                                         "cardio",
#                                         "flexibility",
#                                         "mobility",
#                                         "balance",
#                                         "power",
#                                         "endurance",
#                                         "plyometric",
#                                         "agility",
#                                         "mobility",
#                                         "bodyweight",
#                                         "calisthenics",
#                                         "hiit",
#                                         "compound",
#                                         "isolation",
#                                         "functional",
#                                         "recovery",
#                                         "stretching",
#                                         "yoga",
#                                         "pilates",
#                                         "stretching",
#                                         "full body"
#                                     ]
#                                 },
#                                 "tracking_type": {
#                                     "type": "string",
#                                     "enum": ["time_based", "reps_based", "weight_based", "bodyweight"]
#                                 },
#                                 "weight": {"type": ["string", "null"]},
#                                 "sets": {"type": ["string", "integer", "null"]},
#                                 "reps": {"type": ["string", "integer", "null"]},
#                                 "duration": {"type": ["string", "integer", "null"]},
#                                 "rest_time": {"type": ["string", "integer", "null"]},
#                                 "intensity": {"type": ["string", "null"]},
#                                 "instructions": {
#                                     "type": "object",
#                                     "properties": {
#                                         "setup": {"type": "string"},
#                                         "execution": {
#                                             "type": "array",
#                                             "items": {"type": "string"}
#                                         },
#                                         "form_tips": {
#                                             "type": "array",
#                                             "items": {"type": "string"}
#                                         },
#                                         "common_mistakes": {
#                                             "type": "array",
#                                             "items": {"type": "string"}
#                                         },
#                                         "safety_tips": {
#                                             "type": "array",
#                                             "items": {"type": "string"}
#                                         },
#                                         "modifications": {
#                                             "type": "object",
#                                             "properties": {
#                                                 "beginner": {"type": "string"},
#                                                 "advanced": {"type": "string"}
#                                             }
#                                         },
#                                         "sensation_guidance": {
#                                             "type": "array",
#                                             "items": {"type": "string"}
#                                         },
#                                         "hold_duration": {"type": "string"},
#                                         "contraindications": {
#                                             "type": "array",
#                                             "items": {"type": "string"}
#                                         }
#                                     },
#                                     "required": ["setup", "execution", "form_tips"]
#                                 },
#                                 "videoId": {"type": ["string", "null"]}
#                             },
#                             "required": ["name", "exercise_type", "tracking_type", "instructions"]
#                         }
#                     },
#                     "notes": {"type": ["string", "null"]},
#                     "suggested_activities": {
#                         "type": "array",
#                         "items": {"type": "string"}
#                     }
#                 },
#                 "required": ["day", "type"]
#             }
#         },
#         "additionalTips": {
#             "type": "array",
#             "items": {"type": "string"}
#         }
#     },
#     "required": ["workoutDays"]
# }

# def is_json_complete(json_str):
#     """
#     Checks if the JSON string has matching opening and closing braces.
#     """
#     return json_str.count('{') == json_str.count('}')

# def validate_workout_plan(workout_plan):
#     """
#     Validates the workout plan against the predefined JSON schema.
#     """
#     try:
#         jsonschema.validate(instance=workout_plan, schema=WORKOUT_PLAN_SCHEMA)
        
#         # Additional validation for flexibility exercises
#         for day in workout_plan['workoutDays']:
#             if 'exercises' in day:
#                 for exercise in day['exercises']:
#                     if exercise['exercise_type'] == 'flexibility':
#                         required_fields = ['sensation_guidance', 'hold_duration', 'contraindications']
#                         missing_fields = [field for field in required_fields if field not in exercise['instructions']]
#                         if missing_fields:
#                             raise jsonschema.exceptions.ValidationError(
#                                 f"Flexibility exercise missing required fields: {', '.join(missing_fields)}"
#                             )
        
#         # Count workout days
#         day_types = Counter(day['type'] for day in workout_plan['workoutDays'])
#         total_days = len(workout_plan['workoutDays'])
#         workout_days = day_types['workout']
        
#         # Get expected workout days from user preferences
#         user = workout_plan.get('user')
#         expected_workout_days = getattr(user, 'workout_days', 5)  # Default to 5 if not specified
        
#         # Strict validation of workout days
#         if workout_days != expected_workout_days:
#             raise ValidationError(f"Expected {expected_workout_days} workout days, got {workout_days}. "
#                                f"Day distribution: {dict(day_types)}")
        
#         # Validate the distribution of other days
#         active_recovery_days = day_types.get('active_recovery', 0)
#         rest_days = day_types.get('rest', 0)
        
#         # Ensure we have a good balance of recovery days
#         if active_recovery_days + rest_days < 1:
#             raise ValidationError("Plan must include at least one recovery or rest day")
        
#         if active_recovery_days + rest_days > 3:
#             raise ValidationError("Too many recovery/rest days. Maximum allowed is 3")
        
#         return True

#     except jsonschema.exceptions.ValidationError as e:
#         logger.error(f"Workout plan validation failed: {str(e)}")
#         raise WorkoutPlanCreationError(f"Invalid workout plan format: {str(e)}")
#     except ValidationError as e:
#         logger.error(f"Workout plan validation failed: {str(e)}")
#         raise WorkoutPlanCreationError(str(e))

# def get_latest_feedback(user):
#     """
#     Retrieves the latest feedback from the user.
#     """
#     try:
#         training_session = TrainingSession.objects.filter(user=user).latest('date')
#         return training_session.comments
#     except TrainingSession.DoesNotExist:
#         return None

# def extract_json_from_text(text):
#     """
#     Extracts the JSON content from text, handling code blocks and triple backticks.
#     """
#     try:
#         # Remove any triple backticks and language identifiers
#         text = re.sub(r'^```[a-zA-Z]*\n?', '', text, flags=re.MULTILINE)
#         text = text.replace('```', '')
#         text = text.strip()
#         start_index = text.find('{')
#         if start_index == -1:
#             return None
#         end_index = text.rfind('}')
#         if end_index == -1:
#             return None
#         json_str = text[start_index:end_index+1]
#         if json_str.count('{') != json_str.count('}'):
#             logger.error("Braces are not balanced in JSON string.")
#             return None
#         return json_str
#     except Exception as e:
#         logger.error(f"Error extracting JSON: {e}")
#         return None

# def remove_comments(json_str):
#     """
#     Removes JavaScript-style comments from a JSON string.
#     """
#     json_str = re.sub(r'//.*?\n', '\n', json_str)
#     return json_str

# def preprocess_workout_plan(workout_plan_data):
#     """
#     Preprocesses the workout plan data before validation.
#     Normalizes field values and formats.
#     """
#     logger.info("Preprocessing workout plan data...")

#     # Add default fields for each exercise
#     for day in workout_plan_data.get('workoutDays', []):
#         if 'exercises' in day:
#             for exercise in day['exercises']:
#                 # Convert duration to string if it's a number
#                 if 'duration' in exercise:
#                     exercise['duration'] = str(exercise['duration'])

#                 # Add required exercise_type if missing
#                 if 'exercise_type' not in exercise:
#                     # Map exercise type based on name and characteristics
#                     if any(term in exercise['name'].lower() for term in ['squat', 'deadlift', 'press', 'row']):
#                         exercise['exercise_type'] = 'strength'
#                     elif 'cardio' in exercise['name'].lower():  # Simplified cardio detection
#                         exercise['exercise_type'] = 'cardio'
#                     elif any(term in exercise['name'].lower() for term in ['plank', 'push-up', 'pull-up']):
#                         exercise['exercise_type'] = 'bodyweight'
#                     elif any(term in exercise['name'].lower() for term in ['stretch', 'yoga', 'mobility']):
#                         exercise['exercise_type'] = 'flexibility'
#                     else:
#                         exercise['exercise_type'] = 'strength'  # Default to strength

#                 # Add required tracking_type if missing
#                 if 'tracking_type' not in exercise:
#                     if exercise['exercise_type'] == 'cardio':
#                         exercise['tracking_type'] = 'time_based'
#                     elif exercise['exercise_type'] == 'bodyweight':
#                         exercise['tracking_type'] = 'bodyweight'
#                     else:
#                         exercise['tracking_type'] = 'reps_based'

#                 # Ensure instructions have all required fields
#                 if 'instructions' not in exercise:
#                     exercise['instructions'] = {}
                
#                 if 'setup' not in exercise['instructions']:
#                     exercise['instructions']['setup'] = f"Get into position for {exercise['name']}"
                
#                 if 'execution' not in exercise['instructions']:
#                     exercise['instructions']['execution'] = [
#                         f"Perform {exercise['name']} with proper form",
#                         "Maintain control throughout the movement"
#                     ]
                
#                 if 'form_tips' not in exercise['instructions']:
#                     exercise['instructions']['form_tips'] = [
#                         "Maintain proper form",
#                         "Keep core engaged"
#                     ]

#                 # Add other optional fields with defaults if missing
#                 if 'videoId' not in exercise:
#                     exercise['videoId'] = None
#                 if 'setsReps' not in exercise:
#                     exercise['setsReps'] = ''
#                 if 'equipment' not in exercise:
#                     exercise['equipment'] = 'bodyweight'

#         # Add default notes if missing
#         if 'notes' not in day:
#             day['notes'] = "Focus on proper form and technique."

#     logger.info(f"Preprocessed workout plan data: {json.dumps(workout_plan_data, indent=2)}")
#     return workout_plan_data

# def generate_prompt(age, sex, weight, height, fitness_level, strength_goals,
#                    additional_goals, equipment, workout_time, workout_days,
#                    feedback_note=None, user_comments=None):
#     """
#     Generate a prompt for the AI model to create a workout plan.
#     """
#     sections = [
#         # Base prompt with clear workout day requirements
#         f"""Create a workout plan with EXACTLY {workout_days} workout days. The plan must include:
# - Exactly {workout_days} days marked as 'workout'
# - If workout days are 6 or 7, include up to 3 recovery days (combination of 'active_recovery' and 'rest')
# - Total days should add up to 7 for a complete week
# - Each workout day should have a name in the format 'Day X: Workout Type'. For example, 'Day 1: Upper Body Strength'.
# - Every exercise in a workout day MUST have an assigned 'exercise_type' from the following list:
#   'strength', 'cardio', 'flexibility', 'mobility', 'balance', 'power', 'endurance', 'plyometric', 'agility',
#   'mobility', 'bodyweight', 'calisthenics', 'hiit', 'compound', 'isolation', 'functional', 'recovery',
#   'stretching', 'yoga', 'pilates', 'stretching', 'full body'
# - For any cardio or time-based exercise, ALWAYS specify the duration in seconds or minutes. For example, "60 seconds" or "5 minutes".
# - Ensure that the equipment used in each exercise is appropriate. For example, if the exercise is 'Assault Bike Cardio', the equipment needed should be 'Assault Bike', not 'bodyweight'.

# User Profile:
# - Age: {age}
# - Sex: {sex}
# - Weight: {weight}
# - Height: {height}
# - Fitness Level: {fitness_level}
# - Available Equipment: {', '.join(equipment)}
# - Time per workout: {workout_time} minutes""",

#         # Strength goals section
#         f"Strength Goals:\n" + "\n".join([f"- {goal}" for goal in strength_goals]) if strength_goals else "",

#         # Additional goals section
#         f"Additional Goals:\n{additional_goals}" if additional_goals else "",

#         # Feedback section
#         f"Recent Feedback:\n{feedback_note}" if feedback_note else "",

#         # User comments section
#         f"User Comments:\n{user_comments}" if user_comments else "",

#         # Format requirements with emphasis on workout days
#         """
# Format Requirements:
# - Return a valid JSON object with 'workoutDays' array
# - Each day must have 'type' as one of: 'workout', 'active_recovery', or 'rest'
# - CRITICAL: Ensure EXACT number of workout days as specified
# - Include proper form guidance and safety tips
# - Return ONLY the JSON object, nothing else
# """
#     ]

#     # Filter out any None entries
#     return "\n".join([s for s in sections if s])

# def generate_workout_plan(user_id, feedback_text=None):
#     User = get_user_model()
#     try:
#         user = User.objects.get(id=user_id)
#     except User.DoesNotExist:
#         logger.error(f"User does not exist for user_id {user_id}")
#         raise ValueError(f"User does not exist for user_id {user_id}")

#     age = getattr(user, 'age', None)
#     sex = getattr(user, 'sex', None)
#     weight = getattr(user, 'weight', None)
#     height = getattr(user, 'height', None)
#     fitness_level = getattr(user, 'fitness_level', None)
#     strength_goals = list(user.strength_goals.all().values_list('name', flat=True)) if hasattr(user, 'strength_goals') else []
#     equipment = list(user.equipment.all().values_list('name', flat=True)) if hasattr(user, 'equipment') else []
#     workout_days = getattr(user, 'workout_days', 0)
#     workout_time = getattr(user, 'workout_time', 0)
#     additional_goals = getattr(user, 'additional_goals', None)

#     feedback_note = get_latest_feedback(user) if feedback_text is None else feedback_text

#     prompt = generate_prompt(
#         age=age,
#         sex=sex,
#         weight=weight,
#         height=height,
#         fitness_level=fitness_level,
#         strength_goals=strength_goals,
#         equipment=equipment,
#         workout_days=workout_days,
#         workout_time=workout_time,
#         additional_goals=additional_goals,
#         feedback_note=feedback_note,
#         user_comments=None
#     )

#     logger.info(f"Prompt for AI model:\n{prompt}")

#     openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
#     if not openrouter_api_key:
#         logger.error("OpenRouter API Key not found in environment variables.")
#         raise ValueError("OpenRouter API Key not found")

#     payload = {
#         "model": "meta-llama/llama-3.3-70b-instruct",
#         "messages": [
#             {
#                 "role": "user",
#                 "content": prompt
#             }
#         ],
#         "temperature": 0.5,
#     }

#     headers = {
#         "Authorization": f"Bearer {openrouter_api_key}",
#         "Content-Type": "application/json",
#     }

#     site_url = os.environ.get('YOUR_SITE_URL')
#     app_name = os.environ.get('YOUR_APP_NAME')
#     if site_url:
#         headers["HTTP-Referer"] = site_url
#     if app_name:
#         headers["X-Title"] = app_name

#     session = requests.Session()
#     retries = Retry(total=3,
#                     backoff_factor=0.5,
#                     status_forcelist=[500, 502, 503, 504])
#     session.mount('https://', HTTPAdapter(max_retries=retries))
    
#     response = session.post(
#         "https://openrouter.ai/api/v1/chat/completions",
#         headers=headers,
#         data=json.dumps(payload),
#         timeout=180,
#     )
#     response.raise_for_status()

#     logger.info(f"AI Model Response: {response.json()}")

#     output_str = response.json()['choices'][0]['message']['content']
#     logger.debug(f"Raw AI Output:\n{output_str}")
    
#     json_str = extract_json_from_text(output_str)
#     if not json_str:
#         if output_str.strip().startswith('{') and output_str.strip().endswith('}'):
#             json_str = output_str.strip()
#         else:
#             logger.error("Failed to extract valid JSON from AI response")
#             raise ValueError("Invalid response format from AI model")

#     try:
#         workout_plan_data = json.loads(json_str)
#         logger.info("Successfully parsed workout plan data from JSON response")
#     except json.JSONDecodeError as e:
#         logger.error(f"JSON parsing error: {e}")
#         try:
#             json_str = ''.join(char for char in json_str if ord(char) < 128)
#             workout_plan_data = json.loads(json_str)
#             logger.info("Successfully parsed workout plan data after cleaning Unicode characters")
#         except json.JSONDecodeError as e:
#             raise ValueError(f"Failed to parse workout plan data: {e}")

#     if 'workoutDays' not in workout_plan_data:
#         logger.error("No 'workoutDays' field in workout plan data")
#         raise ValueError("Invalid workout plan format: missing 'workoutDays' field")

#     workout_plan_data = preprocess_workout_plan(workout_plan_data)

#     for idx, day in enumerate(workout_plan_data.get('workoutDays', []), start=1):
#         if 'day' not in day:
#             day['day'] = f"Day {idx}: {day.get('type', 'workout').replace('_', ' ').capitalize()}"
#         else:
#             if not day['day'].startswith(f"Day {idx}"):
#                 description = day.get('type', 'workout').replace('_', ' ').capitalize()
#                 day['day'] = f"Day {idx}: {description}"

#         if 'exercises' in day:
#             for exercise in day['exercises']:
#                 if 'videoId' not in exercise:
#                     exercise['videoId'] = None
#                     logger.debug(f"Added 'videoId': null for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
#                 if 'setsReps' not in exercise:
#                     exercise['setsReps'] = '3 sets of 10-12 reps'
#                     logger.debug(f"Added default 'setsReps' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
#                 if 'equipment' not in exercise:
#                     exercise['equipment'] = 'bodyweight'
#                     logger.debug(f"Added default 'equipment' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
#                 if 'instructions' in exercise:
#                     instructions = exercise['instructions']
#                     if 'form_tips' not in instructions:
#                         instructions['form_tips'] = ["Maintain proper form", "Keep core engaged"]
#                         logger.debug(f"Added default 'form_tips' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")
#                 else:
#                     # If instructions are missing entirely, add a default
#                     exercise['instructions'] = {
#                         "setup": f"Setup instructions for {exercise.get('name', 'the exercise')}",
#                         "execution": [f"Perform {exercise.get('name', 'the exercise')} with control"],
#                         "form_tips": ["Maintain proper form", "Keep core engaged"]
#                     }
#                     logger.debug(f"Added default 'instructions' with 'form_tips' for exercise '{exercise.get('name', 'Unnamed Exercise')}' in Day {idx}.")

#         if 'notes' not in day:
#             day['notes'] = "Focus on proper form and technique."
#             logger.debug(f"Added default 'notes' for Day {idx}.")

#     logger.info(f"Processed workout plan data before validation: {json.dumps(workout_plan_data, indent=2)}")

#     for day in workout_plan_data.get("workoutDays", []):
#         if day.get("type") != "rest" and "exercises" in day:
#             for exercise in day["exercises"]:
#                 if exercise.get("tracking_type") == "rep_based":
#                     exercise["tracking_type"] = "reps_based"

#     try:
#         validate(instance=workout_plan_data, schema=WORKOUT_PLAN_SCHEMA)
#     except ValidationError as e:
#         logger.error(f"Workout plan validation error: {str(e)}")
#         raise ValueError(f"Generated workout plan does not conform to the schema: {str(e)}")

#     for day in workout_plan_data['workoutDays']:
#         if day.get('exercises'):
#             for exercise in day['exercises']:
#                 # Standardize exercise name and get video ID
#                 exercise_name = exercise['name'].lower().strip()
#                 standard_name, video_id = get_video_id(exercise_name)
#                 if video_id:
#                     exercise['videoId'] = video_id
#                     # Get video data to cache thumbnail
#                     video_data = get_video_data_by_id(video_id)
#                     if video_data:
#                         try:
#                             YouTubeVideo.objects.get_or_create(
#                                 video_id=video_id,
#                                 defaults={
#                                     'exercise_name': exercise_name,
#                                     'title': video_data.get('title', ''),
#                                     'thumbnail_url': video_data.get('thumbnail_url', ''),
#                                     'video_url': f'https://www.youtube.com/watch?v={video_id}'
#                                 }
#                             )
#                         except Exception as e:
#                             logger.error(f"Error caching video data: {str(e)}")

#     workout_days_list = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'workout']
#     rest_days_list = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'rest']
#     active_recovery_days = [day for day in workout_plan_data['workoutDays'] if day.get('type') == 'active_recovery']
    
#     actual_workout_days = len(workout_days_list)
#     actual_rest_days = len(rest_days_list)
#     actual_active_recovery_days = len(active_recovery_days)
#     total_days = len(workout_plan_data['workoutDays'])

#     logger.info(f"Plan breakdown - Workout: {actual_workout_days}, Rest: {actual_rest_days}, Active Recovery: {actual_active_recovery_days}")
    
#     if total_days != 7:
#         logger.error(f"Expected 7 total days, but got {total_days}.")
#         raise ValueError(f"Expected 7 total days, but got {total_days}.")

#     expected_days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
#     for i, (day, expected) in enumerate(zip(workout_plan_data['workoutDays'], expected_days)):
#         if not day['day'].startswith(f"Day {i+1}"):
#             logger.error(f"Day {i+1} should start with '{expected}', but got '{day['day']}'")
#             raise ValueError(f"Invalid day order. Day {i+1} should start with '{expected}'")

#     if workout_days == 7:
#         # More flexible distribution for 7-day plans:
#         # Allow 5 or 6 workout days, 0 or 1 active recovery, rest makes up the difference
#         if not (5 <= actual_workout_days <= 6):
#             raise ValueError("For a 7-day plan, must have between 5 and 6 workout days.")
#         if not (0 <= actual_active_recovery_days <= 1):
#             raise ValueError("For a 7-day plan, must have 0 or 1 active recovery day.")
#         # The remainder is rest days; ensure the total sums to 7
#         if (7 - (actual_workout_days + actual_active_recovery_days)) < 0:
#             raise ValueError("Invalid day distribution for 7-day plan.")
#             # No strict error if distribution sums correctly.

#     elif workout_days == 6:
#         # More flexible distribution for 6-day plans:
#         # Allow 4-6 workout days
#         if not (4 <= actual_workout_days <= 6):
#             raise ValueError("For a 6-day plan, must have between 4 and 6 workout days.")
#         # Allow 0-1 active recovery day
#         if not (0 <= actual_active_recovery_days <= 1):
#             raise ValueError("For a 6-day plan, must have between 0 and 1 active recovery day.")
#         # The rest are rest days; no strict upper limit, just ensure total = 7
#         if (7 - (actual_workout_days + actual_active_recovery_days)) < 0:
#             raise ValueError("Invalid day distribution for 6-day plan.")
#             # If distribution is valid, no error raised.
#     else:
#         # For 5 or fewer workout days, all workout days should be actual workouts
#         if workout_days <= 5:
#             if actual_workout_days != workout_days:
#                 logger.error(f"Expected {workout_days} workout days, got {actual_workout_days}.")
#                 raise ValueError("Invalid number of workout days")
#             # For 5 or fewer workout days, the remaining days should be rest days
#             expected_rest_days = 7 - workout_days
#             if actual_active_recovery_days + actual_rest_days != expected_rest_days:
#                 logger.error(f"Expected {expected_rest_days} rest/recovery days, got {actual_active_recovery_days + actual_rest_days}.")
#                 raise ValueError("Invalid number of rest/recovery days")

#     logger.info(f"Final plan breakdown - Total days: {total_days}")
#     logger.info(f"Workout Days: {actual_workout_days}, Rest Days: {actual_rest_days}, Active Recovery Days: {actual_active_recovery_days}")

#     try:
#         with transaction.atomic():
#             plan, created = WorkoutPlan.objects.update_or_create(
#                 user=user,
#                 defaults={
#                     'plan_data': {
#                         'workoutDays': workout_plan_data['workoutDays'],
#                         'startDate': timezone.now().isoformat(),
#                         'createdAt': timezone.now().isoformat(),
#                         'userId': user.id
#                     },
#                     'created_at': timezone.now()
#                 }
#             )
#             if created:
#                 logger.info(f"WorkoutPlan created for user_id {user.id}")
#             else:
#                 logger.info(f"WorkoutPlan updated for user_id {user.id}")
#         return plan
#     except IntegrityError as e:
#         logger.error(f"IntegrityError while saving WorkoutPlan: {e}")
#         raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e
#     except Exception as e:
#         logger.error(f"Unexpected error while saving WorkoutPlan: {e}")
#         raise WorkoutPlanCreationError(f"Error saving WorkoutPlan: {e}") from e

#     return None

# def delete_old_profile_picture(user):
#     """
#     Delete the user's old profile picture if it exists.
#     """
#     try:
#         if user.profile_picture:
#             old_file_path = user.profile_picture.path
#             if os.path.isfile(old_file_path):
#                 os.remove(old_file_path)
#                 logger.info(f"Deleted old profile picture for user {user.id}")
#     except Exception as e:
#         logger.warning(f"Error deleting old profile picture for user {user.id}: {str(e)}")

# def validate_image_file(file_content):
#     """
#     Validate that the file content is a valid image file.
#     """
#     try:
#         image = Image.open(io.BytesIO(file_content))
#         image.verify()
#         return True
#     except Exception as e:
#         logger.error(f"Invalid image file: {str(e)}")
#         return False

# def generate_profile_picture(user):
#     """
#     COMMENTED OUT TO AVOID API CALLS DURING TESTING
#     This function was used to generate profile pictures using Replicate API

#     Args:
#         user: The User instance to generate a profile picture for

#     Returns:
#         str: URL of the default profile picture
#     """
#     # Return a default profile picture URL instead
#     return "https://api.dicebear.com/7.x/avataaars/svg?seed=default"

#     # Original implementation commented out:
#     # try:
#     #     logger.info(f"Starting profile picture generation for user {user.id}")
        
#     #     if not settings.REPLICATE_API_TOKEN:
#     #         error_msg = "REPLICATE_API_TOKEN is not set in environment variables. Please add it to your .env file."
#     #         logger.error(error_msg)
#     #         raise ReplicateServiceUnavailable(error_msg)
            
#     #     client = Client(api_token=settings.REPLICATE_API_TOKEN)
#     #     logger.info("Replicate client initialized successfully")

#     #     if user.sex == "Male":
#     #         prompt = ("A professional headshot of an Asian male athlete in workout clothes, "
#     #                  "muscular build, short black hair, determined expression, "
#     #                  "high quality, photorealistic, centered composition, looking at camera, "
#     #                  "natural lighting, gym background, clean modern style")
#     #         negative_prompt = ("female, woman, long hair, feminine features, "
#     #                            "blurry, cartoon, anime, illustration, unrealistic, "
#     #                            "distorted, deformed, low quality")
#     #     else:
#     #         prompt = ("A professional headshot of an Asian female athlete in workout clothes, "
#     #                  "athletic build, tied back hair, confident expression, "
#     #                  "high quality, photorealistic, centered composition, looking at camera, "
#     #                  "natural lighting, gym background, clean modern style")
#     #         negative_prompt = ("male, masculine features, facial hair, "
#     #                            "blurry, cartoon, anime, illustration, unrealistic, "
#     #                            "distorted, deformed, low quality")

#     #     prediction = client.run(
#     #         "black-forest-labs/flux-dev",
#     #         input={
#     #             "prompt": prompt,
#     #             "negative_prompt": negative_prompt,
#     #             "aspect_ratio": "1:1",
#     #             "width": 512,
#     #             "height": 512,
#     #             "output_format": "png",
#     #             "output_quality": 100,
#     #             "safety_tolerance": 2,
#     #             "prompt_upsampling": True,
#     #             "seed": -1
#     #         }
#     #     )
#     #     logger.info(f"Image generation completed, prediction: {prediction}")

#     #     if not prediction or not isinstance(prediction, list) or not prediction[0]:
#     #         logger.error(f"No valid output received from Replicate for user {user.id}. Prediction: {prediction}")
#     #         return False

#     #     image_url = prediction[0].url
#     #     if not image_url:
#     #         logger.error(f"No image URL found in prediction for user {user.id}")
#     #         return False

#     #     max_retries = 3
#     #     timeout = 10
        
#     #     for attempt in range(max_retries):
#     #         try:
#     #             response = requests.get(image_url, timeout=timeout)
#     #             logger.info(f"Image download attempt {attempt + 1}, status code: {response.status_code}")
                
#     #             if response.status_code == 200:
#     #                 if not validate_image_file(response.content):
#     #                     logger.error(f"Downloaded content is not a valid image for user {user.id}")
#     #                     return False
                    
#     #                 timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
#     #                 filename = f"profile_picture_{user.id}_{timestamp}.png"
#     #                 logger.info(f"Saving image as: {filename}")
                    
#     #                 delete_old_profile_picture(user)
                    
#     #                 try:
#     #                     user.profile_picture.save(
#     #                         filename,
#     #                         ContentFile(response.content),
#     #                         save=True
#     #                     )
                        
#     #                     if not os.path.exists(user.profile_picture.path):
#     #                         logger.error(f"Failed to verify saved profile picture for user {user.id}")
#     #                         return False
                        
#     #                     logger.info(f"Successfully generated and saved profile picture for user {user.id}")
#     #                     return True
#     #                 except Exception as e:
#     #                     logger.error(f"Failed to save profile picture for user {user.id}: {str(e)}")
#     #                     return False
                
#     #             elif response.status_code == 404:
#     #                 logger.error(f"Image URL not found for user {user.id}")
#     #                 break
#     #             else:
#     #                 logger.warning(f"Failed download attempt {attempt + 1} with status code: {response.status_code}")
#     #                 if attempt < max_retries - 1:
#     #                     time.sleep(1)
#     #         except requests.Timeout:
#     #             logger.warning(f"Timeout on download attempt {attempt + 1}")
#     #             if attempt < max_retries - 1:
#     #                 time.sleep(1)
#     #         except requests.RequestException as e:
#     #             logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
#     #             if attempt < max_retries - 1:
#     #                 time.sleep(1)
        
#     #     logger.error(f"All download attempts failed for user {user.id}")
#     #     return False
            
#     # except Exception as e:
#     #     logger.error(f"Error generating profile picture for user {user.id}: {str(e)}", exc_info=True)
#     #     return False

# def generate_profile_picture_async(user):
#     """
#     Asynchronously generate a profile picture for a new user.

#     Args:
#         user: The User instance to generate a profile picture for

#     Returns:
#         bool: True if the task was successfully queued, False otherwise
#     """
#     from .tasks import generate_profile_picture_task
    
#     try:
#         task = generate_profile_picture_task.delay(user.id)
#         logger.info(f"Profile picture generation task queued for user {user.id} with task_id {task.id}")
#         return True
#     except Exception as e:
#         logger.error(f"Failed to queue profile picture generation task for user {user.id}: {str(e)}")
#         return False

# def get_cached_analysis(session_id, feedback_rating, feedback_notes, workout_type, exercises):
#     """Get cached analysis result or None if not cached."""
#     cache_key = f'feedback_analysis_{session_id}'
#     return cache.get(cache_key)

# def cache_analysis_result(session_id, analysis_result, timeout=3600):  # Cache for 1 hour
#     """Cache the analysis result."""
#     cache_key = f'feedback_analysis_{session_id}'
#     cache.set(cache_key, analysis_result, timeout)

# def check_rate_limit(user_id):
#     """Check if user has exceeded rate limit for feedback analysis."""
#     cache_key = f'feedback_analysis_rate_{user_id}'
#     count = cache.get(cache_key, 0)
#     if count >= 10:  # Max 10 analyses per hour
#         return False
#     cache.set(cache_key, count + 1, 3600)  # Reset after 1 hour
#     return True

# def analyze_workout_feedback(session_id, feedback_rating, feedback_notes, workout_type, exercises):
#     """
#     Analyzes workout feedback and generates recommendations.
    
#     Args:
#         session_id: ID of the training session
#         feedback_rating: Numeric rating (0-5)
#         feedback_notes: Text feedback from user
#         workout_type: Type of workout
#         exercises: List of exercises performed
    
#     Returns:
#         dict: Analysis results and recommendations
    
#     Raises:
#         ReplicateServiceUnavailable: When Replicate API is unavailable
#         ReplicateRateLimitExceeded: When rate limit is exceeded
#     """
#     from .models import TrainingSession
    
#     try:
#         # Get cached result if available
#         cached_result = get_cached_analysis(
#             session_id, feedback_rating, feedback_notes, workout_type, exercises
#         )
#         if cached_result:
#             return cached_result

#         # Get the training session
#         session = TrainingSession.objects.get(id=session_id)
#         user = session.user
        
#         # Check rate limit
#         if not check_rate_limit(user.id):
#             raise ReplicateRateLimitExceeded("Rate limit exceeded for feedback analysis")

#         # Get user's training history
#         user_history = TrainingSession.objects.filter(
#             user=user,
#             workout_plan=session.workout_plan
#         ).order_by('-date')[:5]

#         # Generate analysis prompt
#         prompt = f"""<s>[INST] As a knowledgeable fitness coach, analyze this workout feedback and provide recommendations:

# Rating: {feedback_rating}/5
# Notes: {feedback_notes}
# Workout Type: {workout_type}
# Exercises: {', '.join(str(e) for e in exercises)}

# Recent Performance: {get_performance_summary(user.id, session.workout_plan_id)}

# Please provide:
# 1. Key observations about this session
# 2. Specific recommendations for improvement
# 3. Suggestions for the next workout [/INST]</s>"""

#         # Call OpenRouter API for analysis
#         try:
#             openrouter_api_key = os.environ.get('OPENROUTER_API_KEY')
#             if not openrouter_api_key:
#                 logger.error("OpenRouter API Key not found in environment variables.")
#                 raise ValueError("OpenRouter API Key not found")

#             payload = {
#                 "model": "meta-llama/llama-3.3-70b-instruct",
#                 "messages": [
#                     {
#                         "role": "system",
#                         "content": "You are a knowledgeable fitness coach analyzing workout feedback."
#                     },
#                     {
#                         "role": "user",
#                         "content": prompt
#                     }
#                 ],
#                 "temperature": 0.7,
#                 "max_tokens": 500,
#                 "top_p": 0.9
#             }

#             headers = {
#                 "Authorization": f"Bearer {openrouter_api_key}",
#                 "Content-Type": "application/json",
#                 "HTTP-Referer": "https://github.com/rafaelabdm/WorkoutApp",
#                 "X-Title": "WorkoutApp"
#             }

#             response = requests.post(
#                 "https://openrouter.ai/api/v1/chat/completions",
#                 json=payload,
#                 headers=headers
#             )

#             if response.status_code != 200:
#                 logger.error(f"OpenRouter API error: {response.text}")
#                 raise ReplicateServiceUnavailable("Unable to analyze feedback at this time")

#             analysis_text = response.json()['choices'][0]['message']['content']
#         except Exception as e:
#             logger.error(f"Error calling OpenRouter API: {str(e)}")
#             raise ReplicateServiceUnavailable("Unable to analyze feedback at this time")

#         # Structure the response
#         result = {
#             'rating': feedback_rating,
#             'analysis': analysis_text,
#             'recommendations': {
#                 'next_workout': get_feedback_specific_prompt(feedback_rating)
#             }
#         }

#         # Cache the result
#         cache_analysis_result(session_id, result)

#         # Notify WebSocket clients about the feedback analysis
#         channel_layer = get_channel_layer()
#         async_to_sync(channel_layer.group_send)(
#             f"workout_plan_{user.id}",
#             {
#                 "type": "workout_feedback_analyzed",
#                 "message": "Workout feedback analysis is ready",
#                 "session_id": session_id,
#                 "feedback_data": result
#             }
#         )

#         # For positive feedback (rating >= 4), save successful patterns
#         if feedback_rating >= 4:
#             try:
#                 save_successful_workout_pattern(user.id, workout_type, exercises, analysis_text)
#             except Exception as e:
#                 logger.error(f"Error saving successful workout pattern: {str(e)}")

#         return result

#     except TrainingSession.DoesNotExist:
#         logger.error(f"Training session {session_id} not found")
#         raise
#     except (ReplicateServiceUnavailable, ReplicateRateLimitExceeded) as e:
#         raise
#     except Exception as e:
#         logger.error(f"Error analyzing workout feedback: {str(e)}")
#         raise

# def get_performance_summary(user_id, workout_plan_id=None):
#     """Generate a summary of recent workout performance."""
#     from .models import TrainingSession

#     # Get user's training history
#     history = TrainingSession.objects.filter(user_id=user_id)
#     if workout_plan_id:
#         history = history.filter(workout_plan_id=workout_plan_id)
#     history = history.order_by('-date')[:5]  # Last 5 sessions

#     if not history:
#         return "No recent workout history available."

#     # Calculate average rating
#     rated_sessions = [s for s in history if s.feedback_rating is not None]
#     if rated_sessions:
#         avg_rating = sum(s.feedback_rating for s in rated_sessions) / len(rated_sessions)
#         rating_text = f"Average rating: {avg_rating:.1f}/5"
#     else:
#         rating_text = "No ratings available"

#     # Count workout types
#     workout_types = Counter(s.workout_type for s in history)
#     most_common = workout_types.most_common(1)[0] if workout_types else None
#     type_text = f"Most common workout: {most_common[0]} ({most_common[1]} times)" if most_common else ""

#     return f"{rating_text}. {type_text}"

# def get_feedback_specific_prompt(rating):
#     """Get specific prompt based on feedback rating."""
#     if rating >= 4:
#         return "What aspects made this workout particularly successful?"
#     elif rating <= 2:
#         return "What immediate adjustments are needed to improve the next workout?"
#     else:
#         return "What minor tweaks could enhance this workout experience?"

# def save_successful_workout_pattern(user_id, workout_type, exercises, analysis):
#     """Save successful workout patterns for future reference."""
#     cache_key = f'successful_patterns_{user_id}_{workout_type}'
    
#     # Get existing patterns or initialize empty list
#     patterns = cache.get(cache_key, [])
    
#     # Add new pattern
#     pattern = {
#         'exercises': exercises,
#         'analysis': analysis,
#         'timestamp': timezone.now().isoformat()
#     }
    
#     # Keep only last 5 patterns
#     patterns = [pattern] + patterns[:4]
    
#     # Cache for 30 days
#     cache.set(cache_key, patterns, timeout=60*60*24*30)

# def calculate_progression_metrics(recent_sessions, older_sessions, user):
#     """Calculate progression metrics comparing recent vs older sessions."""
#     try:
#         # Filter out scheduled sessions
#         recent_sessions = [s for s in recent_sessions if s.source == 'completed']
#         older_sessions = [s for s in older_sessions if s.source == 'completed']
        
#         metrics = {
#             'total_sessions': len(recent_sessions) if recent_sessions else 0,
#             'recent_sessions': len(recent_sessions) if recent_sessions else 0,
#             'older_sessions': len(older_sessions) if older_sessions else 0,
#             'strength_progress': {},
#             'cardio_progress': {},
#             'total_duration': 0,
#             'avg_duration': 0,
#             'total_calories': 0,
#             'workout_types': {'recent': {}, 'previous': {}},
#             'sessions': []  # Add sessions list
#         }

#         # Process workout types
#         for session in recent_sessions:
#             if session.workout_type:
#                 metrics['workout_types']['recent'][session.workout_type] = metrics['workout_types']['recent'].get(session.workout_type, 0) + 1
#                 metrics['total_duration'] += session.duration if session.duration else 0
#                 metrics['total_calories'] += session.calories_burned if session.calories_burned else 0

#         for session in older_sessions:
#             if session.workout_type:
#                 metrics['workout_types']['previous'][session.workout_type] = metrics['workout_types']['previous'].get(session.workout_type, 0) + 1

#         if recent_sessions:
#             metrics['avg_duration'] = metrics['total_duration'] / len(recent_sessions)

#         # Add session data
#         for session in recent_sessions:
#             session_data = {
#                 'id': session.id,
#                 'session_name': session.session_name,
#                 'date': session.date.strftime('%Y-%m-%d'),
#                 'workout_type': session.workout_type,
#                 'duration': session.duration,
#                 'calories_burned': session.calories_burned,
#                 'exercises': []
#             }
            
#             # Get exercises for this session through the many-to-many relationship
#             for tse in session.trainingsessionexercise_set.all():
#                 exercise = tse.exercise
#                 if exercise:
#                     exercise_data = {
#                         'exercise_name': exercise.name,
#                         'sets': tse.sets,
#                         'reps': tse.reps,
#                         'weight': tse.weight,
#                         'duration': tse.duration,
#                         'calories_burned': tse.calories_burned,
#                         'average_heart_rate': tse.average_heart_rate,
#                         'max_heart_rate': tse.max_heart_rate,
#                         'intensity': tse.intensity
#                     }
#                     session_data['exercises'].append(exercise_data)
            
#             metrics['sessions'].append(session_data)

#         # Process exercises for progression metrics
#         recent_ids = [session.id for session in recent_sessions]
#         older_ids = [session.id for session in older_sessions]

#         from .models import TrainingSessionExercise
#         exercise_logs = TrainingSessionExercise.objects.filter(
#             training_session_id__in=recent_ids + older_ids
#         ).select_related('exercise', 'training_session')

#         logger.info(f"Found {exercise_logs.count()} exercise logs to process")

#         # Process exercises
#         for exercise_log in exercise_logs:
#             if not exercise_log.exercise:
#                 logger.debug(f"Skipping exercise log {exercise_log.id} - no exercise associated")
#                 continue

#             exercise_type = exercise_log.exercise.exercise_type
#             exercise_key = exercise_log.exercise.name
#             is_recent = exercise_log.training_session_id in recent_ids

#             if not exercise_type or not exercise_key:
#                 logger.debug(f"Skipping exercise log {exercise_log.id} - missing type or name")
#                 continue

#             if exercise_type == 'strength':
#                 if exercise_key not in metrics['strength_progress']:
#                     metrics['strength_progress'][exercise_key] = {
#                         'recent_max': 0,
#                         'previous_max': 0,
#                         'recent_volume': 0,
#                         'previous_volume': 0
#                     }
                
#                 weight = float(exercise_log.weight) if exercise_log.weight else 0
#                 sets = int(exercise_log.sets) if exercise_log.sets else 0
#                 reps = int(exercise_log.reps) if exercise_log.reps else 0
#                 volume = weight * sets * reps
#                 progress = metrics['strength_progress'][exercise_key]
                
#                 if is_recent:
#                     progress['recent_max'] = max(progress['recent_max'], weight)
#                     progress['recent_volume'] += volume
#                 else:
#                     progress['previous_max'] = max(progress['previous_max'], weight)
#                     progress['previous_volume'] += volume
            
#             elif exercise_type == 'cardio':
#                 if exercise_key not in metrics['cardio_progress']:
#                     metrics['cardio_progress'][exercise_key] = {
#                         'recent': {'total_duration': 0, 'count': 0, 'total_calories': 0, 'avg_heart_rate': 0},
#                         'previous': {'total_duration': 0, 'count': 0, 'total_calories': 0, 'avg_heart_rate': 0}
#                     }
                
#                 progress = metrics['cardio_progress'][exercise_key]
#                 period = 'recent' if is_recent else 'previous'
                
#                 duration = float(exercise_log.duration) if exercise_log.duration else 0
#                 calories = float(exercise_log.calories_burned) if exercise_log.calories_burned else 0
#                 heart_rate = float(exercise_log.average_heart_rate) if exercise_log.average_heart_rate else 0
                
#                 progress[period]['total_duration'] += duration
#                 progress[period]['total_calories'] += calories
#                 progress[period]['avg_heart_rate'] = (
#                     (progress[period]['avg_heart_rate'] * progress[period]['count'] + heart_rate) /
#                     (progress[period]['count'] + 1)
#                 ) if heart_rate > 0 else progress[period]['avg_heart_rate']
#                 progress[period]['count'] += 1

#         # Calculate averages for cardio exercises
#         for exercise in metrics['cardio_progress'].values():
#             for period in ['recent', 'previous']:
#                 if exercise[period]['count'] > 0:
#                     exercise[period]['avg_duration'] = exercise[period]['total_duration'] / exercise[period]['count']
#                     exercise[period]['avg_calories'] = exercise[period]['total_calories'] / exercise[period]['count']
#                 del exercise[period]['count']

#         logger.info("Successfully calculated progression metrics")
#         return metrics
#     except Exception as e:
#         logger.error(f"Error in calculate_progression_metrics: {str(e)}", exc_info=True)
#         # Return default metrics instead of raising the error
#         return {
#             'total_sessions': len(recent_sessions) if recent_sessions else 0,
#             'recent_sessions': len(recent_sessions) if recent_sessions else 0,
#             'older_sessions': len(older_sessions) if older_sessions else 0,
#             'strength_progress': {},
#             'cardio_progress': {},
#             'total_duration': 0,
#             'avg_duration': 0,
#             'total_calories': 0,
#             'workout_types': {'recent': {}, 'previous': {}},
#             'sessions': []
#         }
