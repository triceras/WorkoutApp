import asyncio
import websockets
import json

async def listen_workout_plan(user_id):
    uri = f"ws://localhost:8000/ws/workout_plan/{user_id}/"
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket.")
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            print("Received workout plan:", data['plan_data'])

user_id = 27  # Replace with actual user ID
asyncio.get_event_loop().run_until_complete(listen_workout_plan(user_id))

