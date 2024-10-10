# api/admin.py

from django.contrib import admin
from .models import User, Exercise, WorkoutPlan, WorkoutLog, ExerciseLog, TrainingSession

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

@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'workout_plan', 'date', 'comments')  # Changed 'notes' to 'comments'
    list_filter = ('user', 'workout_plan', 'date')
    search_fields = ('user__username', 'comments')  # Removed 'workout_plan__name'

# @admin.register(SessionFeedback)
# class SessionFeedbackAdmin(admin.ModelAdmin):
#     list_display = ('id', 'training_session', 'user', 'date', 'session_name', 'emoji_feedback') 
#     list_filter = ('date', 'user')
#     search_fields = ('training_session__user__username', 'session_name')
