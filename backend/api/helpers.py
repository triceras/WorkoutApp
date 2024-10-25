# backend/api/helpers.py

import requests
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError
from .models import YouTubeVideo  # Ensure you have this model defined
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import re
import aiohttp
from aiohttp import TCPConnector
import asyncio
import ssl


logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = settings.YOUTUBE_API_KEY  # Ensure this is set in your settings

CACHE_TTL = 60 * 60 * 24  # 24 hours in seconds

def fetch_youtube_video_from_api(query):
    """
    Fetches YouTube video details from the YouTube Data API based on a search query.
    """
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        'part': 'snippet',
        'q': query,
        'key': YOUTUBE_API_KEY,
        'maxResults': 1,
        'type': 'video',
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        items = data.get('items')
        if not items:
            logger.warning(f"No data found for query: {query}")
            return None
        item = items[0]
        snippet = item['snippet']
        video_id = item['id']['videoId']
        video_data = {
            'video_id': video_id,
            'title': snippet['title'],
            'thumbnail_url': snippet['thumbnails']['high']['url'],
            'video_url': f"https://www.youtube.com/watch?v={video_id}",
            'cached_at': timezone.now()
        }
        return video_data
    except requests.RequestException as e:
        logger.error(f"Error fetching YouTube video data for query '{query}': {e}", exc_info=True)
        return None


# Create an SSL context that loads the default system certificates
ssl_context = ssl.create_default_context()

async def fetch_video_id(session, exercise_name):
    """
    Asynchronously fetch the video ID for an exercise from YouTube API.
    """
    normalized_name = exercise_name.strip().lower()
    cache_key = f'youtube_video_{normalized_name}'
    video_data = cache.get(cache_key)

    if video_data:
        logger.info(f"Retrieved video for '{exercise_name}' from cache.")
        return exercise_name, video_data['video_id']

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        'part': 'snippet',
        'q': exercise_name,
        'key': YOUTUBE_API_KEY,
        'maxResults': 1,
        'type': 'video',
    }

    try:
        async with session.get(url, params=params, ssl=ssl_context) as response:
            if response.status == 200:
                data = await response.json()
                items = data.get('items', [])
                if items:
                    item = items[0]
                    video_id = item['id']['videoId']
                    video_data = {
                        'video_id': video_id,
                        'title': item['snippet']['title'],
                        'thumbnail_url': item['snippet']['thumbnails']['high']['url'],
                        'video_url': f"https://www.youtube.com/watch?v={video_id}",
                        'cached_at': timezone.now()
                    }
                    # Cache the video data
                    cache.set(cache_key, video_data, CACHE_TTL)
                    logger.info(f"Cached video for '{exercise_name}' with video ID '{video_id}'.")
                    return exercise_name, video_id
                else:
                    logger.warning(f"No video found for '{exercise_name}'.")
                    return exercise_name, None
            else:
                logger.error(f"Error fetching video for '{exercise_name}': {response.status}")
                return exercise_name, None
    except Exception as e:
        logger.error(f"Exception while fetching video for '{exercise_name}': {e}", exc_info=True)
        return exercise_name, None


def get_cached_youtube_video(video_id):
    """
    Retrieves cached YouTube video data from the cache.
    """
    cache_key = f'youtube_video_{video_id}'
    video_data = cache.get(cache_key)
    if video_data:
        logger.info(f"Retrieved video ID {video_id} from cache.")
        return video_data
    logger.info(f"Video ID {video_id} not found in cache.")
    return None

def cache_youtube_video(video_data):
    """
    Caches YouTube video data both in the cache and the database.
    """
    if not video_data:
        return
    cache_key = f'youtube_video_{video_data["video_id"]}'
    cache.set(cache_key, video_data, CACHE_TTL)
    logger.info(f"Cached video ID {video_data['video_id']} with TTL of 24 hours.")
    
    # Save to the database
    try:
        YouTubeVideo.objects.update_or_create(
            video_id=video_data['video_id'],
            defaults={
                'title': video_data['title'],
                'thumbnail_url': video_data['thumbnail_url'],
                'video_url': video_data['video_url'],
                'cached_at': video_data['cached_at']
            }
        )
        logger.info(f"Saved video ID {video_data['video_id']} to the database.")
    except IntegrityError as e:
        logger.error(f"Database error while saving video ID {video_data['video_id']}: {e}", exc_info=True)


# def assign_video_ids_to_exercises(workout_plan_data):
#     """
#     Assigns YouTube video IDs to each exercise in the workout plan data.
#     Fetches video IDs asynchronously.
#     """
#     async def fetch_all_video_ids(exercise_names):
#         ssl_context = ssl.create_default_context()
#         connector = TCPConnector(ssl=ssl_context)
#         async with aiohttp.ClientSession(connector=connector) as session:
#             tasks = [fetch_video_id(session, name) for name in exercise_names]
#             results = await asyncio.gather(*tasks)
#             return results

