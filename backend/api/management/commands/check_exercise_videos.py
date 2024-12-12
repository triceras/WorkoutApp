from django.core.management.base import BaseCommand
from api.models import YouTubeVideo

class Command(BaseCommand):
    help = 'Check exercise video mappings in the database'

    def handle(self, *args, **options):
        videos = YouTubeVideo.objects.all()
        self.stdout.write("Current exercise video mappings:")
        for video in videos:
            self.stdout.write(f"Exercise: {video.exercise_name}, Video ID: {video.video_id}")
            
        # Specifically check for barbell squat
        try:
            squat_video = YouTubeVideo.objects.get(exercise_name='barbell-squat')
            self.stdout.write(self.style.SUCCESS(f"\nBarbell Squat video found: {squat_video.video_id}"))
        except YouTubeVideo.DoesNotExist:
            self.stdout.write(self.style.ERROR("\nNo video found for barbell-squat"))
