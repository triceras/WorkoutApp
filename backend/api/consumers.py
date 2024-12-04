# backend/api/consumers.py

import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)

class WorkoutPlanConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            logger.warning("WorkoutPlanConsumer: Anonymous user attempted to connect. Closing connection.")
            await self.close()
        else:
            self.group_name = f'workout_plan_{user.id}'
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            logger.info(f"WorkoutPlanConsumer: User {user.username} connected and joined group '{self.group_name}'.")

    async def disconnect(self, close_code):
        user = self.scope["user"]
        if not user.is_anonymous:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(f"WorkoutPlanConsumer: User {user.username} disconnected and left group '{self.group_name}'.")

    async def workout_plan_generated(self, event):
        """
        Handles the 'workout_plan_generated' event sent by the backend.
        """
        try:
            # Send the workout plan data to the frontend
            await self.send_json({
                'type': event['type'],
                'plan_id': event['plan_id'],
                'plan_data': event['plan_data'],
                'additional_tips': event['additional_tips'],
                'created_at': event['created_at'],
            })
            logger.info(f"WorkoutPlanConsumer: Sent workout plan to user {self.scope['user'].username} via WebSocket.")
        except KeyError as e:
            logger.error(f"WorkoutPlanConsumer: Missing key {e} in event data.")
        except Exception as e:
            logger.error(f"WorkoutPlanConsumer: Error sending workout plan: {e}", exc_info=True)

    async def receive_json(self, content, **kwargs):
        """
        Optionally handle messages received from the WebSocket client.
        """
        logger.info(f"WorkoutPlanConsumer: Received message from client: {content}")
        # Process the received message if needed
