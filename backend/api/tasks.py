# backend/api/tasks.py

import json
from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from .models import WorkoutPlan, TrainingSession
from .services import generate_workout_plan, generate_profile_picture
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)
User = get_user_model()

def format_json_log(data):
    """Helper function to format JSON data for logging"""
    try:
        return json.dumps(data, indent=2, ensure_ascii=False)
    except Exception as e:
        return str(data)

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
                # Log the generated plan in a formatted way
                logger.info(f"Generated workout plan for user {user_id}:\n{format_json_log(plan.plan_data)}")
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

        # Log feedback data in a formatted way
        logger.info(f"Feedback data:\n{format_json_log(feedback_data)}")

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
            logger.debug(f"Modified session: {format_json_log(modified_session)}")

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


def get_latest_feedback(user):
    """
    Get the latest feedback from the user's training sessions.
    Returns a string summarizing recent feedback patterns.
    """
    recent_sessions = TrainingSession.objects.filter(
        user=user
    ).order_by('-date')[:5]  # Get last 5 sessions

    if not recent_sessions:
        return "No previous feedback available."

    feedback_summary = []
    for session in recent_sessions:
        if session.comments:
            feedback_summary.append(f"Session '{session.session_name}': {session.comments}")

    return " | ".join(feedback_summary) if feedback_summary else "No detailed feedback in recent sessions."


def process_feedback_with_ai(feedback_data, modify_specific_session=False):
    """
    Process feedback using AI to modify the workout plan.
    Returns modified session or None if processing fails.
    """
    try:
        # Log input data
        logger.info(f"Processing feedback with AI:\n{format_json_log(feedback_data)}")
        
        session_name = feedback_data.get('session_name')
        comments = feedback_data.get('comments', '').lower()
        workout_plan = feedback_data.get('workout_plan', {})
        
        # Find the specific session in the workout plan
        workout_days = workout_plan.get('workoutDays', [])
        target_session = None
        
        for day in workout_days:
            if day.get('day') == session_name:
                target_session = day.copy()
                break
        
        if not target_session:
            logger.error(f"Session {session_name} not found in workout plan")
            return None
            
        # Log target session before modification
        logger.debug(f"Target session before modification:\n{format_json_log(target_session)}")
        
        # Simple exercise replacement logic based on comments
        exercises = target_session.get('exercises', [])
        modified_exercises = []
        
        for exercise in exercises:
            # Example: If user mentions replacing an exercise
            if f"replace {exercise['name'].lower()}" in comments:
                # This is a simplified example - in production, you'd want to use
                # a more sophisticated AI model to choose appropriate replacements
                alternative_exercises = {
                    'push-ups': {'name': 'Push-Ups', 'sets': 3, 'reps': 12},
                    'squats': {'name': 'Bodyweight Squats', 'sets': 3, 'reps': 15},
                    'dumbbell rows': {'name': 'Push-Ups', 'sets': 3, 'reps': 12},
                }
                
                # For this example, we'll replace with push-ups
                replacement = alternative_exercises.get('push-ups').copy()
                replacement['exercise_id'] = exercise.get('exercise_id')
                modified_exercises.append(replacement)
                
                # Log exercise replacement
                logger.info(f"Replacing exercise:\nOld: {format_json_log(exercise)}\nNew: {format_json_log(replacement)}")
            else:
                modified_exercises.append(exercise)
        
        target_session['exercises'] = modified_exercises
        
        # Log final modified session
        logger.info(f"Final modified session:\n{format_json_log(target_session)}")
        
        return target_session
        
    except Exception as e:
        logger.error(f"Error processing feedback with AI: {str(e)}", exc_info=True)
        return None


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


@shared_task
def generate_profile_picture_task(user_id):
    """
    Celery task to generate a profile picture for a user.
    """
    logger.info(f"Starting profile picture generation task for user_id {user_id}")
    
    try:
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        from .services import generate_profile_picture
        success = generate_profile_picture(user)
        
        if success:
            logger.info(f"Successfully generated profile picture for user {user_id}")
            # Notify the user via WebSocket that their profile picture is ready
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    "type": "profile_picture_ready",
                    "message": "Your profile picture has been generated successfully!"
                }
            )
        else:
            logger.error(f"Failed to generate profile picture for user {user_id}")
            
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
    except Exception as e:
        logger.error(f"Error generating profile picture for user {user_id}: {str(e)}")


@shared_task
def check_and_refresh_workout_plans():
    """
    Check and refresh workout plans that are older than one month
    """
    try:
        one_month_ago = timezone.now() - timezone.timedelta(days=30)
        users_needing_refresh = User.objects.filter(
            Q(workout_plan__created_at__lte=one_month_ago) | 
            Q(workout_plan__isnull=True)
        )

        for user in users_needing_refresh:
            generate_workout_plan.delay(user.id)
            
    except Exception as e:
        logger.error(f"Error refreshing workout plans: {str(e)}", exc_info=True)


@shared_task
def process_negative_feedback(training_session_id):
    """
    Process negative feedback and modify the workout plan accordingly
    """
    try:
        session = TrainingSession.objects.get(id=training_session_id)
        if not session.feedback or not session.feedback.get('emoji') or not session.feedback.get('comments'):
            return
        
        emoji = session.feedback['emoji']
        comments = session.feedback['comments'].lower()
        
        # Check if feedback is negative
        if emoji in ['😞', '😢', '😡']:  # bad, very bad, terrible
            workout_plan = session.user.workout_plan
            if not workout_plan:
                return
                
            # Find the specific day in the workout plan
            workout_days = workout_plan.workoutDays
            for day in workout_days:
                if day['day'] == session.session_name:
                    # Process feedback with AI
                    modified_session = process_feedback_with_ai({
                        'session_name': session.session_name,
                        'comments': comments,
                        'workout_plan': workout_plan
                    })
                    
                    if modified_session:
                        # Update the workout plan with modified session
                        day.update(modified_session)
                        workout_plan.save()
                        
                        # Notify user about the changes
                        send_workout_plan_to_group(session.user, {
                            'type': 'workout_plan_updated',
                            'message': 'Your workout plan has been updated based on your feedback.',
                            'updated_session': session.session_name
                        })
                    break
                    
    except Exception as e:
        logger.error(f"Error processing negative feedback: {str(e)}", exc_info=True)
