# backend/api/middleware.py

from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that authenticates users via token provided in query parameters.
    """

    async def __call__(self, scope, receive, send):
        logger.debug("New WebSocket connection attempt.")
        query_string = scope['query_string'].decode()
        params = parse_qs(query_string)
        token_key = params.get('token', [None])[0]
        logger.debug(f"Received token: {token_key}")

        if token_key:
            user = await get_user(token_key)
            logger.debug(f"User fetched: {user.username if not user.is_anonymous else 'Anonymous'}")
            scope['user'] = user
            if user.is_anonymous:
                logger.warning("WebSocket connection rejected: Invalid token.")
                await self.close()
            else:
                logger.info(f"WebSocket connection accepted for user {user.username}.")
        else:
            scope['user'] = AnonymousUser()
            logger.warning("WebSocket connection rejected: No token provided.")
            await self.close()

        return await super().__call__(scope, receive, send)
