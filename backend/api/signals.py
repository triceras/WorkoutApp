from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .services import generate_profile_picture
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile_picture(sender, instance, created, **kwargs):
    """
    Signal to generate a profile picture when a new user is created
    """
    logger.info(f"Post-save signal received for user {instance.id}, created={created}")
    if created:
        logger.info(f"Generating profile picture for new user {instance.id}")
        generate_profile_picture(instance)
