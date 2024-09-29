# myfitnessapp/urls.py

from django.contrib import admin
from django.urls import path, include
# Removed the faulty import
# from api.views import get_workout_plan

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # Include the URLs from your api app
    # Removed the faulty URL pattern
    # path('api/workout-plan/', get_workout_plan, name='get-workout-plan'),
    path('auth/', include('allauth.urls')),
]
