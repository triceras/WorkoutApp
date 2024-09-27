# api/services.py

import os
import replicate
import logging

logger = logging.getLogger(__name__)

def generate_workout_plan(user):
    """
    Generate a personalized workout plan using the Replicate API and the specified model.

    Args:
        user: A User object containing user information.

    Returns:
        dict: A dictionary containing the workout plan.
    """
    if not hasattr(user, 'userprofile'):
        # Handle the case where UserProfile doesn't exist
        # You might create a new UserProfile or return an error
        logger.error("UserProfile does not exist for this user.")
        return None
    
    # Access UserProfile attributes
    user_profile = user.userprofile
    age = user_profile.age
    weight = user_profile.weight
    height = user_profile.height
    fitness_level = user_profile.fitness_level
    strength_goals = user_profile.strength_goals
    equipment = user_profile.equipment
    workout_days = user_profile.workout_days
    workout_time = user_profile.workout_time

    # Create the prompt
    user_data = {
        'age': age,
        'weight': weight,
        'height': height,
        'fitness_level': fitness_level,
        'strength_goals': strength_goals,
        'equipment': equipment,
        'workout_days': workout_days,
        'workout_time': workout_time,
    }
    prompt = create_prompt(user_data)

    try:
        # Initialize Replicate client with your API token
        replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
        if not replicate_api_token:
            logger.error("Replicate API token not found.")
            return None

        client = replicate.Client(api_token=replicate_api_token)

        # Use the accessible model
        model_version = "meta/meta-llama-3-70b-instruct"

        # Set the input parameters for the model
        inputs = {
            'prompt': prompt,
            'temperature': 0.7,
            'max_new_tokens': 2000,  # Adjust as needed
        }

        # Run the model prediction
        output = client.run(
            model_version,
            input=inputs,
        )

        # Parse the AI response
        workout_plan = parse_ai_response(output)

        return workout_plan

    except Exception as e:
        logger.error(f"Error generating workout plan: {str(e)}", exc_info=True)
        return None

def create_prompt(user_data):
    """
    Create a prompt for the AI model based on user data.

    Args:
        user_data (dict): User information.

    Returns:
        str: The prompt string.
    """
    prompt = (
        f"Create a personalized weekly workout plan for the following user:\n"
        f"- Age: {user_data.get('age')}\n"
        f"- Weight: {user_data.get('weight')} kg\n"
        f"- Height: {user_data.get('height')} cm\n"
        f"- Fitness Level: {user_data.get('fitness_level')}\n"
        f"- Strength Goals: {user_data.get('strength_goals')}\n"
        f"- Available Equipment: {user_data.get('equipment')}\n"
        f"- Workout Time Availability: {user_data.get('workout_time')} minutes per session, {user_data.get('workout_days')} days per week\n\n"
        f"Please provide a detailed workout plan including exercises, sets, reps, and any necessary instructions."
    )
    return prompt


def parse_ai_response(ai_response):
    if isinstance(ai_response, list):
        # Join the list of strings
        workout_plan_text = ''.join(ai_response).strip()
    elif isinstance(ai_response, str):
        workout_plan_text = ai_response.strip()
    else:
        workout_plan_text = 'No workout plan generated.'

    return {'plan': workout_plan_text}

