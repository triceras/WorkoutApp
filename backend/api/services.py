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
    # Directly access User fields
    age = user.age
    weight = user.weight
    height = user.height
    fitness_level = user.fitness_level
    strength_goals = user.strength_goals
    equipment = user.equipment
    workout_days = user.workout_days
    workout_time = user.workout_time
    additional_goals = user.additional_goals
    
    # Log the additional_goals
    logger.info(f"Additional Goals in generate_workout_plan: {additional_goals}")


    # Log user data for debugging
    logger.info(f"Generating workout plan for user: {user.username}")
    logger.info(f"Age: {age}, Weight: {weight}, Height: {height}")
    logger.info(f"Fitness Level: {fitness_level}, Strength Goals: {strength_goals}")
    logger.info(f"Equipment: {equipment}, Workout Days: {workout_days}, Workout Time: {workout_time}")
    logger.info(f"Additional Goals: {additional_goals}")


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
        'additional_goals': additional_goals,
    }
    prompt = create_prompt(user_data)
    logger.info(f"AI Prompt: {prompt}")

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

        # Log the AI response
        logger.info(f"Replicate AI Output: {output}")

        # Parse the AI response
        workout_plan = parse_ai_response(output)

        return workout_plan

    except replicate.ClientError as e:
        logger.error(f"Replicate API Client Error: {e}", exc_info=True)
    except replicate.APIError as e:
        logger.error(f"Replicate API Error: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"Unexpected error generating workout plan: {e}", exc_info=True)
        return None

def create_prompt(user_data):
    prompt = (
        f"Create a personalized weekly workout plan for the following user:\n"
        f"- Age: {user_data.get('age')}\n"
        f"- Weight: {user_data.get('weight')} kg\n"
        f"- Height: {user_data.get('height')} cm\n"
        f"- Fitness Level: {user_data.get('fitness_level')}\n"
        f"- Strength Goals: {user_data.get('strength_goals')}\n"
        f"- Additional Goals: {user_data.get('additional_goals')}\n"
        f"- Available Equipment: {user_data.get('equipment')}\n"
        f"- Workout Time Availability: {user_data.get('workout_time')} minutes per session, {user_data.get('workout_days')} days per week\n\n"
        f"**Important:** Ensure that the workout plan specifically incorporates the additional goals mentioned above. For example, include kettlebell exercises three times a week and jump rope sessions as per the user's additional goals.\n\n"
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
