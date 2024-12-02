# backend/api/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import WorkoutPlan
from .tasks import generate_backgrounds_task  # Now properly defined
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=WorkoutPlan)
def workout_plan_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"WorkoutPlan created for user {instance.user.username}: Plan ID {instance.id}")
        try:
            # Trigger background image generation task
            # Ensure this task does not trigger the signal again to prevent infinite loops
            generate_backgrounds_task.delay(instance.user.id)
            logger.info(f"Triggered generate_backgrounds_task for user {instance.user.username}")
        except Exception as e:
            logger.error(f"Error triggering generate_backgrounds_task for user {instance.user.username}: {e}", exc_info=True)
