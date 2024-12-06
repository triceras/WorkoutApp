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

@shared_task
def generate_workout_plan_task(user_id):
    """
    Celery task to generate a workout plan for a user.
    """
    logger.info(f"Starting workout plan generation for user_id {user_id}")
    
    # Get a lock for this user
    lock_id = f'workout_plan_lock_{user_id}'
    lock = cache.lock(lock_id, timeout=300)  # 5 minutes timeout
    
    try:
        # Try to acquire the lock
        have_lock = lock.acquire(blocking=False)
        if not have_lock:
            logger.warning(f"Could not acquire lock for user_id {user_id}")
            return
        
        logger.info(f"Lock acquired for user_id {user_id}")
        
        try:
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            # Generate the workout plan
            plan = generate_workout_plan(user.id)
            
            # Send the workout plan to the user via WebSocket
            if plan and plan.plan_data:
                send_workout_plan_to_group(user, plan.plan_data)
                logger.info(f"Workout plan sent to user {user_id}")
            else:
                logger.error(f"No workout plan data generated for user {user_id}")
                
        except User.DoesNotExist:
            logger.error(f"User {user_id} does not exist")
        except Exception as e:
            logger.error(f"Error in generate_workout_plan_task: {str(e)}", exc_info=True)
            # Send error message to user via WebSocket
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'user_{user_id}',
                    {
                        'type': 'workout_message',
                        'message_type': 'error',
                        'message': 'Failed to generate workout plan. Please try again.',
                        'user_id': str(user_id)
                    }
                )
            except Exception as ws_error:
                logger.error(f"Error sending WebSocket error message: {str(ws_error)}")
    finally:
        if 'lock' in locals() and have_lock:
            lock.release()
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


def send_workout_plan_to_group(user, plan_data):
    """
    Send workout plan data to the user's WebSocket group.
    """
    try:
        # Get the latest workout plan for the user
        workout_plan = WorkoutPlan.objects.filter(user=user).latest('created_at')
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user.id}",
            {
                'type': 'workout_message',
                'message_type': 'workout_plan_completed',
                'user_id': user.id,
                'plan_id': str(workout_plan.id),
                'plan_data': plan_data
            }
        )
        logger.info(f"Sent workout plan to user {user.id}")
    except Exception as e:
        logger.error(f"Error sending workout plan to group: {str(e)}", exc_info=True)
        # Send error message to user
        async_to_sync(channel_layer.group_send)(
            f"user_{user.id}",
            {
                'type': 'workout_message',
                'message_type': 'error',
                'user_id': user.id,
                'message': 'Error delivering workout plan'
            }
        )
