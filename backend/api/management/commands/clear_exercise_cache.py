from django.core.management.base import BaseCommand
from django.core.cache import cache
from api.models import YouTubeVideo

class Command(BaseCommand):
    help = 'Clears the exercise video cache'

    def handle(self, *args, **options):
        # Clear all cached exercise videos
        for video in YouTubeVideo.objects.all():
            cache_key = f'youtube_video_{video.exercise_name}'
            cache.delete(cache_key)
        
        self.stdout.write(self.style.SUCCESS('Successfully cleared exercise video cache'))
