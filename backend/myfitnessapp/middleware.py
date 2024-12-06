# backend/api/middleware.py

import logging
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
import urllib.parse

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(token_key):
    try:
        if token_key:
            token_key = token_key.strip()
            if token_key.lower().startswith('token '):
                token_key = token_key[6:].strip()
            
            logger.debug(f"TokenAuthMiddleware: Processing token: {token_key[:8]}...")
            token = Token.objects.get(key=token_key)
            logger.debug(f"TokenAuthMiddleware: Authenticated user {token.user.username} via token")
            return token.user
        else:
            logger.warning("TokenAuthMiddleware: Empty token provided")
            return AnonymousUser()
    except Token.DoesNotExist:
        logger.warning(f"TokenAuthMiddleware: Invalid token: {token_key[:8]}...")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"TokenAuthMiddleware: Error processing token: {str(e)}")
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom token authentication middleware for Channels 3.x.
    Handles token-based authentication for WebSocket connections.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope['query_string'].decode()
        query_params = urllib.parse.parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]

        scope['user'] = await get_user(token_key)
        if not scope['user'].is_anonymous:
            logger.debug(f"TokenAuthMiddleware: Authenticated WebSocket connection for user {scope['user'].username}")
        else:
            logger.warning("TokenAuthMiddleware: Anonymous user - invalid token")

        return await super().__call__(scope, receive, send)
