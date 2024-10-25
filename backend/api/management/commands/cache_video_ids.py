# backend/api/management/commands/cache_video_ids.py

from django.core.management.base import BaseCommand
from django.core.cache import cache
from api.models import Exercise

class Command(BaseCommand):
    help = 'Cache YouTube video IDs for all exercises'

    def handle(self, *args, **options):
        exercises = Exercise.objects.filter(video_url__isnull=False)
        cached_count = 0

        for exercise in exercises:
            video_id = exercise.extract_youtube_id(exercise.video_url)
            if video_id:
                exercise.videoId = video_id
                exercise.save()
                cache_key = f'exercise_video_{exercise.id}'
                cache.set(cache_key, video_id, timeout=86400)
                cached_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully cached {cached_count} video IDs')
        )
