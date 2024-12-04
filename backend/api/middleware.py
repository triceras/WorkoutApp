# backend/api/middleware.py

import logging
import urllib.parse
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = urllib.parse.parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]

        if token_key:
            user = await get_user(token_key)
            if user and not user.is_anonymous:
                logger.info(f"TokenAuthMiddleware: Authenticated user {user.username} with token {token_key}")
            else:
                logger.warning(f"TokenAuthMiddleware: Invalid token {token_key}")
        else:
            logger.warning("TokenAuthMiddleware: No token provided in WebSocket connection")

        scope['user'] = await get_user(token_key)
        return await super().__call__(scope, receive, send)
