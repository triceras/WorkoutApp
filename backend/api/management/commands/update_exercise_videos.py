from django.core.management.base import BaseCommand
from api.models import YouTubeVideo
from django.utils import timezone

class Command(BaseCommand):
    help = 'Updates exercise video IDs in the database'

    def handle(self, *args, **options):
        # Update or create barbell squat video
        YouTubeVideo.objects.update_or_create(
            exercise_name='barbell-squat',
            defaults={
                'video_id': 'bs_Ej32IYgo',  # Alan Thrall's barbell squat tutorial
                'title': 'How To Low Bar Squat with Proper Form',
                'thumbnail_url': f'https://img.youtube.com/vi/bs_Ej32IYgo/hqdefault.jpg',
                'video_url': f'https://www.youtube.com/watch?v=bs_Ej32IYgo',
                'cached_at': timezone.now()
            }
        )
        
        self.stdout.write(self.style.SUCCESS('Successfully updated exercise video IDs'))
