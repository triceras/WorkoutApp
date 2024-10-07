# backend/api/tasks.py

from celery import shared_task, Celery
from celery.schedules import crontab
from celery.exceptions import MaxRetriesExceededError
from django.contrib.auth import get_user_model
from .models import WorkoutPlan, User
from .services import generate_workout_plan, ReplicateServiceUnavailable
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import os

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=1)
def generate_workout_plan_task(self, user_id):
    try:
        logger.info(f"generate_workout_plan_task received user ID: {user_id}")
        # Retrieve the user instance
        user = User.objects.get(id=user_id)
        
        # Log user instance
        logger.info(f"User instance retrieved: {user}")
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

        # Log the generated workout plan data
        logger.info(f"Workout Plan Data: {workout_plan_data}")

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
