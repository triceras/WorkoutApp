# backend/api/tasks.py

import json
from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import WorkoutPlan, TrainingSession
from .services import generate_workout_plan
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=3)
def generate_workout_plan_task(self, user_id):
    """
    Celery task to generate a workout plan for a user with task locking.
    """
    logger.info(f"Task started: generate_workout_plan_task for user_id {user_id}")
    
    lock_id = f'workout_plan_task_{user_id}'
    lock_timeout = 60 * 10  # 10 minutes
    
    try:
        # Try to acquire lock
        if not cache.add(lock_id, 'true', lock_timeout):
            logger.info(f"Task already running for user_id {user_id}")
            return None
            
        # Main task logic
        try:
            user = User.objects.get(id=user_id)
            logger.info(f"Generating workout plan for user ID: {user.id}, username: {user.username}")
        except User.DoesNotExist:
            logger.error(f"User with id {user_id} does not exist.")
            return None

        # Generate the workout plan using the service function
        plan = generate_workout_plan(user.id)

        if not plan:
            logger.error(f"No workout plan data returned for user {user.username}")
            raise ValueError("No workout plan data returned")

        with transaction.atomic():
            workout_plan, created = WorkoutPlan.objects.get_or_create(
                user=user,
                defaults={'plan_data': plan.plan_data}
            )

            if not created:
                workout_plan.plan_data = plan.plan_data
                workout_plan.save()
                logger.info(f"Workout plan updated for user {user.username}")
            else:
                logger.info(f"Workout plan created for user {user.username}")
                
            # Emit WebSocket event with the correct 'type'
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'workout_plan_{user.id}',
                {
                    'type': 'workout_plan_generated',  # Must match consumer handler
                    'plan_id': str(workout_plan.id),
                    'plan_data': workout_plan.plan_data.get('workoutDays', []),
                    'additional_tips': workout_plan.plan_data.get('additionalTips', []),
                    'created_at': workout_plan.created_at.isoformat(),
                }
            )
            logger.info(f"WebSocket event sent for user {user.username}")
            
            # Return a serializable dictionary
            return {
                'plan_id': str(workout_plan.id),
                'plan_data': workout_plan.plan_data.get('workoutDays', []),
                'additional_tips': workout_plan.plan_data.get('additionalTips', []),
                'created_at': workout_plan.created_at.isoformat(),
            }

    except Exception as e:
        logger.error(f"Error in generate_workout_plan_task: {e}", exc_info=True)
        try:
            self.retry(exc=e, countdown=60)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for user_id {user_id}")
        return None
        
    finally:
        # Release lock
        cache.delete(lock_id)
        logger.info(f"Lock released for user_id {user_id}")


@shared_task(bind=True, max_retries=3, default_retry_delay=60, time_limit=600, soft_time_limit=550)
def process_feedback_submission_task(self, training_session_id):
    """
    Celery task to process user feedback and update the workout plan accordingly.
    """
    logger.info(f"Task {self.request.id} received for Training Session ID {training_session_id}")
    try:
        # Fetch the TrainingSession instance
        training_session = TrainingSession.objects.select_related('workout_plan').get(id=training_session_id)
        user = training_session.user

        logger.info(f"Processing feedback for user {user.username}, Session ID {training_session_id}")
        logger.debug(f"Emoji Feedback: {training_session.emoji_feedback}")
        logger.debug(f"Comments: {training_session.comments}")

        # Prepare data for AI model
        feedback_data = {
            "user": {
                "username": user.username,
                "fitness_level": user.fitness_level,
                "strength_goals": [goal.name for goal in user.strength_goals.all()],
                "equipment": [eq.name for eq in user.equipment.all()],
                "workout_days": user.workout_days,
                "workout_time": user.workout_time,
                "additional_goals": user.additional_goals,
                "age": user.age,
                "sex": user.sex,
                "weight": user.weight,
                "height": user.height,
            },
            "workout_plan": training_session.workout_plan.plan_data,  # Pass the current workout plan
            "session_name": training_session.session_name,
            "emoji_feedback": training_session.emoji_feedback,
            "comments": training_session.comments.strip() if training_session.comments else '',
        }

        # Determine if the session needs modification
        modify_specific_session = training_session.emoji_feedback in [0, 1, 2]  # Terrible, Very Bad, Bad

        logger.debug(f"Modify Specific Session: {modify_specific_session}")
        if not modify_specific_session:
            logger.info(f"No modification needed for user {user.username} based on feedback.")
            return

        # Get the latest feedback note
        feedback_note = get_latest_feedback(user)
        feedback_data['feedback_note'] = feedback_note

        logger.debug(f"Feedback Note: {feedback_note}")

        # Process feedback with AI to modify the session
        modified_session = process_feedback_with_ai(feedback_data, modify_specific_session=True)
        if not modified_session:
            logger.error(f"Failed to generate modified session for user {user.username}")
            return
        else:
            logger.debug(f"Modified session: {modified_session}")

        # Update the WorkoutPlan
        workout_plan = training_session.workout_plan
        workout_days = workout_plan.plan_data.get('workoutDays', [])

        # Find the session to modify
        session_found = False
        for idx, day in enumerate(workout_days):
            if day['day'] == training_session.session_name:
                workout_days[idx] = modified_session
                session_found = True
                break

        if not session_found:
            logger.error(f"Session '{training_session.session_name}' not found in workout plan for user {user.username}.")
            return

        # Save the updated workout plan
        workout_plan.plan_data['workoutDays'] = workout_days
        workout_plan.save()

        logger.info(f"Workout plan updated for user {user.username}")

        # **Send the updated workout plan to the user's group via WebSocket**
        try:
            send_workout_plan_to_group(user, workout_plan.plan_data)
            logger.info(f"Sent updated workout plan to user {user.username} via WebSocket.")
        except Exception as e:
            logger.error(f"Error sending updated workout plan to user {user.username}: {e}", exc_info=True)

    except TrainingSession.DoesNotExist:
        logger.error(f"TrainingSession with ID {training_session_id} does not exist.")
    except Exception as e:
        logger.error(f"Unexpected error in processing feedback for Training Session ID {training_session_id}: {e}", exc_info=True)
        try:
            self.retry(exc=e, countdown=60)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for processing feedback of Training Session ID {training_session_id}")


