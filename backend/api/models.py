# backend/api/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone

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
    # Add additional fields as needed

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
    # Additional fields

    def __str__(self):
        return self.name

class WorkoutPlan(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workout_plans'  # Allows reverse lookup
    )
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
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    workout_plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE)

class SessionFeedback(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    training_session = models.OneToOneField('TrainingSession', on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateField(default=timezone.now)
    session_name = models.CharField(max_length=255, null=True, blank=True)
    emoji_feedback = models.CharField(max_length=10, null=True, blank=True)  # Emojis are Unicode characters

    def __str__(self):
        return f"{self.user.username} - {self.session_name or 'Session'} on {self.date}"
