from django.core.management.base import BaseCommand
from api.models import Exercise, YouTubeVideo
from django.utils import timezone

class Command(BaseCommand):
    help = 'Updates the video IDs for leg exercises (lunges and leg press)'

    def handle(self, *args, **kwargs):
        try:
            # Update videos for lunges
            youtube_video, created = YouTubeVideo.objects.update_or_create(
                exercise_name='lunges',
                defaults={
                    'video_id': 'QOVaHwm-Q6U',  # Better lunges tutorial
                    'title': 'How To: Dumbbell Walking Lunges',
                    'thumbnail_url': f'https://img.youtube.com/vi/QOVaHwm-Q6U/hqdefault.jpg',
                    'video_url': f'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
                    'cached_at': timezone.now()
                }
            )

            # Update all Lunges exercises
            lunges_exercises = Exercise.objects.filter(name__icontains='Lunges')
            lunges_count = lunges_exercises.update(
                video_url='https://www.youtube.com/watch?v=QOVaHwm-Q6U',
                videoId='QOVaHwm-Q6U'
            )

            # Update videos for leg press
            youtube_video, created = YouTubeVideo.objects.update_or_create(
                exercise_name='leg-press',
                defaults={
                    'video_id': 'IZxyjW7MPJQ',  # Better leg press tutorial
                    'title': 'How To: Leg Press',
                    'thumbnail_url': f'https://img.youtube.com/vi/IZxyjW7MPJQ/hqdefault.jpg',
                    'video_url': f'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
                    'cached_at': timezone.now()
                }
            )

            # Update all Leg Press exercises
            leg_press_exercises = Exercise.objects.filter(name__icontains='Leg Press')
            leg_press_count = leg_press_exercises.update(
                video_url='https://www.youtube.com/watch?v=IZxyjW7MPJQ',
                videoId='IZxyjW7MPJQ'
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully updated {lunges_count} Lunges exercises and {leg_press_count} Leg Press exercises'
                )
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
