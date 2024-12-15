from django.core.management.base import BaseCommand
from api.models import Exercise, YouTubeVideo

class Command(BaseCommand):
    help = 'Updates the video ID for Jump Rope Cardio exercise'

    def handle(self, *args, **options):
        try:
            # Video ID for a good jump rope cardio workout
            video_id = "0NIvRAaOdlQ"
            
            # Create the YouTube video entry if it doesn't exist
            video, created = YouTubeVideo.objects.get_or_create(
                video_id=video_id,
                defaults={
                    'title': 'Jump Rope Cardio Workout',
                    'description': 'Effective jump rope cardio workout for all fitness levels'
                }
            )

            # Update the exercise with the video
            exercise = Exercise.objects.get(name='Jump Rope Cardio')
            exercise.video = video
            exercise.save()

            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated video for Jump Rope Cardio')
            )

        except Exercise.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('Exercise "Jump Rope Cardio" not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating video: {str(e)}')
            )
