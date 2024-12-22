# backend/api/services/workout_plan.py
import os
import json
import logging
import requests
from jsonschema import validate, ValidationError
from django.conf import settings
from ..models import WorkoutPlan, YouTubeVideo
from ..helpers import (
    get_video_id,
    get_video_data_by_id,
    standardize_exercise_name
)
from .day_mapping import map_days_to_weekdays
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
import re

logger = logging.getLogger(__name__)

# Custom exceptions
class WorkoutPlanCreationError(Exception):
    """Exception raised when creating or updating a WorkoutPlan fails."""
    pass

class OpenRouterServiceUnavailable(Exception):
    """Exception raised when OpenRouter service is unavailable."""
    pass

# Define base exercise schema
BASE_EXERCISE = {
    "type": "object",
    "required": ["name", "exercise_type", "tracking_type", "instructions"],
    "properties": {
        "name": {"type": "string"},
        "exercise_type": {"type": "string"},
        "tracking_type": {"type": "string"},
        "weight": {"type": ["string", "null"]},
        "sets": {"type": ["string", "null"]},
        "reps": {"type": ["string", "null"]},
        "duration": {"type": ["string", "null"]},
        "rest_time": {"type": ["string", "null"]},
        "intensity": {"type": ["string", "null"]},
        "instructions": {
            "type": "object",
            "properties": {
                "setup": {"type": "string"},
                "execution": {"type": "array", "items": {"type": "string"}},
                "form_tips": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["setup", "execution", "form_tips"]
        }
    },
    "allOf": [
        {
            "if": {
                "properties": {
                    "exercise_type": {"enum": ["cardio", "hiit", "recovery", "yoga", "stretching", "flexibility"]},
                    "tracking_type": {"const": "time_based"}
                }
            },
            "then": {
                "required": ["duration", "intensity"],
                "properties": {
                    "duration": {"type": "string"},
                    "intensity": {"type": "string"},
                    "sets": {"type": "null"},
                    "reps": {"type": "null"}
                }
            }
        },
        {
            "if": {
                "properties": {
                    "tracking_type": {"const": "reps_based"}
                }
            },
            "then": {
                "required": ["sets", "reps"],
                "properties": {
                    "sets": {"type": "string"},
                    "reps": {"type": "string"},
                    "duration": {"type": "null"},
                    "intensity": {"type": "null"}
                }
            }
        },
        {
            "if": {
                "properties": {
                    "tracking_type": {"const": "weight_based"}
                }
            },
            "then": {
                "required": ["sets", "reps", "weight"],
                "properties": {
                    "sets": {"type": "string"},
                    "reps": {"type": "string"},
                    "weight": {"type": "string"},
                    "duration": {"type": "null"},
                    "intensity": {"type": "null"}
                }
            }
        }
    ]
}

# JSON schema for workout plan validation
WORKOUT_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "workoutDays": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {
                        "type": "string",
                        "enum": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                    },
                    "type": {
                        "type": "string",
                        "enum": ["workout", "active_recovery", "rest"]
                    },
                    "workout_type": {"type": ["string", "null"]},
                    "duration": {"type": ["string", "integer", "null"]},
                    "exercises": {
                        "type": "array",
                        "items": BASE_EXERCISE
                    },
                    "notes": {"type": ["string", "null"]},
                    "suggested_activities": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["day", "type"],
                "allOf": [
                    {
                        "if": {
                            "properties": { "type": { "const": "rest" } }
                        },
                        "then": {
                            "properties": { "exercises": { "maxItems": 0 } }
                        },
                        "else": {
                            "required": ["exercises"]
                        }
                    }
                ]
            }
        },
        "additionalTips": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["workoutDays"]
}

def validate_workout_plan(workout_plan):
    """
    Validates the workout plan against the predefined JSON schema.
    """
    try:
        validate(instance=workout_plan, schema=WORKOUT_PLAN_SCHEMA)
        return True, None
    except ValidationError as e:
        return False, str(e)

