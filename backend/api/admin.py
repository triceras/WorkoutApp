# api/admin.py

from django.contrib import admin
from .models import User, Exercise, WorkoutPlan, WorkoutLog, ExerciseLog

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'fitness_level', 'additional_goals')
    search_fields = ('username', 'email', 'fitness_level')

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('name', 'video_url')
    search_fields = ('name',)

@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')
    search_fields = ('user__username',)

@admin.register(WorkoutLog)
class WorkoutLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'date')
    search_fields = ('user__username', 'date')

@admin.register(ExerciseLog)
class ExerciseLogAdmin(admin.ModelAdmin):
    list_display = ('workout_log', 'exercise', 'sets', 'reps', 'weight')
    search_fields = ('workout_log__user__username', 'exercise__name')

# Remove or comment out UserProfileAdmin if it exists
