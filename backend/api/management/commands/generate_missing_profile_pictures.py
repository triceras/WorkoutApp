from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.services import generate_profile_picture
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate profile pictures for users who do not have one'

    def handle(self, *args, **options):
        User = get_user_model()
        users_without_picture = User.objects.filter(profile_picture='')
        total = users_without_picture.count()
        
        self.stdout.write(f"Found {total} users without profile pictures")
        
        for i, user in enumerate(users_without_picture, 1):
            self.stdout.write(f"Processing user {i}/{total}: {user.username}")
            try:
                if generate_profile_picture(user):
                    self.stdout.write(self.style.SUCCESS(f"Successfully generated profile picture for {user.username}"))
                else:
                    self.stdout.write(self.style.ERROR(f"Failed to generate profile picture for {user.username}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error generating profile picture for {user.username}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("Finished processing all users"))
