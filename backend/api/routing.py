# backend/api/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/workout_plan/(?P<user_id>\d+)/$', consumers.WorkoutPlanConsumer.as_asgi()),
]