# @shared_task(bind=True, max_retries=3, default_retry_delay=60)
# def generate_backgrounds_task(self, user_id):
#     """
#     Celery task to generate background images for a user's workout plan using Replicate's Flux model.
#     """
#     try:
#         user = User.objects.get(id=user_id)
#         workout_plan = WorkoutPlan.objects.get(user=user)

#         logger.info(f"Generating background images for user {user.username} using Replicate's Flux model.")

#         # Initialize the Replicate client
#         replicate_client = replicate.Client(api_token=settings.REPLICATE_API_TOKEN)

#         # Define the correct model identifier with version
#         model_identifier = "black-forest-labs/flux-1.1-pro"  # Replace with the actual version

#         # Prepare prompts for dashboard and workout plan backgrounds
#         prompt_dashboard = "A modern and sleek fitness dashboard background with abstract shapes and vibrant colors."
#         prompt_workoutplan = "A dynamic workout plan background featuring gym equipment and motivational elements."

#         # Generate dashboard background using replicate.run()
#         logger.info(f"Generating dashboard background for user {user.username}.")
#         dashboard_output = replicate.run(
#             model_identifier,
#             input={"prompt": prompt_dashboard}
#         )
#         dashboard_background_url = dashboard_output  # Assuming the model returns a single URL

#         # Generate workout plan background using replicate.run()
#         logger.info(f"Generating workout plan background for user {user.username}.")
#         workoutplan_output = replicate.run(
#             model_identifier,
#             input={"prompt": prompt_workoutplan}
#         )
#         workoutplan_background_url = workoutplan_output  # Assuming the model returns a single URL

#         # Update the WorkoutPlan instance with the generated images
#         workout_plan.dashboard_background = dashboard_background_url
#         workout_plan.workoutplan_background = workoutplan_background_url
#         workout_plan.save()

#         logger.info(f"Background images generated and assigned for user {user.username}.")

#     except User.DoesNotExist:
#         logger.error(f"User with id {user_id} does not exist.")
#     except WorkoutPlan.DoesNotExist:
#         logger.error(f"WorkoutPlan for user id {user_id} does not exist.")
#     except replicate.exceptions.ReplicateException as e:
#         logger.error(f"Replicate API error: {e}", exc_info=True)
#         try:
#             self.retry(exc=e)
#         except self.MaxRetriesExceededError:
#             logger.error(f"Max retries exceeded for generating backgrounds for user id {user_id}")
#     except Exception as e:
#         logger.error(f"Unexpected error generating backgrounds for user id {user_id}: {e}", exc_info=True)
#         try:
#             self.retry(exc=e)
#         except self.MaxRetriesExceededError:
#             logger.error(f"Max retries exceeded for generating backgrounds for user id {user_id}")


def send_workout_plan_to_group(user, plan_data):
    """
    Utility function to send the workout plan to the user's WebSocket group.
    """
    channel_layer = get_channel_layer()
    group_name = f'workout_plan_{user.id}'
    message = {
        'type': 'workout_plan_generated',  # Must match consumer handler
        'plan_id': str(user.workoutplan.id),  # Assuming user has a related workoutplan
        'plan_data': plan_data.get('workoutDays', []),
        'additional_tips': plan_data.get('additionalTips', []),
        'created_at': user.workoutplan.created_at.isoformat(),
    }
    async_to_sync(channel_layer.group_send)(group_name, message)
    logger.info(f"WebSocket event sent for user {user.username}: {message}")
