from django.core.management.base import BaseCommand
from api.models import Exercise, YouTubeVideo

class Command(BaseCommand):
    help = 'Creates the Jump Rope Cardio exercise and links it to a video'

    def handle(self, *args, **options):
        try:
            # Create the exercise if it doesn't exist
            exercise, created = Exercise.objects.get_or_create(
                name='Jump Rope Cardio',
                defaults={
                    'description': {
                        'overview': 'A high-intensity cardio workout using a jump rope',
                        'benefits': [
                            'Improves cardiovascular endurance',
                            'Burns calories efficiently',
                            'Enhances coordination and agility',
                            'Low impact on joints when done correctly'
                        ],
                        'equipment_needed': ['Jump rope'],
                        'difficulty_level': 'Intermediate'
                    },
                    'instructions': {
                        'setup': [
                            'Find a flat surface with enough space to swing the rope',
                            'Adjust rope length to your height',
                            'Stand with feet shoulder-width apart'
                        ],
                        'execution': [
                            'Keep elbows close to body',
                            'Jump about 1/2 inch off the ground',
                            'Land softly on the balls of your feet',
                            'Maintain a steady rhythm'
                        ],
                        'form_tips': [
                            'Keep your core engaged',
                            'Look straight ahead',
                            'Stay relaxed in your shoulders',
                            'Breathe steadily throughout'
                        ]
                    },
                    'exercise_type': 'cardio'
                }
            )

            # Create the YouTube video entry if it doesn't exist
            video_id = "0NIvRAaOdlQ"  # A good jump rope cardio workout video
            video, video_created = YouTubeVideo.objects.get_or_create(
                video_id=video_id,
                defaults={
                    'exercise_name': 'Jump Rope Cardio',
                    'title': 'Jump Rope Cardio Workout',
                    'thumbnail_url': f'https://img.youtube.com/vi/{video_id}/0.jpg',
                    'video_url': f'https://www.youtube.com/watch?v={video_id}'
                }
            )

            # Link the video to the exercise
            exercise.video = video
            exercise.save()

            if created:
                self.stdout.write(
                    self.style.SUCCESS('Successfully created Jump Rope Cardio exercise')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('Jump Rope Cardio exercise already exists')
                )

            if video_created:
                self.stdout.write(
                    self.style.SUCCESS('Successfully created video entry')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('Video entry already exists')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating exercise: {str(e)}')
            )
