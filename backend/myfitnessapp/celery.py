# backend/myfitnessapp/celery.py

from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings
from dotenv import load_dotenv
from pathlib import Path
import django  # Add this line

# Define BASE_DIR
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myfitnessapp.settings')

app = Celery('myfitnessapp')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# Optional: Define global task time limits if not set per task
app.conf.task_time_limit = 1200  # 20 minutes
app.conf.task_soft_time_limit = 1150  # 19 minutes 10 seconds

# Configure periodic tasks
app.conf.beat_schedule = {
    'check-workout-plans-monthly': {
        'task': 'api.tasks.check_and_refresh_workout_plans',
        'schedule': crontab(0, 0, day_of_month='1'),  # Run at midnight on the first day of every month
    },
    'process-pending-feedback': {
        'task': 'api.tasks.process_negative_feedback',
        'schedule': crontab(minute='*/15'),  # Run every 15 minutes
    }
}

# Optional: Define a debug task to verify Celery is working
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
