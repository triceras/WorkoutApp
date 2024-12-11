from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.services import generate_profile_picture_async
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Generate profile pictures for users who do not have one'

    def handle(self, *args, **kwargs):
        """
        COMMENTED OUT TO AVOID API CALLS DURING TESTING
        This command was used to generate profile pictures for users who don't have one
        """
        self.stdout.write("Profile picture generation is currently disabled to avoid API calls during testing")
        return

        # Original implementation commented out:
        """
        users_without_pictures = User.objects.filter(profile_picture='')
        total_users = users_without_pictures.count()
        
        if total_users == 0:
            self.stdout.write(self.style.SUCCESS('All users have profile pictures.'))
            return
            
        self.stdout.write(f'Found {total_users} users without profile pictures.')
        self.stdout.write('Queueing profile picture generation tasks...')
        
        success_count = 0
        for user in users_without_pictures:
            if generate_profile_picture_async(user):
                success_count += 1
                self.stdout.write(f'Queued profile picture generation for user {user.id}')
            else:
                self.stdout.write(
                    self.style.ERROR(f'Failed to queue profile picture generation for user {user.id}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully queued {success_count} out of {total_users} profile picture generation tasks.'
            )
        )
        """
