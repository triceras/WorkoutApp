# backend/api/apps.py

from django.apps import AppConfig

class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        import api.signals  # Ensure signal handlers are registered
