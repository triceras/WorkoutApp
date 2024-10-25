# api/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import WorkoutPlan
from .tasks import generate_backgrounds_task  # Separate task for backgrounds
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=WorkoutPlan)
def workout_plan_post_save(sender, instance, created, **kwargs):
    if created:
        logger.info(f"WorkoutPlan created for user {instance.user.username}: Plan ID {instance.id}")
        # Trigger background image generation task
        # To avoid circular loop, ensure this task does not trigger the signal again
        generate_backgrounds_task.delay(instance.user.id)
    
