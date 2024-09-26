# api/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser, User

class User(AbstractUser):
    age = models.PositiveIntegerField(null=True)
    weight = models.FloatField(null=True)
    height = models.FloatField(null=True)
    fitness_level = models.CharField(max_length=50, null=True)
    strength_goals = models.TextField(null=True)
    equipment = models.TextField(null=True)
    workout_time = models.CharField(max_length=50, null=True)
    # Add additional fields as needed

class Exercise(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    video_url = models.URLField(null=True, blank=True)
    # Additional fields

class WorkoutPlan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    plan_data = models.JSONField()
    # Store plan details as JSON

class WorkoutLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    exercises = models.ManyToManyField(Exercise, through='ExerciseLog')

class ExerciseLog(models.Model):
    workout_log = models.ForeignKey(WorkoutLog, on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    sets = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    weight = models.FloatField()

class UserProfile(models.Model):
    FITNESS_LEVEL_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    age = models.PositiveIntegerField()
    weight = models.FloatField()
    height = models.FloatField()
    fitness_level = models.CharField(max_length=20, choices=FITNESS_LEVEL_CHOICES)
    strength_goals = models.CharField(max_length=255)
    additional_goals = models.TextField(blank=True, null=True)
    equipment = models.CharField(max_length=255)
    workout_time = models.PositiveIntegerField()
    workout_days = models.PositiveIntegerField()

    def __str__(self):
        return self.user.username
