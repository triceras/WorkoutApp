# api/services.py

import os
import replicate
import json
import logging
import requests
from jsonschema import validate, ValidationError
from django.conf import settings
from .models import TrainingSession, WorkoutPlan
from .helpers import send_workout_plan_to_group, get_youtube_video_id
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
import re
from django.utils import timezone


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
                    "required": ["name", "setsReps", "equipment", "instructions", "videoId"],
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

def assign_video_ids_to_session(session_data):
    for exercise in session_data.get('exercises', []):
        exercise_name = exercise.get('name')
        if exercise_name:
            video_id = get_youtube_video_id(exercise_name)
            exercise['videoId'] = video_id if video_id else None
        else:
            exercise['videoId'] = None


# def create_prompt(age, sex, weight, height, fitness_level, strength_goals, equipment, workout_days, workout_time, additional_goals, feedback_note):
#     """
#     Creates a detailed prompt based on user's profile to generate a personalized workout plan.
#     Instructs the AI to return the plan in a predefined JSON format.
#     """
#     equipment_list = ', '.join(equipment) if equipment else 'None'
#     strength_goals_list = ', '.join(strength_goals) if strength_goals else 'None'

#     prompt = (
#         f"Create a personalized weekly workout plan for the following user in strict JSON format. "
#         f"Ensure the JSON adheres exactly to the provided schema without any additional text or explanations.\n\n"
#         f"**User Profile:**\n"
#         f"- Age: {age}\n"
#         f"- Sex: {sex}\n"
#         f"- Weight: {weight} kg\n"
#         f"- Height: {height} cm\n"
#         f"- Fitness Level: {fitness_level}\n"
#         f"- Strength Goals: {strength_goals_list}\n"
#         f"- Additional Goals: {additional_goals}\n"
#         f"- Available Equipment: {equipment_list}\n"
#         f"- Workout Availability: {workout_time} minutes per session, {workout_days} days per week\n\n"
#         f"**Feedback:** {feedback_note}\n\n"
#         f"**Requirements:**\n"
#         f"1. Adjust the number of exercises, sets, and reps based on the user's available time.\n"
#         f"2. Incorporate cardio exercises using the available equipment or generic cardio equipment if specific ones are not available.\n"
#         f"3. Tailor the intensity and complexity of exercises based on the user's fitness level, age, and sex.\n"
#         f"4. Vary the workout plan weekly based on user feedback and progression.\n\n"
#         f"5. Present at least 4 exercises for each day of the week.\n\n"
#         f"6. Users with more time available will have more exercises or/and more sets/reps.\n\n"
#         f"7. If Feedback field is provided then change the workout plan accordingly.\n\n"
#         f"**Instructions for Each Exercise:**\n"
#         f"Provide detailed, step-by-step instructions on how to perform each exercise correctly and safely.\n\n"
#         f"**JSON Schema:**\n"
#         f"```json\n"
#         f"{{\n"
#         f"  \"workoutDays\": [\n"
#         f"    {{\n"
#         f"      \"day\": \"Day 1: Chest and Triceps\",\n"
#         f"      \"duration\": \"60 minutes\",\n"
#         f"      \"exercises\": [\n"
#         f"        {{\n"
#         f"          \"name\": \"Barbell Bench Press\",\n"
#         f"          \"setsReps\": \"3 sets of 8-12 reps\",\n"
#         f"          \"equipment\": \"Barbell, Bench\",\n"
#         f"          \"instructions\": \"Lie on the bench with your feet planted firmly on the ground. Grip the barbell slightly wider than shoulder-width apart. Lower the barbell to your chest while inhaling, then press it back up while exhaling. Maintain a steady pace and control throughout the movement.\"\n"
#         f"        }},\n"
#         f"        {{\n"
#         f"          \"name\": \"Tricep Pushdown\",\n"
#         f"          \"setsReps\": \"3 sets of 12-15 reps\",\n"
#         f"          \"equipment\": \"Cable Machine\",\n"
#         f"          \"instructions\": \"Attach a straight bar to the high pulley of the cable machine. Grasp the bar with an overhand grip, keeping your elbows close to your body. Push the bar down until your arms are fully extended, then slowly return to the starting position.\"\n"
#         f"        }}\n"
#         f"      ]\n"
#         f"    }},\n"
#         f"    {{\n"
#         f"      \"day\": \"Day 2: Back and Biceps\",\n"
#         f"      \"duration\": \"60 minutes\",\n"
#         f"      \"exercises\": [\n"
#         f"        {{\n"
#         f"          \"name\": \"Deadlifts\",\n"
#         f"          \"setsReps\": \"3 sets of 8-12 reps\",\n"
#         f"          \"equipment\": \"Barbell\",\n"
#         f"          \"instructions\": \"Stand with your feet shoulder-width apart, gripping the barbell with your hands shoulder-width apart. Keeping your back straight and your core engaged, lift the barbell off the ground. Stand up, squeezing your glutes and pushing your hips back. Lower the barbell to the starting position, keeping control throughout the entire range of motion. Repeat for the desired number of reps and sets.\"\n"
#         f"        }},\n"
#         f"        {{\n"
#         f"          \"name\": \"Bicep Curl\",\n"
#         f"          \"setsReps\": \"3 sets of 10-12 reps\",\n"
#         f"          \"equipment\": \"Dumbbells\",\n"
#         f"          \"instructions\": \"Stand with your feet shoulder-width apart, holding a dumbbell in each hand with your palms facing forward. Curl the dumbbells up towards your shoulders, keeping your upper arms still. Lower the dumbbells to the starting position, keeping control throughout the entire range of motion. Repeat for the desired number of reps and sets.\"\n"
#         f"        }}\n"
#         f"      ]\n"
#         f"    }}\n"
#         f"  ],\n"
#         f"  \"additionalTips\": [\n"
#         f"    \"Ensure proper form to prevent injuries.\",\n"
#         f"    \"Stay hydrated throughout your workouts.\"\n"
#         f"  ]\n"
#         f"}}\n"
#         f"```\n\n"
#         f"**Instructions:**\n"
#         f"1. **Provide only the JSON response without any additional explanations or text.**\n"
#         f"2. **Ensure the JSON is properly formatted and adheres strictly to the provided schema.**\n"
#         f"3. **Do not include any text before or after the JSON.**\n"
#         f"4. **Do not include markdown code blocks or triple backticks.**\n"
#         f"5. **If you need to mention anything, include it within the JSON as 'additionalTips'.**\n"
#     )

