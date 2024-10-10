# backend/api/consumers.py

from channels.generic.websocket import AsyncJsonWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class WorkoutPlanConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
        else:
            self.group_name = f'workout_plan_{user.id}'
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            logger.info(f"User {user.username} connected to WebSocket.")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"User {self.scope['user'].username} disconnected from WebSocket.")

    async def workout_plan_generated(self, event):
        plan_data = event['plan_data']
        await self.send_json({
            'type': 'workout_plan_generated',
            'plan_data': plan_data
        })
        logger.info(f"Sent workout plan to user {self.scope['user'].username} via WebSocket.")
