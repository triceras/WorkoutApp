# backend/api/consumers.py

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class WorkoutPlanConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Called when the websocket is handshaking as part of initial connection.
        """
        logger.info("Attempting WebSocket connection...")

        user = self.scope['user']
        if user.is_anonymous:
            logger.error("Anonymous user attempted to connect. Connection rejected.")
            await self.close(code=4001)  # Custom close code for unauthenticated users
            return

        try:
            # Extract user_id from URL route
            self.user_id = self.scope['url_route']['kwargs']['user_id']
            logger.info(f"Connection attempt for user_id: {self.user_id}, authenticated user_id: {user.id}")

            # Verify that the user_id in the URL matches the authenticated user's ID
            if str(user.id) != str(self.user_id):
                logger.error(f"User ID mismatch: token user {user.id} != requested user {self.user_id}")
                await self.close(code=4003)  # Custom close code for mismatched user IDs
                return

            # Define the group name based on user ID
            self.group_name = f"user_{self.user_id}"

            # Add the WebSocket connection to the group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            # Accept the WebSocket connection
            await self.accept()
            logger.info(f"WebSocket connection accepted for user {self.user_id}")

            # Optionally, send a welcome message or confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Successfully connected to workout plan service',
                'user_id': self.user_id
            }))

        except Exception as e:
            logger.error(f"Error during WebSocket connection: {str(e)}", exc_info=True)
            await self.close(code=4000)  # Custom close code for general errors

    async def disconnect(self, close_code):
        """
        Called when the WebSocket connection is closed.
        """
        try:
            if hasattr(self, 'group_name'):
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name
                )
                logger.info(f"WebSocket connection closed and removed from group {self.group_name} for user {self.user_id}")
        except Exception as e:
            logger.error(f"Error during WebSocket disconnection: {str(e)}", exc_info=True)

    async def receive(self, text_data):
        """
        Called when a message is received from the WebSocket.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            logger.debug(f"Received message of type: {message_type} from user {self.user_id}")

            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'Server is alive'
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from user {self.user_id}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing message from user {self.user_id}: {str(e)}", exc_info=True)
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    async def workout_message(self, event):
        """
        Handles messages sent to the WebSocket group.
        """
        message_type = event.get('message_type')
        message = event.get('message')
        plan_data = event.get('plan_data')
        plan_id = event.get('plan_id')
        user_id = event.get('user_id')

        logger.debug(f"Handling {message_type} message for user {user_id}")

        if message_type == 'workout_plan_completed':
            await self.send(text_data=json.dumps({
                'type': 'workout_plan_completed',
                'plan_id': plan_id,
                'plan_data': plan_data
            }))
        elif message_type == 'error':
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': message
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': message_type,
                'message': message
            }))

    async def profile_picture_ready(self, event):
        """
        Called when a profile picture has been generated.
        Sends the notification to the WebSocket client.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'profile_picture_ready',
                'message': event.get('message', 'Your profile picture has been generated successfully!')
            }))
            logger.info(f"Sent profile picture ready notification to user {self.user_id}")
        except Exception as e:
            logger.error(f"Error sending profile picture ready notification to user {self.user_id}: {str(e)}", exc_info=True)
