import os
import sys
import django

# Add the project directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
sys.path.insert(0, current_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myfitnessapp.settings')
django.setup()

from api.models import YouTubeVideo, Exercise

print("YouTube Videos in database:")
for video in YouTubeVideo.objects.all():
    print(f"Exercise: {video.exercise_name}, Video ID: {video.video_id}")

print("\nExercises with video IDs:")
for exercise in Exercise.objects.exclude(videoId__isnull=True):
    print(f"Exercise: {exercise.name}, Video ID: {exercise.videoId}")