def generate_prompt(age, sex, weight, height, fitness_level, strength_goals,
                   additional_goals, equipment, workout_time, workout_days,
                   feedback_note=None, user_comments=None):
    """
    Generate a prompt for the AI model to create a workout plan.
    """

    # Determine the approximate number of exercises based on workout_time
    # Adjust these numbers as needed
    if workout_time >= 60:
        exercises_count_range = "7 to 8 exercises"
    else:
        exercises_count_range = "4 to 5 exercises"

    # Convert strength goals into a readable bullet list if not empty
    strength_goals_section = f"Strength Goals:\n" + "\n".join([f"- {goal}" for goal in strength_goals]) if strength_goals else ""

    # Additional goals if provided
    additional_goals_section = f"Additional Goals:\n{additional_goals}" if additional_goals else ""

    # Feedback note if provided
    feedback_section = f"Recent Feedback:\n{feedback_note}" if feedback_note else ""

    # User comments if provided
    comments_section = f"User Comments:\n{user_comments}" if user_comments else ""

    sections = [
        f"""Create a workout plan with EXACTLY {workout_days} workout days. The plan must include:
- Exactly {workout_days} days marked as 'workout'
- If workout days are 6 or 7, include up to 3 recovery days (combination of 'active_recovery' and 'rest')
- Total days should add up to 7 for a complete week
- Each workout day should have a name in the format 'Day X: [Goal] Workout Type'. For example, 'Day 1: Upper Body Strength'.
- Each workout day must clearly state its goal (e.g., focusing on upper body strength, improving endurance, targeting lower body, etc.) based on the user's goals and preferences.
- Tailor the number of exercises to the user's available workout time:
  - Since the user has about {workout_time} minutes per session, include about {exercises_count_range} for each workout session if it's a workout day.
- Every exercise in a workout day MUST have an assigned 'exercise_type' from the following list:
  'strength', 'cardio', 'flexibility', 'mobility', 'balance', 'power', 'endurance', 'plyometric', 'agility',
  'mobility', 'bodyweight', 'calisthenics', 'hiit', 'compound', 'isolation', 'functional', 'recovery',
  'stretching', 'yoga', 'pilates', 'stretching', 'full body'
- For EVERY exercise, you MUST specify execution details based on the exercise type:
  1. For cardio/time-based exercises:
     - MUST specify duration (e.g., "45 seconds", "2 minutes") - reasonable durations only
     - MUST specify intensity level (e.g., "moderate", "high")
  2. For strength/weight-based exercises:
     - MUST specify sets (e.g., "3 sets")
     - MUST specify reps (e.g., "12 reps")
     - MUST specify weight if applicable (e.g., "20 lbs" or "bodyweight")
  3. For bodyweight/reps-based exercises:
     - MUST specify sets (e.g., "3 sets")
     - MUST specify reps (e.g., "15 reps")
- DO NOT leave any exercise without specific execution details
- Ensure all durations are reasonable and achievable (e.g., no 30-minute planks)
- Ensure that the equipment used in each exercise is appropriate and matches the equipment the user has available.
- Align the training sessions with the user's stated strength goals, fitness level, and additional goals so that each session's exercises and focus reflect what the user wants to achieve.

User Profile:
- Age: {age}
- Sex: {sex}
- Weight: {weight}
- Height: {height}
- Fitness Level: {fitness_level}
- Available Equipment: {', '.join(equipment)}
- Time per workout: {workout_time} minutes""",
        strength_goals_section,
        additional_goals_section,
        feedback_section,
        comments_section,
        """
Format Requirements:
- Return a valid JSON object with 'workoutDays' array
- Each day must have 'type' as one of: 'workout', 'active_recovery', or 'rest'
- CRITICAL: Ensure EXACT number of workout days as specified
- Keep form guidance and safety tips brief and focused
- Use bullet points for instructions and tips
- Limit descriptions to essential points only
- Return ONLY the JSON object, nothing else
- Keep exercise descriptions concise and focused
"""
    ]

    # Filter out empty strings
    sections = [s for s in sections if s.strip()]

    return "\n".join(sections)

