# backend/api/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid
import re
from django.core.cache import cache
class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True, null=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    FITNESS_LEVEL_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]
    fitness_level = models.CharField(
        max_length=20,
        choices=FITNESS_LEVEL_CHOICES,
        null=True,
        blank=True
    )
    strength_goals = models.ManyToManyField('StrengthGoal', blank=True)
    equipment = models.ManyToManyField('Equipment', blank=True)
    workout_time = models.PositiveIntegerField(null=True, blank=True)  # in minutes
    workout_days = models.PositiveIntegerField(null=True, blank=True)  # days per week
    additional_goals = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        max_length=255,
        null=True,
        blank=True
    )
    SEX_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
        ('Prefer not to say', 'Prefer not to say'),
    ]
    sex = models.CharField(max_length=20, choices=SEX_CHOICES, default='Prefer not to say')
    # Added membership_number field
    membership_number = models.CharField(max_length=20, unique=True, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['email'],
                condition=models.Q(email__isnull=False),
                name='unique_email_when_not_null'
            )
        ]

    def __str__(self):
        return self.username

# Ensure that a membership_number is generated upon user creation
@receiver(post_save, sender=User)
def create_membership_number(sender, instance, created, **kwargs):
    if created and not instance.membership_number:
        instance.membership_number = f"MEM-{instance.id:05d}"
        instance.save()

class StrengthGoal(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Equipment(models.Model):
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name

class Exercise(models.Model):
    name = models.CharField(max_length=100)
    description = models.JSONField()
    video_url = models.URLField(null=True, blank=True)
    videoId = models.CharField(max_length=50, null=True, blank=True)

    def extract_youtube_id(self, url):
        """Extract YouTube video ID from various URL formats."""
        if not url:
            return None

        youtube_regex = (
            r'(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)'
            r'([^"&?/ ]{11})'
        )
        match = re.search(youtube_regex, url)
        return match.group(1) if match else None

    def save(self, *args, **kwargs):
        if self.video_url:
            self.videoId = self.extract_youtube_id(self.video_url)
            if self.videoId:
                cache_key = f'exercise_video_{self.id}'
                cache.set(cache_key, self.videoId, timeout=86400)  # Cache for 24 hours
        super().save(*args, **kwargs)

    def get_cached_video_id(self):
        """Get cached video ID or extract from URL if not cached."""
        if not self.id:
            return None

        cache_key = f'exercise_video_{self.id}'
        video_id = cache.get(cache_key)

        if video_id is None and self.video_url:
            video_id = self.extract_youtube_id(self.video_url)
            if video_id:
                cache.set(cache_key, video_id, timeout=86400)

        return video_id

    def __str__(self):
        return self.name

class WorkoutPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workout_plans'  # Allows reverse lookup
    )
    week_number = models.PositiveIntegerField(default=1)
    plan_data = models.JSONField()
    dashboard_background = models.CharField(max_length=255, blank=True, null=True)
    workoutplan_background = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Workout Plan for {self.user.username} on {self.created_at.strftime('%Y-%m-%d')}"

class WorkoutLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()
    exercises = models.ManyToManyField(Exercise, through='ExerciseLog')

    def __str__(self):
        return f"Workout Log for {self.user.username} on {self.date}"

class ExerciseLog(models.Model):
    workout_log = models.ForeignKey(WorkoutLog, on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    sets = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    weight = models.FloatField()

    def __str__(self):
        return f"{self.exercise.name} - {self.sets} sets x {self.reps} reps @ {self.weight}kg"

class WorkoutSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workouts')
    date = models.DateTimeField(auto_now_add=True)
    # Add other relevant fields like workout type, duration, etc.

    def __str__(self):
        return f"{self.user.username} - {self.date.strftime('%Y-%m-%d %H:%M')}"

class TrainingSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    workout_plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE)
    comments = models.TextField(blank=True, null=True)
    session_name = models.CharField(max_length=100, blank=True, null=True)
    week_number = models.PositiveIntegerField(null=True, blank=True)
    EMOJI_FEEDBACK_CHOICES = [
        (0, '😞 Terrible'),
        (1, '😟 Very Bad'),
        (2, '😐 Bad'),
        (3, '🙂 Okay'),
        (4, '😃 Good'),
        (5, '😄 Awesome'),
    ]
    emoji_feedback = models.IntegerField(choices=EMOJI_FEEDBACK_CHOICES, null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.workout_plan} on {self.date}"
    
    class Meta:
        unique_together = ('user', 'date', 'session_name')

class YouTubeVideo(models.Model):
    video_id = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    thumbnail_url = models.URLField()
    video_url = models.URLField()
    cached_at = models.DateTimeField(auto_now=True)  # Timestamp for TTL

    def __str__(self):
        return self.title
