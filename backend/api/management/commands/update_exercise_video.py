from django.core.management.base import BaseCommand
from api.models import Exercise, YouTubeVideo

class Command(BaseCommand):
    help = 'Updates the video for the Pull-Ups exercise'

    def handle(self, *args, **kwargs):
        try:
            # Update or create YouTube video entry
            youtube_video, created = YouTubeVideo.objects.update_or_create(
                exercise_name='Pull-Ups',
                defaults={
                    'video_id': 'eGo4IYlbE5g',  # Proper pull-ups tutorial video
                    'title': 'How To Do Pull-Ups for Beginners (6 Simple Steps)',
                    'thumbnail_url': f'https://img.youtube.com/vi/eGo4IYlbE5g/hqdefault.jpg',
                    'video_url': f'https://www.youtube.com/watch?v=eGo4IYlbE5g'
                }
            )

            # Update all Pull-Ups exercises
            exercises = Exercise.objects.filter(name='Pull-Ups')
            updated_count = exercises.update(
                video_url='https://www.youtube.com/watch?v=eGo4IYlbE5g',
                videoId='eGo4IYlbE5g'
            )

            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} Pull-Ups exercises')
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