def convert_numeric_to_string(workout_plan):
    """Convert numeric values to strings in the workout plan."""
    for day in workout_plan.get('workoutDays', []):
        if day.get('type') == 'rest':
            day['exercises'] = []
            continue
        if 'exercises' in day:
            for exercise in day['exercises']:
                if 'sets' in exercise and isinstance(exercise['sets'], (int, float)):
                    exercise['sets'] = str(exercise['sets'])
                if 'reps' in exercise and isinstance(exercise['reps'], (int, float)):
                    exercise['reps'] = str(exercise['reps'])
                if 'duration' in exercise and isinstance(exercise['duration'], (int, float)):
                    exercise['duration'] = str(exercise['duration'])
    return workout_plan

def assign_video_ids_to_exercises(workout_plan):
    """Assign video IDs to exercises in the workout plan."""
    from ..models import Exercise  # Import Exercise model at function level to avoid circular imports
    
    processed_exercises = set()
    for day in workout_plan['workoutDays']:
        if 'exercises' not in day:
            continue
        for exercise in day['exercises']:
            exercise_name = exercise.get('name', '')
            if not exercise_name or exercise_name in processed_exercises:
                continue
            try:
                # Get the first matching exercise from the database
                existing_exercise = Exercise.objects.filter(name__iexact=exercise_name).first()
                if existing_exercise:
                    # If exercise exists in database, use its video information
                    exercise['videoId'] = existing_exercise.videoId
                    processed_exercises.add(exercise_name)
                else:
                    # If exercise doesn't exist, get video data and create the exercise
                    try:
                        video_data = get_video_id(exercise_name)
                        if video_data and 'video_id' in video_data:
                            try:
                                video = YouTubeVideo.objects.get(video_id=video_data['video_id'])
                            except YouTubeVideo.DoesNotExist:
                                video = YouTubeVideo.objects.create(
                                    exercise_name=standardize_exercise_name(exercise_name),
                                    video_id=video_data['video_id'],
                                    title=f"{exercise_name} Form Guide",
                                    video_url=video_data.get('video_url', f"https://www.youtube.com/watch?v={video_data['video_id']}"),
                                    thumbnail_url=video_data.get('thumbnail_url', f"https://i.ytimg.com/vi/{video_data['video_id']}/hqdefault.jpg")
                                )
                            
                            # Create new exercise in database with video information
                            new_exercise = Exercise.objects.create(
                                name=exercise_name,
                                description=json.dumps({"description": f"Description for {exercise_name}"}),
                                instructions=json.dumps({
                                    "setup": exercise['instructions']['setup'],
                                    "execution": exercise['instructions']['execution'],
                                    "form_tips": exercise['instructions']['form_tips']
                                }),
                                exercise_type=exercise['exercise_type'],
                                videoId=video.video_id,
                                video_url=video.video_url,
                                thumbnail_url=video.thumbnail_url
                            )
                            exercise['videoId'] = new_exercise.videoId
                            processed_exercises.add(exercise_name)
                    except Exception as e:
                        logger.error(f"Error fetching videoId for exercise '{exercise_name}': {str(e)}")
                        exercise['videoId'] = None
            except Exception as e:
                logger.error(f"Error processing exercise '{exercise_name}': {str(e)}")
                exercise['videoId'] = None
    return workout_plan

