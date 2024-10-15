# api/tasks.py

import json
from celery import shared_task
from django.contrib.auth import get_user_model
from .models import WorkoutPlan, TrainingSession
from .services import (
    generate_workout_plan,
    process_feedback_with_ai,
    ReplicateServiceUnavailable,
    get_latest_feedback
    # Add other service functions as needed
)
from .helpers import (
    send_workout_plan_to_group
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import asyncio

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=3, default_retry_delay=60)  # Configure retries
def generate_workout_plan_task(self, user_id):
    """
    Celery task to generate a workout plan for a user.
    """
    try:
        user = User.objects.get(id=user_id)
        logger.info(f"Generating workout plan for user ID: {user.id}, username: {user.username}")

        # Generate the workout plan using the service function
        workout_plan_data = generate_workout_plan(user)

        if not workout_plan_data:
            logger.error(f"No workout plan data returned for user {user.username}")
            raise self.retry(exc=ValueError("No workout plan data returned"), countdown=60)

        logger.info(f"Workout plan generated for user {user.username}: {workout_plan_data}")
        return workout_plan_data  # Return the workout plan data

    except ReplicateServiceUnavailable as e:
        logger.error(f"Replicate service unavailable for user_id {user_id}: {e}")
        try:
            self.retry(exc=e, countdown=60)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for user_id {user_id}")

    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} does not exist.")

    except Exception as e:
        logger.error(f"Unexpected error in generate_workout_plan_task: {e}", exc_info=True)
        try:
            self.retry(exc=e, countdown=60)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for user_id {user_id}")

    return None 

@shared_task(bind=True, max_retries=1, time_limit=600, soft_time_limit=550)
def process_feedback_submission_task(self, training_session_id):
    """
    Celery task to process user feedback and update the workout plan accordingly.
    """
    logger.info(f"Task {self.request.id} received for Training Session ID {training_session_id}")
    try:
        # Fetch the TrainingSession instance
        training_session = TrainingSession.objects.get(id=training_session_id)
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
            logger.error(f"Session '{training_session.session_name}' not found in workout plan.")
            return

        # Save the updated workout plan
        workout_plan.plan_data['workoutDays'] = workout_days
        workout_plan.save()

        logger.info(f"Workout plan updated for user {user.username}")

    except TrainingSession.DoesNotExist:
        logger.error(f"TrainingSession with ID {training_session_id} does not exist.")
    except Exception as e:
        logger.error(f"Unexpected error in processing feedback: {e}", exc_info=True)


@shared_task
def sanitize_and_cache_youtube_video_id(exercise_name, video_id):
    """
    Helper Celery task to sanitize cache key and store the YouTube video ID.
    """
    sanitized_name = sanitize_cache_key(exercise_name.lower())
    cache_key = f"youtube_video_id_{sanitized_name}"
    try:
        cache.set(cache_key, video_id, timeout=60*60*24*7)  # Cache for 7 days
        logger.debug(f"Cached YouTube video ID for exercise '{exercise_name}': {video_id}")
    except Exception as e:
        logger.error(f"Failed to cache YouTube video ID for '{exercise_name}': {e}")
