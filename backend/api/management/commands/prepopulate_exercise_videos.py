# backend/api/management/commands/prepopulate_exercise_videos.py

from django.core.management.base import BaseCommand
from api.models import ExerciseVideo
from api.services import get_youtube_video_ids_batch
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Pre-populate ExerciseVideo cache with video IDs for predefined exercises.'

    def handle(self, *args, **options):
        predefined_exercises = [
            "Barbell Bench Press",
            "Dumbbell Flyes",
            "Tricep Dips",
            "Push-Ups",
            "Overhead Dumbbell Tricep Extension",
            "Plank",
            "Chest Stretch",
            "Pull-Ups",
            "Bent Over Barbell Rows",
            "Dumbbell Bicep Curls",
            "Seated Row (Machine)",
            "Kettlebell Swings",
            "Face Pulls (Resistance Bands)",
            "Back Stretch",
            "Barbell Squats",
            "Dumbbell Lunges",
            "Leg Press (Machine)",
            "Dumbbell Shoulder Press",
            "Kettlebell Deadlifts",
            "Calf Raises",
            "Shoulder Stretch",
            "Treadmill Running",
            "Rowing Machine",
            "Russian Twists",
            "Leg Press",
            "Plank with Shoulder Taps",
            "Bicycle Crunches",
            "Mountain Climbers",
            "Cobra Stretch", 
            "Incline Dumbbell Press",
            "Deadlifts",
            "Bent-Over Barbell Rows",
            "Standing Military Press",
            "Lateral Raises",
            "Bench Dips",
            "Tricep Extensions"
        ]

        # Remove duplicates and sort for consistency
        unique_exercises = sorted(set(predefined_exercises))

        logger.info(f"Starting pre-population for {len(unique_exercises)} unique exercises.")

        # Fetch video IDs in batch
        video_ids_mapping = get_youtube_video_ids_batch(unique_exercises)

        # Prepare ExerciseVideo instances to update or create
        exercise_video_instances = []
        for name in unique_exercises:
            video_id = video_ids_mapping.get(name)
            if video_id:
                exercise_video_instances.append({
                    'exercise_name': name,
                    'video_id': video_id
                })
                logger.info(f"Fetched YouTube video ID '{video_id}' for exercise '{name}'")
            else:
                logger.warning(f"No video ID found for exercise '{name}'")

        if not exercise_video_instances:
            logger.warning("No ExerciseVideo instances to update or create.")
            return

        # Bulk update or create ExerciseVideo entries within a transaction
        try:
            with transaction.atomic():
                for exercise_video in exercise_video_instances:
                    ExerciseVideo.objects.update_or_create(
                        exercise_name=exercise_video['exercise_name'],
                        defaults={'video_id': exercise_video['video_id']}
                    )
                    logger.info(f"Cached video ID for '{exercise_video['exercise_name']}': {exercise_video['video_id']}")
            logger.info("Pre-population of ExerciseVideo cache completed successfully.")
        except Exception as e:
            logger.error(f"Error during pre-population: {e}", exc_info=True)
