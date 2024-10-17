# api/helpers.py

import os
import re
import logging
import requests
from django.core.cache import cache
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

def get_youtube_video_id(exercise_name):
    """
    Retrieves the YouTube video ID for a given exercise name using the YouTube Data API.

    Args:
        exercise_name (str): The name of the exercise (e.g., "Push Up").

    Returns:
        str or None: The YouTube video ID if found, else None.
    """
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        logger.error("YouTube API key not found. Please set the 'YOUTUBE_API_KEY' environment variable.")
        return None

    # Sanitize the cache key
    sanitized_name = sanitize_cache_key(exercise_name.lower())
    cache_key = f"youtube_video_id_{sanitized_name}"

    # Implement caching to reduce API calls
    video_id = cache.get(cache_key)
    if video_id:
        logger.debug(f"Cache hit for exercise '{exercise_name}': {video_id}")
        return video_id

    search_url = "https://www.googleapis.com/youtube/v3/search"

    params = {
        'part': 'id',
        'q': f"{exercise_name} exercise tutorial",
        'key': api_key,
        'maxResults': 1,
        'type': 'video',
        'videoEmbeddable': 'true'
    }

    try:
        response = requests.get(search_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        items = data.get('items', [])
        if not items:
            logger.warning(f"No YouTube videos found for exercise: {exercise_name}")
            return None

        video_id = items[0]['id']['videoId']
        logger.info(f"Found YouTube video ID '{video_id}' for exercise '{exercise_name}'")

        # Cache the result for future use (e.g., 7 days)
        cache.set(cache_key, video_id, timeout=60*60*24*7)
        logger.debug(f"Cached YouTube video ID for exercise '{exercise_name}': {video_id}")

        # Removed the call to sanitize_and_cache_youtube_video_id

        return video_id

    except requests.exceptions.RequestException as e:
        logger.error(f"Request exception occurred while accessing YouTube Data API: {e}")
    except KeyError:
        logger.error(f"Unexpected response structure: {data}")
    except Exception as e:
        logger.error(f"An unexpected error occurred in get_youtube_video_id: {e}")

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


def sanitize_cache_key(key):
    """
    Sanitizes a cache key by replacing or removing invalid characters.
    """
    # Replace any character that is not alphanumeric, hyphen, or underscore with '_'
    sanitized_key = re.sub(r'[^a-zA-Z0-9_-]', '_', key)
    return sanitized_key
