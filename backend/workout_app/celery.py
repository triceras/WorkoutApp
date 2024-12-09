from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workout_app.settings')

app = Celery('workout_app')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Configure periodic tasks
app.conf.beat_schedule = {
    'check-workout-plans-monthly': {
        'task': 'api.tasks.check_and_refresh_workout_plans',
        'schedule': crontab(0, 0, day_of_month='1'),  # Run at midnight on the first day of every month
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
