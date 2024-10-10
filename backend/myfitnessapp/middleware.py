# backend/api/middleware.py

from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token

@database_sync_to_async
def get_user(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope['query_string'].decode()
        token_key = None

        if 'token=' in query_string:
            token_key = query_string.split('token=')[1]
        else:
            # Optionally handle cases where the token is not provided
            token_key = None

        scope['user'] = await get_user(token_key)
        return await super().__call__(scope, receive, send)