#     # Collect all unique exercise names
#     exercise_names = set()
#     for day in workout_plan_data.get('workoutDays', []):
#         for exercise in day.get('exercises', []):
#             exercise_name = exercise.get('name')
#             if exercise_name:
#                 exercise_names.add(exercise_name)

#     # Run the asynchronous fetching of video IDs
#     loop = asyncio.new_event_loop()
#     asyncio.set_event_loop(loop)
#     results = loop.run_until_complete(fetch_all_video_ids(exercise_names))
#     loop.close()

#     # Create a mapping from exercise names to video IDs
#     exercise_video_id_map = {name: video_id for name, video_id in results}

#     # Assign video IDs to exercises in the workout plan data
#     for day in workout_plan_data.get('workoutDays', []):
#         for exercise in day.get('exercises', []):
#             exercise_name = exercise.get('name')
#             if exercise_name:
#                 exercise['videoId'] = exercise_video_id_map.get(exercise_name)
#                 logger.info(f"Assigned videoId '{exercise['videoId']}' to exercise '{exercise_name}'.")
#             else:
#                 exercise['videoId'] = None
#                 logger.warning("Exercise name is missing.")

def get_youtube_video(query):
    """
    Retrieves YouTube video data for a given query, either from cache or by fetching from the API.
    """
    # Attempt to get from cache
    cache_key = f'youtube_video_{query}'
    video_data = cache.get(cache_key)
    if video_data:
        logger.info(f"Retrieved video for query '{query}' from cache.")
        return video_data

    # Fetch fresh data from API
    video_data = fetch_youtube_video_from_api(query)
    if video_data:
        # Cache the result
        cache.set(cache_key, video_data, CACHE_TTL)
        logger.info(f"Cached video for query '{query}' with TTL of 24 hours.")
    else:
        logger.warning(f"Failed to fetch data for query '{query}'.")

    return video_data


def get_youtube_video_id(url):
    """
    Extracts the video ID from a YouTube URL.

    Supported URL formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/v/VIDEO_ID

    Args:
        url (str): The YouTube video URL.

    Returns:
        str or None: The extracted video ID if found, else None.
    """
    regex_patterns = [
        r'youtu\.be/(?P<id>[^\?&]+)',
        r'youtube\.com/watch\?v=(?P<id>[^\?&]+)',
        r'youtube\.com/embed/(?P<id>[^\?&]+)',
        r'youtube\.com/v/(?P<id>[^\?&]+)',
    ]
    
    for pattern in regex_patterns:
        match = re.search(pattern, url)
        if match:
            return match.group('id')
    return None

def send_workout_plan_to_group(user, workout_plan):
    """
    Sends the workout plan to the user's group via Channels.

    Args:
        user: A User object.
        workout_plan (dict): The workout plan data.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.error("Channel layer is not configured.")
            return

        group_name = f'workout_plan_{user.id}'

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'workout_plan_generated',
                'plan_data': workout_plan, 
            }
        )
        logger.info(f"Workout plan sent to group: {group_name}")
    except Exception as e:
        logger.error(f"Error sending workout plan to group: {e}", exc_info=True)
        raise

def assign_video_ids_to_exercise_list(exercise_list):
    """
    Assigns YouTube video IDs to a list of exercises.
    """
    async def fetch_all_video_ids(exercise_names):
        ssl_context = ssl.create_default_context()
        connector = TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = [fetch_video_id(session, name) for name in exercise_names]
            results = await asyncio.gather(*tasks)
            return results

    # Collect all unique, normalized exercise names
    exercise_names = set()
    for exercise in exercise_list:
        exercise_name = exercise.get('name')
        if exercise_name:
            normalized_name = exercise_name.strip().lower()
            exercise_names.add(normalized_name)

    logger.info(f"Number of unique exercises: {len(exercise_names)}")

    # Run the asynchronous fetching of video IDs
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(fetch_all_video_ids(exercise_names))
    loop.close()

    # Create a mapping from exercise names to video IDs
    exercise_video_id_map = {name: video_id for name, video_id in results}

    # Assign video IDs to exercises
    for exercise in exercise_list:
        exercise_name = exercise.get('name')
        if exercise_name:
            exercise['videoId'] = exercise_video_id_map.get(exercise_name)
            logger.info(f"Assigned videoId '{exercise['videoId']}' to exercise '{exercise_name}'.")
        else:
            exercise['videoId'] = None
            logger.warning("Exercise name is missing.")

def assign_video_ids_to_exercises(workout_plan_data):
    for day in workout_plan_data.get('workoutDays', []):
        assign_video_ids_to_exercise_list(day.get('exercises', []))

def assign_video_ids_to_session(session_data):
    assign_video_ids_to_exercise_list(session_data.get('exercises', []))
