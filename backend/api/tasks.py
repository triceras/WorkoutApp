# backend/api/tasks.py

from celery import shared_task
from django.contrib.auth import get_user_model
from .models import WorkoutPlan
from .services import generate_workout_plan
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import os

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def generate_workout_plan_task(user_id):
    try:
        # Retrieve the user instance
        user = User.objects.get(id=user_id)

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

        # Create or update the WorkoutPlan instance
        workout_plan, created = WorkoutPlan.objects.update_or_create(
            user=user,
            defaults={'plan_data': workout_plan_data},
        )

        logger.info(f"Workout plan generated for user {user.username}.")

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
                'plan_data': workout_plan.plan_data,  # Corrected attribute access
            }
        )
        logger.info(f"Workout plan sent to group: {group_name}")

    except User.DoesNotExist:
        logger.error(f"User with id {user_id} does not exist.")
    except Exception as e:
        logger.error(f"Error generating workout plan for user_id {user_id}: {str(e)}", exc_info=True)