def generate_workout_plan(user_id, feedback_text=None):
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        strength_goals = [goal.name for goal in user.strength_goals.all()]
        equipment = [eq.name for eq in user.equipment.all()]
        
        prompt = generate_prompt(
            age=user.age,
            sex=user.sex,
            weight=user.weight,
            height=user.height,
            fitness_level=user.fitness_level,
            strength_goals=strength_goals,
            additional_goals=user.additional_goals,
            equipment=equipment,
            workout_time=user.workout_time,
            workout_days=user.workout_days,
            feedback_note=feedback_text,
            user_comments=None
        )
        
        logger.info("Generated prompt for workout plan:")
        logger.info(prompt)
        
        headers = {
            'Authorization': f'Bearer {settings.OPENROUTER_API_KEY}',
            'HTTP-Referer': settings.ALLOWED_HOSTS[0],
            'X-Title': 'Workout App'
        }
        
        data = {
            'model': 'meta-llama/llama-3.3-70b-instruct',
            'messages': [
                {
                    'role': 'system',
                    'content': '''You are a professional fitness trainer and exercise specialist. Generate detailed, safe, and effective workout plans based on user requirements. Follow these guidelines:
1. Always respond with valid JSON format
2. Keep responses concise and focused on essential information
3. For exercise instructions, provide only key points, not lengthy descriptions
4. For form guidance and safety tips, use bullet points and keep them brief
5. Avoid redundant information across exercises
6. Use consistent, simple formatting for all exercises'''
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.7,  # Even lower temperature for more consistent responses
            'max_tokens': 4096,  # Further reduced max tokens
            'response_format': { 'type': 'json_object' }
        }
        
        logger.info("Sending request to OpenRouter API:")
        logger.info(json.dumps(data, indent=2))
        
        try:
            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers=headers,
                json=data,
                timeout=60
            )
            
            logger.info("Received response from OpenRouter API:")
            logger.info(response.text)
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API error: {response.text}")
                raise OpenRouterServiceUnavailable(f"OpenRouter API error: {response.text}")
            
            response_data = response.json()
            if not response_data.get('choices') or not response_data['choices'][0].get('message'):
                raise OpenRouterServiceUnavailable("Invalid response format from OpenRouter")
            
            output = response_data['choices'][0]['message']['content']
            
            logger.info("AI model response content:")
            logger.info(output)
            
            # Clean up the output
            output = output.strip()
            
            # Remove any INFO prefixes that might be in the response
            output = re.sub(r'^INFO\s*', '', output, flags=re.MULTILINE)
            
            # Remove code block markers
            if output.startswith('```json'):
                output = output[7:]
            if output.endswith('```'):
                output = output[:-3]
            output = output.strip()
            
            # Try to extract valid JSON
            json_str = extract_json_from_text(output)
            if not json_str:
                # Try to find a complete JSON object in the text
                start_idx = output.find('{')
                if start_idx >= 0:
                    # Find matching closing brace
                    brace_count = 0
                    end_idx = -1
                    for i, char in enumerate(output[start_idx:], start_idx):
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                end_idx = i + 1
                                break
                    
                    if end_idx > start_idx:
                        json_str = output[start_idx:end_idx]
                        try:
                            json.loads(json_str)  # Validate it's valid JSON
                        except json.JSONDecodeError:
                            json_str = None
                
                if not json_str:
                    logger.error("Failed to extract valid JSON from AI response")
                    raise ValueError("Invalid response format from AI model")
            
            try:
                workout_plan = json.loads(json_str)
                logger.info("Successfully parsed workout plan data from JSON response")
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e}")
                try:
                    json_str = ''.join(char for char in json_str if ord(char) < 128)
                    workout_plan = json.loads(json_str)
                    logger.info("Successfully parsed workout plan data after cleaning Unicode characters")
                except json.JSONDecodeError as e:
                    raise ValueError(f"Failed to parse workout plan data: {e}")
            
            logger.info("Initial parsed workout plan:")
            logger.info(json.dumps(workout_plan, indent=2))
            
            # Check top-level keys
            if 'workout_plan' in workout_plan:
                plan_data = workout_plan['workout_plan']
                if isinstance(plan_data, dict) and 'days' in plan_data:
                    days_data = plan_data['days']
                elif isinstance(plan_data, list):
                    days_data = plan_data
                else:
                    logger.error(f"Invalid workout plan format: {plan_data}")
                    raise WorkoutPlanCreationError("Invalid workout plan format: No days data found")
            elif 'week_plan' in workout_plan:
                days_data = workout_plan['week_plan']
            elif 'days' in workout_plan:
                days_data = workout_plan['days']
            elif 'workoutDays' in workout_plan:
                # If the AI returns the plan directly under 'workoutDays'
                days_data = workout_plan['workoutDays']
            else:
                logger.error(f"Invalid workout plan format: No 'workout_plan', 'week_plan', or 'days' found. Received: {workout_plan}")
                raise WorkoutPlanCreationError("Invalid workout plan format: No workout days data found")

            # If days_data is found, transform them
            if not days_data:
                raise WorkoutPlanCreationError("No workout days data found")

            days = []
            for index, day_data in enumerate(days_data, 1):
                if day_data.get('type') == 'rest':
                    transformed_day = {
                        'day': f'day{index}',
                        'type': 'rest',
                        'workout_type': None,
                        'duration': '24 hours',
                        'exercises': [],
                        'notes': 'Rest and recovery day. Focus on getting adequate sleep and light stretching if needed.',
                        'suggested_activities': ['Light walking', 'Gentle stretching', 'Meditation']
                    }
                    days.append(transformed_day)
                    continue

                exercises = []
                for exercise_data in day_data.get('exercises', []):
                    exercise_name = exercise_data.get('name', exercise_data.get('exercise', ''))
                    if not exercise_name:
                        logger.warning(f"Skipping exercise with empty name in day {index}")
                        continue

                    # Determine exercise type and tracking type
                    exercise_type = exercise_data.get('exercise_type', 'strength')
                    
                    # Set tracking type and required fields based on exercise type
                    if exercise_type in ['cardio', 'recovery', 'yoga', 'stretching', 'flexibility']:
                        tracking_type = 'time_based'
                        duration = exercise_data.get('duration', '') or '45 seconds'
                        intensity = exercise_data.get('intensity', 'moderate')
                        sets = None
                        reps = None
                        weight = None
                    elif exercise_type in ['strength', 'power', 'compound']:
                        tracking_type = 'weight_based'
                        duration = None
                        intensity = None
                        sets = exercise_data.get('sets', '3')
                        reps = exercise_data.get('reps', '12')
                        weight = exercise_data.get('weight', 'bodyweight')
                    else:
                        tracking_type = 'reps_based'
                        duration = None
                        intensity = None
                        sets = exercise_data.get('sets', '3')
                        reps = exercise_data.get('reps', '15')
                        weight = None

                    # Create instructions from form guidance and safety tips
                    form_guidance = day_data.get('form_guidance', [])
                    safety_tips = day_data.get('safety_tips', [])
                    
                    # Combine form guidance and safety tips
                    all_tips = []
                    if form_guidance:
                        all_tips.extend([tip.strip('* ') for tip in form_guidance])
                    if safety_tips:
                        all_tips.extend([tip.strip('* ') for tip in safety_tips])

                    # Create execution steps based on tracking type
                    execution_steps = [f"Perform {exercise_name} with proper form"]
                    if tracking_type == 'time_based':
                        execution_steps.append(f"Continue for {duration} at {intensity} intensity")
                    else:
                        execution_steps.append(f"Complete {sets} sets of {reps} repetitions")

                    instructions = {
                        'setup': 'Get into position',
                        'execution': execution_steps,
                        'form_tips': all_tips if all_tips else ['Maintain proper form throughout']
                    }

                    transformed_exercise = {
                        'name': exercise_name,
                        'exercise_type': exercise_type,
                        'tracking_type': tracking_type,
                        'weight': weight,
                        'sets': sets,
                        'reps': reps,
                        'duration': duration,
                        'rest_time': exercise_data.get('rest_time'),
                        'intensity': intensity if tracking_type == 'time_based' else None,
                        'instructions': instructions
                    }
                    exercises.append(transformed_exercise)

                transformed_day = {
                    'day': f'day{index}',
                    'type': day_data.get('type', 'workout'),
                    'workout_type': day_data.get('name', '').split(': ')[-1] if day_data.get('name') else None,
                    'duration': None,
                    'exercises': exercises,
                    'notes': None,
                    'suggested_activities': []
                }
                days.append(transformed_day)

            workout_plan = {
                'workoutDays': days,
                'additionalTips': []
            }

            workout_plan = convert_numeric_to_string(workout_plan)
            workout_plan = map_days_to_weekdays(workout_plan)
            workout_plan = assign_video_ids_to_exercises(workout_plan)
            
            logger.info("Transformed workout plan:")
            logger.info(json.dumps(workout_plan, indent=2))
            
            is_valid, error = validate_workout_plan(workout_plan)
            if not is_valid:
                logger.error(f"Workout plan validation failed: {error}")
                raise WorkoutPlanCreationError(f"Invalid workout plan format: {error}")
            
            with transaction.atomic():
                workout_plan_obj, created = WorkoutPlan.objects.update_or_create(
                    user=user,
                    defaults={
                        'plan_data': workout_plan,
                        'week_number': 1
                    }
                )
            
            return workout_plan_obj
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}\nResponse content: {output}")
            raise WorkoutPlanCreationError(f"Failed to parse workout plan: {str(e)}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {str(e)}")
            raise OpenRouterServiceUnavailable(f"Failed to connect to OpenRouter: {str(e)}")
            
    except User.DoesNotExist:
        raise WorkoutPlanCreationError("User not found")
    except Exception as e:
        logger.error(f"Error generating workout plan: {str(e)}")
        raise WorkoutPlanCreationError(f"Failed to generate workout plan: {str(e)}")


