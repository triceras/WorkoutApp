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
    EXERCISE_TYPE_CHOICES = [
        ('strength', 'Strength'),
        ('flexibility', 'Flexibility'),
        ('balance', 'Balance'),
        ('endurance', 'Endurance'),
        ('power', 'Power'),
        ('speed', 'Speed'),
        ('agility', 'Agility'),
        ('plyometric', 'Plyometric'),
        ('core', 'Core'),
        ('cardio', 'Cardio'),
    ]

    name = models.CharField(max_length=100)
    description = models.JSONField()
    video_url = models.URLField(null=True, blank=True)
    videoId = models.CharField(max_length=50, null=True, blank=True)
    exercise_type = models.CharField(
        max_length=20,
        choices=EXERCISE_TYPE_CHOICES,
        default='strength'
    )

    def __str__(self):
        return self.name

    def extract_youtube_id(self, url):
        """Extract the video ID from a YouTube URL."""
        if not url:
            return None
            
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    def get_cached_video_id(self):
        """Get cached video ID or extract from URL if not cached."""
        from .helpers import get_video_id, standardize_exercise_name
        
        # First try to get from videoId field
        if self.videoId:
            return self.videoId
            
        # Then try to get from YouTubeVideo model
        try:
            standardized_name = standardize_exercise_name(self.name)
            video = YouTubeVideo.objects.get(exercise_name=standardized_name)
            self.videoId = video.video_id
            self.save(update_fields=['videoId'])
            return video.video_id
        except YouTubeVideo.DoesNotExist:
            pass
            
        # Finally, try to get from video_url
        if self.video_url:
            video_id = self.extract_youtube_id(self.video_url)
            if video_id:
                self.videoId = video_id
                self.save(update_fields=['videoId'])
                return video_id
                
        # If all else fails, try to get from the helper function
        video_id = get_video_id(self.name)
        if video_id:
            self.videoId = video_id
            self.save(update_fields=['videoId'])
        return video_id

class WorkoutPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workout_plan')
    week_number = models.PositiveIntegerField(default=1)
    plan_data = models.JSONField()
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
    WORKOUT_TYPE_CHOICES = [
        ('Cardio', 'Cardio'),
        ('Light Cardio', 'Light Cardio'),
        ('Strength', 'Strength'),
        ('Flexibility', 'Flexibility'),
        ('Balance', 'Balance'),
        ('Endurance', 'Endurance'),
        ('Power', 'Power'),
        ('Speed', 'Speed'),
        ('Agility', 'Agility'),
        ('Plyometric', 'Plyometric'),
        ('Core', 'Core'),
    ]
    
    EMOJI_FEEDBACK_CHOICES = [
        (0, '😞 Terrible'),
        (1, '😟 Very Bad'),
        (2, '😐 Bad'),
        (3, '🙂 Okay'),
        (4, '😃 Good'),
        (5, '😄 Awesome'),
    ]

    SOURCE_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('manual', 'Manual'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    workout_plan = models.ForeignKey('WorkoutPlan', on_delete=models.CASCADE)
    comments = models.TextField(blank=True, null=True)
    session_name = models.CharField(max_length=100, blank=True, null=True)
    week_number = models.PositiveIntegerField(null=True, blank=True)
    emoji_feedback = models.IntegerField(choices=EMOJI_FEEDBACK_CHOICES, null=True, blank=True)
    duration = models.PositiveIntegerField(null=True, blank=True)  # in minutes
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    heart_rate_pre = models.PositiveIntegerField(null=True, blank=True)
    heart_rate_post = models.PositiveIntegerField(null=True, blank=True)
    
    # Remove unique_together temporarily
    # class Meta:
    #     unique_together = ('user', 'date', 'workout_type')

    # New Field
    workout_type = models.CharField(max_length=20, choices=WORKOUT_TYPE_CHOICES)

    # New Aerobic Fields
    time = models.PositiveIntegerField(null=True, blank=True)  # in minutes
    average_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    max_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    intensity = models.CharField(max_length=50, null=True, blank=True)
    exercises = models.ManyToManyField('Exercise', through='TrainingSessionExercise')

    # Source field to track where the session came from
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='completed'  # Changed from 'manual' to 'completed'
    )

    def save(self, *args, **kwargs):
        if self.workout_type != 'aerobic':
            # Clear aerobic-specific fields if workout is not aerobic
            self.time = None
            self.average_heart_rate = None
            self.max_heart_rate = None
            self.intensity = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"TrainingSession({self.user.username}, {self.date}, {self.workout_type})"

    class Meta:
        unique_together = ('user', 'date', 'workout_type')

# backend/api/models.py

class TrainingSessionExercise(models.Model):
    training_session = models.ForeignKey(
        TrainingSession, 
        on_delete=models.CASCADE, 
        related_name='training_session_exercises'
    )
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    
    # Fields for strength exercises
    sets = models.PositiveIntegerField(null=True, blank=True)
    reps = models.PositiveIntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    
    # Fields for cardio exercises
    duration = models.PositiveIntegerField(null=True, blank=True)
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    average_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    max_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    intensity = models.CharField(
        max_length=50,
        choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('High', 'High')],
        null=True,
        blank=True
    )

    class Meta:
        unique_together = ('training_session', 'exercise')

    def __str__(self):
        return f"{self.exercise.name} - {self.training_session}"

class YouTubeVideo(models.Model):
    exercise_name = models.CharField(max_length=255, unique=True)
    video_id = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    thumbnail_url = models.URLField()
    video_url = models.URLField()
    cached_at = models.DateTimeField(auto_now=True)  # Timestamp for TTL

    def __str__(self):
        return self.title
