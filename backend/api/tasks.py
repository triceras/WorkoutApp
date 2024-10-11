import json
from celery import shared_task, Celery
from celery.schedules import crontab
from celery.exceptions import MaxRetriesExceededError
from django.contrib.auth import get_user_model
from .models import WorkoutPlan, User, TrainingSession
from .services import (
    generate_workout_plan,
    process_feedback_with_ai,
    validate_workout_plan,
    validate_session,
    send_workout_plan_to_group,
    ReplicateServiceUnavailable,
    get_latest_feedback
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging


logger = logging.getLogger(__name__)
User = get_user_model()

app = Celery('myfitnessapp')

@shared_task(bind=True, max_retries=1)
def generate_workout_plan_task(self, user_id):
    """
    Celery task to generate a new workout plan for a user.
    """
    try:
        logger.info(f"generate_workout_plan_task received user ID: {user_id}")
        # Retrieve the user instance
        user = User.objects.get(id=user_id)
        
        # Log user instance
        logger.info(f"User instance retrieved: {user.username}")
        logger.info(f"Sex: {user.sex}")

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

@app.task
def update_weekly_workout_plans():
    """
    Celery periodic task to update workout plans for all users weekly.
    """
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
    """
    Celery task to process user feedback and update the workout plan accordingly.
    """
    logger.info(f"Task {self.request.id} received for Training Session ID {training_session_id}")
    try:
        # Fetch the TrainingSession instance
        training_session = TrainingSession.objects.get(id=training_session_id)
        user = training_session.user

        logger.info(f"Processing feedback for user {user.username}, Session ID {training_session_id}")

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

        # Determine if only a specific session needs modification
        modify_specific_session = training_session.emoji_feedback in [0, 1, 2]  # Terrible, Very Bad, Bad

        if modify_specific_session:
            # Get the latest feedback note
            feedback_note = get_latest_feedback(user)
            feedback_data['feedback_note'] = feedback_note

            # Process feedback with AI to modify a specific session
            modified_session = process_feedback_with_ai(feedback_data, modify_specific_session=True)
            if not modified_session:
                logger.error(f"Failed to generate modified session for user {user.username}")
                return
        else:
            # For neutral or positive feedback, you might choose not to modify the plan
            logger.info(f"No modification needed for user {user.username} based on feedback.")
            return

        # Update the WorkoutPlan
        workout_plan = training_session.workout_plan

        if modify_specific_session:
            # Update only the specified session in the workout plan
            workout_days = workout_plan.plan_data.get('workoutDays', [])

            session_found = False
            for idx, day in enumerate(workout_days):
                if day['day'] == training_session.session_name:
                    # Replace the session with the modified session
                    workout_days[idx] = modified_session
                    session_found = True
                    break

            if not session_found:
                logger.error(f"Session '{training_session.session_name}' not found in workout plan.")
                return

            # Save the updated plan data
            workout_plan.plan_data['workoutDays'] = workout_days

        # For future enhancements: handle full plan modifications if needed
        # else:
        #     # Handle entire plan modifications
        #     ...

        workout_plan.save()
        logger.info(f"Workout plan updated for user {user.username}")

        # Send the updated workout plan to the user via Channels
        send_workout_plan_to_group(user, workout_plan.plan_data)

    except TrainingSession.DoesNotExist:
        logger.error(f"TrainingSession with ID {training_session_id} does not exist.")
    except ReplicateServiceUnavailable as e:
        logger.error(f"Replicate service unavailable: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in processing feedback: {e}", exc_info=True)
