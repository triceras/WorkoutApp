# backend/myfitnessapp/asgi.py

import os
import django  # Add this import
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myfitnessapp.settings')
django.setup()  # Initialize Django

from api.middleware import TokenAuthMiddleware  # Import after django.setup()
from api.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': TokenAuthMiddleware(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
