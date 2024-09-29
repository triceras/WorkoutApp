# api/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class User(AbstractUser):
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
    strength_goals = models.TextField(null=True, blank=True)
    equipment = models.TextField(null=True, blank=True)
    workout_time = models.CharField(max_length=50, null=True, blank=True)
    workout_days = models.CharField(max_length=50, null=True, blank=True)
    additional_goals = models.TextField(blank=True, null=True)  # Integrated from UserProfile
    # Add additional fields as needed

    def __str__(self):
        return self.username

class Exercise(models.Model):
    name = models.CharField(max_length=100)
    description = models.JSONField()
    video_url = models.URLField(null=True, blank=True)
    # Additional fields

    def __str__(self):
        return self.name

class WorkoutPlan(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plan_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    # Store plan details as JSON

    def __str__(self):
        return f"Workout Plan for {self.user.username}"

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

