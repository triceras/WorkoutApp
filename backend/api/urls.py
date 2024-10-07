# backend/api/urls.py

from django.urls import path, include
from rest_framework import routers
from .views import (
    ExerciseViewSet,
    WorkoutPlanViewSet,
    WorkoutLogViewSet,
    current_user,
    CustomAuthToken,
    logout_user,
    check_workout_plan_status,
    UserViewSet,
    user_progression,
    SessionFeedbackViewSet,
    ExerciseLogViewSet,
    TrainingSessionViewSet, 
    RegisterView,
    StrengthGoalViewSet,
    EquipmentViewSet
)

router = routers.DefaultRouter()
router.register(r'exercises', ExerciseViewSet, basename='exercise')
router.register(r'workout-plans', WorkoutPlanViewSet, basename='workoutplan')
router.register(r'workout-logs', WorkoutLogViewSet, basename='workoutlog')
router.register(r'exercise-logs', ExerciseLogViewSet, basename='exerciselog')
router.register(r'training-sessions', TrainingSessionViewSet, basename='trainingsession')
router.register(r'session-feedback', SessionFeedbackViewSet, basename='sessionfeedback')
router.register(r'strength-goals', StrengthGoalViewSet, basename='strengthgoal')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('user/', current_user),
    path('auth/login/', CustomAuthToken.as_view()),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', logout_user, name='logout'),
    path('check-workout-plan/', check_workout_plan_status, name='check-workout-plan'),
    path('user/progression/', user_progression, name='user-progression'),
    path('', include(router.urls)),
]
