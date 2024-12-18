# backend/api/urls.py

from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
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
    ExerciseLogViewSet,
    TrainingSessionViewSet, 
    RegisterView,
    StrengthGoalViewSet,
    EquipmentViewSet,
    UserProgressionView,
    CheckUsernameView,
    CheckEmailView,
    get_video_details,
    YouTubeVideoViewSet,
    RegistrationOptionsView,
    fetch_video_for_exercise,
)

router = routers.DefaultRouter()
router.register(r'exercises', ExerciseViewSet, basename='exercise')
router.register(r'workout-plans', WorkoutPlanViewSet, basename='workoutplan')
router.register(r'workout-logs', WorkoutLogViewSet, basename='workoutlog')
router.register(r'exercise-logs', ExerciseLogViewSet, basename='exerciselog')
router.register(r'training_sessions', TrainingSessionViewSet, basename='trainingsession')
router.register(r'strength-goals', StrengthGoalViewSet, basename='strengthgoal')
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'users', UserViewSet, basename='user')
router.register(r'youtube-videos', YouTubeVideoViewSet, basename='youtubevideo')

urlpatterns = [
    path('user/', current_user),
    path('auth/login/', CustomAuthToken.as_view()),
    path('register/', RegisterView.as_view(), name='register'),
    path('registration-options/', RegistrationOptionsView.as_view(), name='registration-options'),
    path('logout/', logout_user, name='logout'),
    path('check-workout-plan/', check_workout_plan_status, name='check-workout-plan'),
    path('check_username/', CheckUsernameView.as_view(), name='check_username'),
    path('check_email/', CheckEmailView.as_view(), name='check_email'),
    path('user/progression/', UserProgressionView.as_view(), name='user-progression'),
    path('get-video-details/', get_video_details, name='get-video-details'),
    path('exercises/<int:exercise_id>/fetch-video/', fetch_video_for_exercise, name='fetch_video_for_exercise'),
    path('api-token-auth/', obtain_auth_token, name='api_token_auth'),  # Endpoint to obtain auth tokens

    path('', include(router.urls)),
]
