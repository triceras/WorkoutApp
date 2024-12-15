from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services.profile import generate_profile_picture_async
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=User)
def generate_profile_picture_for_new_user(sender, instance, created, **kwargs):
    """
    Signal handler to generate a profile picture when a new user is created.
    """
    if created and not instance.profile_picture:
        logger.info(f"Queueing profile picture generation for new user {instance.id}")
        generate_profile_picture_async(instance)
