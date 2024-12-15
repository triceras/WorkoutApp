from django.core.management.base import BaseCommand
from api.models import Exercise

class Command(BaseCommand):
    help = 'Updates the exercise type for Jump Rope Cardio to cardio'

    def handle(self, *args, **options):
        try:
            exercise = Exercise.objects.get(name='Jump Rope Cardio')
            exercise.exercise_type = 'cardio'
            exercise.save()
            self.stdout.write(
                self.style.SUCCESS('Successfully updated Jump Rope Cardio exercise type to cardio')
            )
        except Exercise.DoesNotExist:
            self.stdout.write(
                self.style.ERROR('Exercise "Jump Rope Cardio" not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating exercise type: {str(e)}')
            )
