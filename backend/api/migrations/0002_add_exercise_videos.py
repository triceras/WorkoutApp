from django.db import migrations

def add_exercise_videos(apps, schema_editor):
    Exercise = apps.get_model('api', 'Exercise')
    YouTubeVideo = apps.get_model('api', 'YouTubeVideo')

    # Update Pull-ups video
    try:
        pull_ups = Exercise.objects.get(name='Pull-Ups')
        # Create or update YouTube video entry
        YouTubeVideo.objects.update_or_create(
            exercise_name='Pull-Ups',
            defaults={
                'video_id': 'eGo4IYlbE5g',  # Proper pull-ups tutorial video
                'title': 'How To Do Pull-Ups for Beginners (6 Simple Steps)',
                'thumbnail_url': f'https://img.youtube.com/vi/eGo4IYlbE5g/hqdefault.jpg',
                'video_url': f'https://www.youtube.com/watch?v=eGo4IYlbE5g'
            }
        )
        # Update exercise with video reference
        pull_ups.video_url = 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
        pull_ups.videoId = 'eGo4IYlbE5g'
        pull_ups.save()
    except Exercise.DoesNotExist:
        pass

def remove_exercise_videos(apps, schema_editor):
    YouTubeVideo = apps.get_model('api', 'YouTubeVideo')
    YouTubeVideo.objects.filter(exercise_name='Pull-Ups').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_exercise_videos, remove_exercise_videos),
    ]
