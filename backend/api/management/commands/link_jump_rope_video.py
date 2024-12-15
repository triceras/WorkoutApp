from django.core.management.base import BaseCommand
from api.models import Exercise, YouTubeVideo

class Command(BaseCommand):
    help = 'Links the YouTube video to Jump Rope Cardio exercise'

    def handle(self, *args, **options):
        try:
            video_id = "0NIvRAaOdlQ"
            
            # Get the exercise and video
            exercise = Exercise.objects.get(name='Jump Rope Cardio')
            video = YouTubeVideo.objects.get(video_id=video_id)
            
            # Update the exercise with video information
            exercise.video_url = f'https://www.youtube.com/watch?v={video_id}'
            exercise.videoId = video_id
            exercise.save()
            
            self.stdout.write(
                self.style.SUCCESS('Successfully linked video to Jump Rope Cardio exercise')
            )
        except Exercise.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('Exercise "Jump Rope Cardio" not found')
            )
        except YouTubeVideo.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Video with ID {video_id} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error linking video: {str(e)}')
            )
