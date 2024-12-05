# backend/api/consumers.py

import logging
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.exceptions import DenyConnection

logger = logging.getLogger(__name__)

class WorkoutPlanConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            # Get user from scope (set by TokenAuthMiddleware)
            self.user = self.scope["user"]
            self.user_id = self.scope['url_route']['kwargs']['user_id']

            # Verify authentication
            if self.user.is_anonymous:
                raise DenyConnection("Authentication required")

            # Verify user_id matches authenticated user
            if str(self.user.id) != str(self.user_id):
                raise DenyConnection("User ID mismatch")

            # Set up room name and group name
            self.room_name = f"workout_plan_{self.user_id}"
            self.room_group_name = f"workout_plan_group_{self.user_id}"

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            # Accept the connection
            await self.accept()

            # Send welcome message
            await self.send(text_data=json.dumps({
                "type": "connection_established",
                "message": "Connected to workout plan socket",
                "user_id": self.user_id
            }))

            logger.info(f"WorkoutPlanConsumer: User {self.user.username} connected to room {self.room_group_name}")

        except DenyConnection as e:
            logger.warning(f"WorkoutPlanConsumer: Connection denied - {str(e)}")
            await self.close()
        except Exception as e:
            logger.error(f"WorkoutPlanConsumer: Error during connection - {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WorkoutPlanConsumer: User {self.user.username} disconnected from room {self.room_group_name} with code {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.info(f"WorkoutPlanConsumer: Received message from user {self.user_id}: {data}")

            # Handle different message types if necessary
            # For now, just echo the message back
            await self.send(text_data=json.dumps({
                "type": "echo",
                "message": data,
                "user_id": self.user_id
            }))

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON format"
            }))
        except Exception as e:
            logger.error(f"WorkoutPlanConsumer: Error processing message - {str(e)}")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Internal server error"
            }))

    async def workout_plan_generated(self, event):
        """
        Handler for workout plan generated messages.
        """
        logger.info(f"WorkoutPlanConsumer: Sending workout plan to user {self.user.username}")
        await self.send(text_data=json.dumps({
            "type": "workout_plan_completed",
            "plan_data": event["plan_data"],
            "created_at": event["created_at"]
        }))
