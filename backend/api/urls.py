# backend/api/urls.py

from django.urls import path, include
from rest_framework import routers
from .views import (
    ExerciseViewSet,
    WorkoutPlanViewSet,
    WorkoutLogViewSet,
    TrainingSessionViewSet,
    WorkoutSessionViewSet,
    current_user,
    CustomAuthToken,
    RegisterView,  
    verify_token,
    logout_user,
    check_workout_plan_status,
    UserViewSet,
    user_progression
)

router = routers.DefaultRouter()
router.register(r'exercises', ExerciseViewSet)
router.register(r'workout-plans', WorkoutPlanViewSet, basename='workoutplan')
router.register(r'workout-logs', WorkoutLogViewSet, basename='workoutlog')
router.register(r'workout-sessions', WorkoutSessionViewSet, basename='workoutsessions')
router.register(r'user', UserViewSet, basename='user')
router.register(r'training_sessions', TrainingSessionViewSet, basename='training_sessions')

urlpatterns = [
    path('user/', current_user),
    path('auth/login/', CustomAuthToken.as_view()),
    path('register/', RegisterView.as_view(), name='register'),  # Updated line
    path('auth/verify-token/', verify_token, name='verify-token'),
    path('logout/', logout_user, name='logout'),
    path('check-workout-plan/', check_workout_plan_status, name='check-workout-plan'),
    path('user/progression/', user_progression, name='user-progression'),
    path('', include(router.urls)),
]
