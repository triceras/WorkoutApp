# api/urls.py

from django.urls import path, include
from rest_framework import routers
from .views import (
    ExerciseViewSet,
    WorkoutPlanViewSet,
    WorkoutLogViewSet,
    current_user,
    CustomAuthToken,
    register_user,
    verify_token,
    logout_user
)

router = routers.DefaultRouter()
router.register(r'exercises', ExerciseViewSet)
router.register(r'workout-plans', WorkoutPlanViewSet, basename='workoutplan')
router.register(r'workout-logs', WorkoutLogViewSet, basename='workoutlog')


urlpatterns = [
    path('user/', current_user),
    path('auth/login/', CustomAuthToken.as_view()),
    path('register/', register_user, name='register'),
    path('auth/verify-token/', verify_token, name='verify-token'),
    path('logout/', logout_user, name='logout'),
    path('', include(router.urls)),
]
