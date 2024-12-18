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
from django.core.validators import MinValueValidator, MaxValueValidator

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

    MUSCLE_GROUP_CHOICES = [
        ('chest', 'Chest'),
        ('back', 'Back'),
        ('shoulders', 'Shoulders'),
        ('arms', 'Arms'),
        ('legs', 'Legs'),
        ('core', 'Core'),
        ('abs', 'Abs'),
        ('full_body', 'Full Body'),
        ('cardio', 'Cardio'),
    ]

    name = models.CharField(max_length=100)
    description = models.JSONField()
    instructions = models.JSONField(default=dict, help_text="Structured instructions including setup, execution steps, and form tips")
    video_url = models.URLField(null=True, blank=True)
    videoId = models.CharField(max_length=50, null=True, blank=True)
    exercise_type = models.CharField(
        max_length=20,
        choices=EXERCISE_TYPE_CHOICES,
        default='strength'
    )
    muscle_group = models.CharField(max_length=50, choices=MUSCLE_GROUP_CHOICES, default='full_body')

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

    def save(self, *args, **kwargs):
        # Extract and save video ID from URL if URL is provided and no ID exists
        if self.video_url and not self.videoId:
            extracted_id = self.extract_youtube_id(self.video_url)
            if extracted_id:
                self.videoId = extracted_id
        # If URL is removed, also remove the video ID
        elif not self.video_url:
            self.videoId = None
        super().save(*args, **kwargs)

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
    """Model for training sessions."""
    EMOJI_FEEDBACK_CHOICES = [
        ('😀', 'Great'),
        ('🙂', 'Good'),
        ('😐', 'Okay'),
        ('😕', 'Not Good'),
        ('😞', 'Bad'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    workout_plan = models.ForeignKey(
        WorkoutPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='training_sessions'
    )
    exercises = models.ManyToManyField(
        'Exercise',
        through='TrainingSessionExercise',
        related_name='training_sessions'
    )
    session_name = models.CharField(max_length=255, null=True, blank=True)
    date = models.DateTimeField()
    workout_type = models.CharField(max_length=50, blank=True, null=True)
    duration = models.IntegerField(null=True, blank=True)
    calories_burned = models.IntegerField(null=True, blank=True)
    heart_rate_pre = models.IntegerField(null=True, blank=True)
    heart_rate_post = models.IntegerField(null=True, blank=True)
    average_heart_rate = models.IntegerField(null=True, blank=True)
    intensity = models.CharField(max_length=50, null=True, blank=True)
    feedback_rating = models.IntegerField(null=True, blank=True)
    emoji_feedback = models.CharField(max_length=2, choices=EMOJI_FEEDBACK_CHOICES, null=True, blank=True)
    comments = models.TextField(null=True, blank=True)
    source = models.CharField(max_length=50, default='manual')  # 'manual', 'completed', 'scheduled'
    is_scheduled = models.BooleanField(default=False)
    week_number = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.session_name} - {self.date}"
    
    class Meta:
        """Define constraints for the TrainingSession model."""
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date', 'workout_plan'], 
                name='unique_user_date_workout'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'date', 'workout_plan'])
        ]

class TrainingSessionExercise(models.Model):
    """Model for linking exercises to training sessions."""
    training_session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name='session_exercises'  # Add this related_name
    )
    exercise = models.ForeignKey('Exercise', on_delete=models.CASCADE)
    sets = models.PositiveIntegerField(null=True, blank=True)
    reps = models.PositiveIntegerField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    duration = models.PositiveIntegerField(null=True, blank=True)
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    average_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    max_heart_rate = models.PositiveIntegerField(null=True, blank=True)
    intensity = models.CharField(
        max_length=20,
        choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('High', 'High')],
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.exercise.name} in {self.training_session}"

    class Meta:
        verbose_name = "Training Session Exercise"
        verbose_name_plural = "Training Session Exercises"

class YouTubeVideo(models.Model):
    exercise_name = models.CharField(max_length=255)
    video_id = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    thumbnail_url = models.URLField()
    video_url = models.URLField()
    cached_at = models.DateTimeField(auto_now=True)  # Timestamp for TTL

    class Meta:
        indexes = [
            models.Index(fields=['exercise_name']),
            models.Index(fields=['video_id']),
        ]

    def __str__(self):
        return f"{self.exercise_name} - {self.title}"
