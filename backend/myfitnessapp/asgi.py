# backend/myfitnessapp/asgi.py

import os
import django

# 1. Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myfitnessapp.settings')

# 2. Setup Django
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from api.routing import websocket_urlpatterns
from api.middleware import TokenAuthMiddleware  # Ensure this is after django.setup()
from django.core.asgi import get_asgi_application
from channels.routing import URLRouter
from django.urls import path, re_path

# 3. Initialize Django ASGI application
django_asgi_app = get_asgi_application()

# 4. Define the Protocol Type Router
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddleware(
            URLRouter([
                re_path(r'^ws/', URLRouter(websocket_urlpatterns)),
            ])
        )
    ),
})
