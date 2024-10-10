# api/services.py

import os
import replicate
import json
import logging
import requests
from jsonschema import validate, ValidationError
from django.conf import settings
from .models import TrainingSession, WorkoutPlan
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import re
import time


logger = logging.getLogger(__name__)

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

class ReplicateServiceUnavailable(Exception):
    """Exception raised when the Replicate service is unavailable."""
    pass

def validate_workout_plan(workout_plan):
    try:
        validate(instance=workout_plan, schema=WORKOUT_PLAN_SCHEMA)
        logger.debug("Workout plan JSON is valid.")
        return True
    except ValidationError as ve:
        logger.error(f"Workout plan JSON validation error: {ve.message}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during JSON validation: {e}")
        raise

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

    # Incorporate user feedback for dynamic adjustments
    feedback_note = get_latest_feedback(user)

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

def create_prompt(age, sex, weight, height, fitness_level, strength_goals, equipment, workout_days, workout_time, additional_goals, feedback_note):
    """
    Creates a detailed prompt based on user's profile to generate a personalized workout plan.
    Instructs the AI to return the plan in a predefined JSON format.
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
        f"**Feedback:** {feedback_note}\n\n"
        f"**Requirements:**\n"
        f"1. Adjust the number of exercises, sets, and reps based on the user's available time.\n"
        f"2. Incorporate cardio exercises using the available equipment or generic cardio equipment if specific ones are not available.\n"
        f"3. Tailor the intensity and complexity of exercises based on the user's fitness level, age, and sex.\n"
        f"4. Vary the workout plan weekly based on user feedback and progression.\n\n"
        f"5. Present at least 4 exercises for each day of the week.\n\n"
        f"6. Users with more time availblke will have more exercises or/and more sets/reps.\n\n"
        f"6. If Feedback field is provided then change the workout plan accordingly.\n\n"
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
        f"          \"instructions\": \"Lie on the bench with your feet planted firmly on the ground. Grip the barbell slightly wider than shoulder-width apart. Lower the barbell to your chest while inhaling, then press it back up while exhaling. Maintain a steady pace and control throughout the movement.\"\n"
        f"        }},\n"
        f"        {{\n"
        f"          \"name\": \"Tricep Pushdown\",\n"
        f"          \"setsReps\": \"3 sets of 12-15 reps\",\n"
        f"          \"equipment\": \"Cable Machine\",\n"
        f"          \"instructions\": \"Attach a straight bar to the high pulley of the cable machine. Grasp the bar with an overhand grip, keeping your elbows close to your body. Push the bar down until your arms are fully extended, then slowly return to the starting position.\"\n"
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
        f"          \"instructions\": \"Stand with your feet shoulder-width apart, gripping the barbell with your hands shoulder-width apart. Keeping your back straight and your core engaged, lift the barbell off the ground. Stand up, squeezing your glutes and pushing your hips back. Lower the barbell to the starting position, keeping control throughout the entire range of motion. Repeat for the desired number of reps and sets.\"\n"
        f"        }},\n"
        f"        {{\n"
        f"          \"name\": \"Bicep Curl\",\n"
        f"          \"setsReps\": \"3 sets of 10-12 reps\",\n"
        f"          \"equipment\": \"Dumbbells\",\n"
        f"          \"instructions\": \"Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing forward. Curl the dumbbells up towards your shoulders, keeping your upper arms still. Lower the dumbbells to the starting position, keeping control throughout the entire range of motion. Repeat for the desired number of reps and sets.\"\n"
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
        f"1. **Provide only the JSON response without any additional explanations or text.**"
        f"2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**\n"
        f"4. **Do not include any text before or after the JSON.**\n"
        f"5. **If you need to mention anything, include it within the JSON as 'additionalTips'.**\n"
    )

    return prompt

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


def process_feedback_with_ai(feedback_data):
    try:
        # Get the Replicate API token
        replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
        if not replicate_api_token:
            logger.error("Replicate API token not found in environment variables.")
            return None

        os.environ["REPLICATE_API_TOKEN"] = replicate_api_token  # Set the environment variable
        
        client = replicate.Client(api_token=replicate_api_token, timeout=300)
        
        # Define the model name
        model_name = "meta/meta-llama-3-70b-instruct"

        # Define the inputs
        inputs = {
            "prompt": feedback_data['prompt'],
            "temperature": 0.7,
            "max_new_tokens": 3500,
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

        # Extract JSON from the output
        # extracted_json = extract_json_from_text(output_str)
        json_match = re.search(r'\{.*\}', output_str, re.DOTALL)
        if json_match:
            json_content = json_match.group(0)
        else:
            logger.error("No JSON content found in AI output")
            raise ValueError("No JSON content found in AI output")

        # Parse the JSON content
        try:
            workout_plan = json.loads(json_content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON Decode Error: {e}")
            logger.error(f"Problematic AI Output: {json_content}")
            raise ValueError(f"Invalid JSON format after extraction: {e}")

        # Validate the JSON structure
        if validate_workout_plan(workout_plan):
            return workout_plan
        else:
            raise ValueError("Transformed workout plan JSON does not adhere to the required schema.")

    except replicate.exceptions.ReplicateError as e:
        logger.error(f"Replicate API Error: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Replicate API Error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error generating workout plan: {e}", exc_info=True)
        raise



def send_workout_plan_to_group(user, workout_plan):
    """
    Sends the workout plan to the user's group via Channels.

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
