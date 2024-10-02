# backend/api/consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
import json

class WorkoutPlanConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'workout_plan_{self.user_id}'

        # Join the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        print(f"WebSocket connected: {self.group_name}")

    async def disconnect(self, close_code):
        # Leave the group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print(f"WebSocket disconnected: {self.group_name}")

    # Receive message from group
    async def workout_plan_generated(self, event):
        plan_data = event['plan_data']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'plan_data': plan_data
        }))