def extract_json_from_text(text):
    """
    Extracts and attempts to repair JSON content from text, handling code blocks,
    triple backticks, and incomplete JSON structures.
    """
    try:
        # Remove code block markers and clean the text
        text = re.sub(r'^```[a-zA-Z]*\n?', '', text, flags=re.MULTILINE)
        text = text.replace('```', '')
        text = text.strip()

        # Find the start of the JSON object
        start_index = text.find('{')
        if start_index == -1:
            logger.error("No JSON object found")
            return None

        # Extract from the start to either the last complete closing brace or the end
        json_str = text[start_index:]
        
        # Count opening and closing braces
        open_count = json_str.count('{')
        close_count = json_str.count('}')

        # If we have more opening braces than closing, try to complete the structure
        if open_count > close_count:
            # Add missing closing braces
            json_str += '}' * (open_count - close_count)
            logger.info(f"Added {open_count - close_count} closing braces to complete JSON structure")

        # Try to parse the JSON
        try:
            # First try parsing as is
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError as e:
            # If that fails, try to find the last valid JSON object
            stack = []
            last_valid_end = -1
            
            for i, char in enumerate(json_str):
                if char == '{':
                    stack.append(i)
                elif char == '}':
                    if stack:
                        start = stack.pop()
                        if not stack:  # This means we've found a complete top-level object
                            try:
                                # Try to parse this substring
                                test_str = json_str[start:i+1]
                                json.loads(test_str)
                                last_valid_end = i + 1
                            except json.JSONDecodeError:
                                continue

            if last_valid_end != -1:
                json_str = json_str[:last_valid_end]
                try:
                    json.loads(json_str)  # Final validation
                    logger.info("Successfully extracted partial but valid JSON object")
                    return json_str
                except json.JSONDecodeError:
                    pass

            logger.error(f"Could not extract valid JSON: {str(e)}")
            return None

    except Exception as e:
        logger.error(f"Error processing JSON text: {str(e)}")
        return None
