# backend/api/routing.py

from django.urls import re_path
from .consumers import WorkoutPlanConsumer

websocket_urlpatterns = [
    re_path(r'ws/workout-plan/$', WorkoutPlanConsumer.as_asgi()),
]