#     return prompt

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
        # Regular expression to find JSON object
        json_pattern = r'\{(?:[^{}]|(?R))*\}'
        matches = re.findall(json_pattern, text, re.DOTALL)

        if matches:
            # Return the first JSON object found
            return matches[0]
        else:
            return None
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
        replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
        if not replicate_api_token:
            logger.error("Replicate API token not found in environment variables.")
            return None

        os.environ["REPLICATE_API_TOKEN"] = replicate_api_token  # Set the environment variable

        client = replicate.Client(api_token=replicate_api_token, timeout=300)

        # Define the model name (Update with the correct model name)
        model_name = "meta/meta-llama-3-70b-instruct"

        # Define the inputs
        inputs = {
            "prompt": prompt,
            "temperature": 0.7,
            "max_new_tokens": 1500,  # Adjust as needed
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
                try:
                    modified_session = json.loads(json_content)
                except json.JSONDecodeError as e2:
                    logger.error(f"Failed to parse extracted JSON content: {str(e2)}")
                    raise ValueError("Failed to parse JSON content")
            else:
                logger.error("No JSON content found in AI output")
                raise ValueError("No JSON content found in AI output")


        # Check if 'workoutDays' exists and has at least one item
        if 'workoutDays' in modified_session and modified_session['workoutDays']:
            # Extract the first (and only) workout day
            workout_day = modified_session['workoutDays'][0]

            # If 'day' is missing, add it using the session_name
            if 'day' not in workout_day:
                workout_day['day'] = feedback_data['session_name']

            # Replace the entire modified_session with just the workout day
            modified_session = workout_day

        # Validate the modified session
        if validate_session(modified_session):
            # Assign video IDs to the exercises
            assign_video_ids_to_session(modified_session)
            return modified_session
        else:
            raise ValueError("Modified session JSON does not adhere to the required schema.")

    except:
        logger.error("Error processing feedback with AI", exc_info=True)
        return None


# def send_workout_plan_to_group(user, workout_plan):
#         """
#         Sends the workout plan to the user's group via Channels.

#         Args:
#             user: A User object.
#             workout_plan (dict): The workout plan data.
#         """
#         try:
#             channel_layer = get_channel_layer()
#             if channel_layer is None:
#                 logger.error("Channel layer is not configured.")
#                 return

#             group_name = f'workout_plan_{user.id}'

#             async_to_sync(channel_layer.group_send)(
#                 group_name,
#                 {
#                     'type': 'workout_plan_generated',
#                     'plan_data': workout_plan, 
#                 }
#             )
#             logger.info(f"Workout plan sent to group: {group_name}")
#         except Exception as e:
#             logger.error(f"Error sending workout plan to group: {e}", exc_info=True)
#             raise

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

    # Run the model using the Replicate Python client
    try:
        output = replicate.run(
            "meta/meta-llama-3-70b-instruct",  # Replace with your model identifier and version
            input={
                "prompt": prompt,
                "max_new_tokens": 3000,
                "temperature": 0.5
            }
        )
    except replicate.exceptions.ReplicateException as e:
        logger.error(f"Error during AI model invocation: {e}")
        raise Exception(f"AI model error: {e}")

    # The output might be a list of strings; concatenate them
    if isinstance(output, list):
        full_output = ''.join(output)
    else:
        full_output = output

    # Clean the output
    full_output = full_output.strip()

    # Remove any extra text before or after the JSON
    start_index = full_output.find('{')
    end_index = full_output.rfind('}') + 1  # Include the closing brace
    if start_index != -1 and end_index != -1:
        json_content = full_output[start_index:end_index]
        # Remove comments and extra whitespace
        json_content = remove_comments(json_content).strip()
        try:
            workout_plan_data = json.loads(json_content)
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {e}")
            logger.debug(f"JSON content attempted to parse: {json_content}")
            raise ValueError(f"Error parsing JSON: {e}")
    else:
        logger.error("No JSON content found in AI output")
        logger.debug(f"Full AI output: {full_output}")
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

def assign_video_ids_to_exercises(workout_plan_data):
    for day in workout_plan_data.get('workoutDays', []):
        for exercise in day.get('exercises', []):
            exercise_name = exercise.get('name')
            if exercise_name:
                video_id = get_youtube_video_id(exercise_name)
                exercise['videoId'] = video_id if video_id else None
            else:
                exercise['videoId'] = None

# api/services.py

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

