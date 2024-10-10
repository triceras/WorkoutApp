# backend/api/tasks.py

import json  # Ensure json is imported
from celery import shared_task, Celery
from celery.schedules import crontab
from celery.exceptions import MaxRetriesExceededError
from django.contrib.auth import get_user_model
from .models import WorkoutPlan, User, TrainingSession
from .services import (
    generate_workout_plan,
    create_prompt,
    process_feedback_with_ai,
    validate_workout_plan,
    send_workout_plan_to_group,
    ReplicateServiceUnavailable
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from jsonschema import validate, ValidationError
import logging
import os
import requests
import replicate


logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=1)
def generate_workout_plan_task(self, user_id):
    try:
        logger.info(f"generate_workout_plan_task received user ID: {user_id}")
        # Retrieve the user instance
        user = User.objects.get(id=user_id)
        
        # Log user instance
        logger.info(f"User instance retrieved: {user.username}")
        logger.info(f"Sex: {user.sex}")

        # Load the Replicate API token from environment variables
        replicate_token = os.getenv('REPLICATE_API_TOKEN')
        if not replicate_token:
            logger.error("Replicate API token not found.")
            return None
        else:
            logger.info("Replicate API token successfully loaded.")

        # Generate the workout plan using the service function
        workout_plan_data = generate_workout_plan(user)
        if workout_plan_data is None:
            logger.error(f"Failed to generate workout plan for user {user.username}.")
            return

        # Verify that workout_plan_data adheres to the expected JSON structure
        if not isinstance(workout_plan_data, dict):
            logger.error(f"Workout plan data is not a dictionary: {workout_plan_data}")
            raise ValueError("Invalid workout plan data format.")

        # Log the generated workout plan data
        logger.info(f"Workout Plan Data: {json.dumps(workout_plan_data, indent=2)}")

        # Create or update the WorkoutPlan instance
        workout_plan, created = WorkoutPlan.objects.update_or_create(
            user=user,
            defaults={'plan_data': workout_plan_data},
        )

        logger.info(f"Workout plan {'created' if created else 'updated'} for user {user.username}.")

        # Retrieve the channel layer
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.error("Channel layer is not configured.")
            return

        # Define the group name based on the user's ID
        group_name = f'workout_plan_{user.id}'

        # Send the workout plan data to the specified group via Channels
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'workout_plan_generated',
                'plan_data': workout_plan.plan_data, 
            }
        )
        logger.info(f"Workout plan sent to group: {group_name}")

    except ReplicateServiceUnavailable as e:
        logger.error(f"Replicate service unavailable for user_id {user_id}: {e}")
        try:
            # Retry the task after a delay (e.g., 60 seconds)
            self.retry(exc=e, countdown=60)
        except MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for user_id {user_id}")
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} does not exist.")
    except ValueError as ve:
        logger.error(f"ValueError: {ve}", exc_info=True)
    except Exception as e:
        logger.error(f"Error generating workout plan for user_id {user_id}: {str(e)}", exc_info=True)

app = Celery('myfitnessapp')

@shared_task
def update_weekly_workout_plans():
    users = User.objects.all()
    for user in users:
        # Trigger workout plan generation for each user
        generate_workout_plan_task.delay(user.id)

# In your Celery configuration, add the periodic task
app.conf.beat_schedule = {
    'update-weekly-workout-plans-every-monday': {
        'task': 'api.tasks.update_weekly_workout_plans',
        'schedule': crontab(day_of_week=1, hour=0, minute=0),  # Every Monday at midnight
    },
}

# Process Feedback
@shared_task(bind=True, max_retries=1, time_limit=600, soft_time_limit=550)
def process_feedback_submission_task(self, training_session_id):
    logger.info(f"Task {self.request.id} received for Training Session ID {training_session_id}")
    try:
        # Fetch the TrainingSession instance
        training_session = TrainingSession.objects.get(id=training_session_id)
        user = training_session.workout_plan.user
        week_number = training_session.workout_plan.week_number
        emoji_reaction = training_session.emoji_feedback
        comments = training_session.comments or ""

        logger.info(f"Processing feedback for user {user.username}, Session ID {training_session_id}")

        # Extract user profile data
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

        # Prepare feedback note
        feedback_note = comments  # or use feedback_data.get("comments", "")

        # Generate the prompt
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

        # Prepare data for AI model
        feedback_data = {
            "user_id": user.id,
            "week_number": week_number,
            "emoji_reaction": emoji_reaction,
            "comments": comments,
            "prompt": prompt
        }

        # Process feedback with AI using services.py
        modified_workout_plan = process_feedback_with_ai(feedback_data)

        if not modified_workout_plan:
            logger.error(f"Failed to generate workout plan for user {user.username}")
            return

        # Update or create the WorkoutPlan
        workout_plan, created = WorkoutPlan.objects.update_or_create(
            user=user,
            week_number=week_number,
            defaults={"plan_data": modified_workout_plan}
        )
        if created:
            logger.info(f"Workout plan created for user {user.username}, Week {week_number}")
        else:
            logger.info(f"Workout plan updated for user {user.username}, Week {week_number}")

        # Send the workout plan to the user via Channels
        send_workout_plan_to_group(user, modified_workout_plan)

    except TrainingSession.DoesNotExist:
        logger.error(f"TrainingSession with ID {training_session_id} does not exist.")
    except ReplicateServiceUnavailable as e:
        logger.error(f"Replicate service unavailable: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in processing feedback: {e}", exc_info=True)
