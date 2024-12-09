from django.core.management.base import BaseCommand
from api.models import WorkoutPlan, Exercise
import json

class Command(BaseCommand):
    help = 'Updates video IDs in workout plans to match current exercise videos'

    def handle(self, *args, **kwargs):
        try:
            # Get all workout plans
            workout_plans = WorkoutPlan.objects.all()
            updated_count = 0

            for plan in workout_plans:
                plan_data = plan.plan_data
                modified = False

                # Update video IDs in workoutDays
                if 'workoutDays' in plan_data:
                    for day in plan_data['workoutDays']:
                        if 'exercises' in day:
                            for exercise in day['exercises']:
                                if exercise.get('name') == 'Pull-Ups':
                                    exercise['videoId'] = 'eGo4IYlbE5g'
                                    exercise['video_url'] = 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
                                    modified = True

                if modified:
                    plan.plan_data = plan_data
                    plan.save()
                    updated_count += 1

            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} workout plans')
            )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
