# backend/api/middleware.py

import logging
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_token(token_key):
    try:
        # Remove 'Token ' prefix and any whitespace if present
        if token_key:
            token_key = token_key.strip()
            if token_key.lower().startswith('token '):
                token_key = token_key[6:].strip()
            
            logger.info(f"TokenAuthMiddleware: Processing token: {token_key[:8]}...")
            token = Token.objects.get(key=token_key)
            logger.info(f"TokenAuthMiddleware: Authenticated user {token.user.username} via token")
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

class TokenAuthMiddleware:
    """
    Custom token authentication middleware for Channels 3.x.
    Handles token-based authentication for WebSocket connections.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        try:
            # Get query string and parse it
            query_string = scope.get('query_string', b'').decode()
            parsed_query = parse_qs(query_string)
            
            # Get token from query parameters
            token_key = parsed_query.get('token', [None])[0]
            
            if token_key:
                # Get user from token
                scope['user'] = await get_user_from_token(token_key)
                if not scope['user'].is_anonymous:
                    logger.info(f"TokenAuthMiddleware: Authenticated WebSocket connection for user {scope['user'].username}")
                else:
                    logger.warning("TokenAuthMiddleware: Anonymous user - invalid token")
            else:
                scope['user'] = AnonymousUser()
                logger.warning("TokenAuthMiddleware: No token provided in WebSocket connection")
            
            return await self.inner(scope, receive, send)
        except Exception as e:
            logger.error(f"TokenAuthMiddleware: Unexpected error: {str(e)}")
            scope['user'] = AnonymousUser()
            return await self.inner(scope, receive, send)
