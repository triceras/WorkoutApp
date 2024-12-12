from django.core.management.base import BaseCommand
from api.models import Exercise, YouTubeVideo
from django.utils import timezone

class Command(BaseCommand):
    help = 'Updates the video ID for barbell squats'

    def handle(self, *args, **kwargs):
        try:
            # Update or create YouTube video entry for squats
            youtube_video, created = YouTubeVideo.objects.update_or_create(
                exercise_name='squats',
                defaults={
                    'video_id': 'bEv6CCg2BC8',  # Updated barbell squat tutorial
                    'title': 'How To: Barbell Squat',
                    'thumbnail_url': f'https://img.youtube.com/vi/bEv6CCg2BC8/hqdefault.jpg',
                    'video_url': f'https://www.youtube.com/watch?v=bEv6CCg2BC8',
                    'cached_at': timezone.now()
                }
            )

            # Update all Squats exercises
            exercises = Exercise.objects.filter(name__icontains='Squats')
            updated_count = exercises.update(
                video_url='https://www.youtube.com/watch?v=bEv6CCg2BC8',
                videoId='bEv6CCg2BC8'
            )

            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} Squats exercises')
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
