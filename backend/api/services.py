# api/services.py

import os
import replicate
import logging
import json
import requests
from django.conf import settings
from .models import TrainingSession, WorkoutPlan

logger = logging.getLogger(__name__)

class ReplicateServiceUnavailable(Exception):
    """Exception raised when the Replicate service is unavailable."""
    pass

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
    strength_goals = user.strength_goals.all().values_list('name', flat=True)
    equipment = user.equipment.all().values_list('name', flat=True)
    workout_days = user.workout_days
    workout_time = user.workout_time
    additional_goals = user.additional_goals

    # Log user data for debugging
    logger.info(f"Generating workout plan for user: {user.username}")
    logger.info(f"Age: {age}, Sex: {sex}, Weight: {weight} kg, Height: {height} cm")
    logger.info(f"Fitness Level: {fitness_level}")
    logger.info(f"Strength Goals: {', '.join(strength_goals)}")
    logger.info(f"Equipment: {', '.join(equipment) if equipment else 'None'}")
    logger.info(f"Workout Days: {workout_days} days/week, Workout Time: {workout_time} minutes/session")
    logger.info(f"Additional Goals: {additional_goals}")

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
    logger.info(f"AI Prompt: {prompt}")

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
            'temperature': 0.7,
            'max_new_tokens': 2500,  # Adjust as needed based on response length requirements
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

        # Save the workout plan to the database
        WorkoutPlan.objects.create(
            user=user,
            plan_data=workout_plan
        )
        logger.info(f"Workout plan successfully generated and saved for user: {user.username}")

        return workout_plan

    except replicate.ClientError as e:
        logger.error(f"Replicate API Client Error: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Replicate API Client Error: {e}")
    except replicate.APIError as e:
        logger.error(f"Replicate API Error: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Replicate API Error: {e}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while calling Replicate API: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Network error: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding AI response: {e}", exc_info=True)
        raise ReplicateServiceUnavailable(f"Invalid response format from AI: {e}")
    except Exception as e:
        logger.error(f"Unexpected error generating workout plan: {e}", exc_info=True)
        raise  # Re-raise the exception to be handled by the calling function

def create_prompt(age, sex, weight, height, fitness_level, strength_goals, equipment, workout_days, workout_time, additional_goals, feedback_note):
    """
    Creates a detailed prompt based on user's profile to generate a personalized workout plan.
    Incorporates user feedback to adjust the next week's plan.

    Args:
        age (int): User's age.
        sex (str): User's sex.
        weight (float): User's weight in kg.
        height (float): User's height in cm.
        fitness_level (str): User's fitness level (experience).
        strength_goals (list): List of user's strength goals.
        equipment (list): List of available equipment.
        workout_days (int): Number of workout days per week.
        workout_time (int): Available time per workout session in minutes.
        additional_goals (str): Any additional goals specified by the user.
        feedback_note (str): Note based on user's latest feedback.

    Returns:
        str: The formatted prompt for the AI model.
    """
    equipment_list = ', '.join(equipment) if equipment else 'None'
    strength_goals_list = ', '.join(strength_goals) if strength_goals else 'None'

    prompt = (
        f"Create a personalized weekly workout plan for the following user:\n"
        f"- **Age:** {age}\n"
        f"- **Sex:** {sex}\n"
        f"- **Weight:** {weight} kg\n"
        f"- **Height:** {height} cm\n"
        f"- **Fitness Level:** {fitness_level}\n"
        f"- **Strength Goals:** {strength_goals_list}\n"
        f"- **Additional Goals:** {additional_goals}\n"
        f"- **Available Equipment:** {equipment_list}\n"
        f"- **Workout Availability:** {workout_time} minutes per session, {workout_days} days per week\n\n"
        f"**Feedback:** {feedback_note}\n\n"
        f"**Requirements:**\n"
        f"1. Adjust the number of exercises, sets, and reps based on the user's available time.\n"
        f"2. Incorporate cardio exercises using the available equipment (e.g., rowing machine, treadmill, ergo bike) or generic cardio equipment if specific ones are not available.\n"
        f"3. Tailor the intensity and complexity of exercises based on the user's fitness level, age, and sex.\n"
        f"4. Vary the workout plan weekly based on user feedback and progression.\n\n"
        f"**Instructions for Each Exercise:**\n"
        f"Ensure that each exercise includes a detailed, step-by-step explanation on how to perform it correctly and safely.\n\n"
        f"**Format:** Provide the plan in Markdown with clear sections for each day, including:\n"
        f"- **Exercise Name**\n"
        f"- **Sets and Reps**\n"
        f"- **Equipment Required**\n"
        f"- **Instructions** (detailed execution steps)\n\n"
        f"Ensure the plan is balanced, targeting different muscle groups, and includes rest days as necessary."
    )

    return prompt

def parse_ai_response(ai_response):
    """
    Parses the AI response to extract the workout plan.

    Args:
        ai_response (str or list): The raw output from the AI model.

    Returns:
        dict: A dictionary containing the parsed workout plan.
    """
    if isinstance(ai_response, list):
        # Join the list of strings if the response is a list
        workout_plan_text = ''.join(ai_response).strip()
    elif isinstance(ai_response, str):
        workout_plan_text = ai_response.strip()
    else:
        workout_plan_text = 'No workout plan generated.'

    # Optionally, you can implement more sophisticated parsing here
    # For now, we'll assume the AI returns a Markdown-formatted string

    return {'plan': workout_plan_text}

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
