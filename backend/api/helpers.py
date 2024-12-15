# backend/api/helpers.py

import requests
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError
import logging
from channels.layers import get_channel_layer
import re
import ssl
from threading import Semaphore
from concurrent.futures import ThreadPoolExecutor, as_completed
from asgiref.sync import async_to_sync
import time


logger = logging.getLogger(__name__)

YOUTUBE_API_KEY = settings.YOUTUBE_API_KEY  # Ensure this is set in your settings

CACHE_TTL = 60 * 60 * 24 * 7 # cache for 7 days

# In backend/api/helpers.py

EXERCISE_NAME_MAPPING = {
    # Basic exercises
    "push up": "push-up",
    "push_up": "push-up",
    "pushups": "push-up",
    "push_ups": "push-up",
    "push-ups": "push-up",
    
    # Squats
    "squat": "squat",
    "squats": "squat",
    "barbell squat": "barbellsquats",
    "barbell squats": "barbellsquats",
    "barbell-squat": "barbellsquats",
    "barbellsquat": "barbellsquats",
    "barbellsquats": "barbellsquats",
    
    # Core
    "sit up": "sit-up",
    "sit_up": "sit-up",
    "situp": "sit-up",
    "sit-ups": "sit-up",
    "situps": "sit-up",
    "plank": "plank",
    
    # Back exercises
    "bent over row": "bentoverrows",
    "bentover row": "bentoverrows",
    "bent-over row": "bentoverrows",
    "barbell row": "barbellrows",
    
    # Chest exercises
    "bench press": "barbellbenchpress",
    "barbell bench": "barbellbenchpress",
    "barbell bench press": "barbellbenchpress",
    
    # Arms
    "bicep curl": "bicepcurls",
    "bicep curls": "bicepcurls",
    "tricep extension": "tricepoverheadextension",
    "tricep extensions": "tricepoverheadextension",
    
    # Shoulders
    "shoulder press": "shoulderpress",
    "overhead press": "shoulderpress",
    "military press": "shoulderpress",
    "lateral raises": "lateralraises",
    "lateral raise": "lateralraises",
    "side raises": "lateralraises",
    "side raise": "lateralraises",
    
    # Legs
    "deadlift": "deadlifts",
    "deadlifts": "deadlifts",
    "leg press": "legpress",
    "lunge": "lunges",
    "lunges": "lunges",
}

def standardize_exercise_name(exercise_name):
    """
    Standardizes the exercise name by removing non-alphanumeric characters,
    converting to lowercase, and checking against the mapping dictionary.
    """
    if not exercise_name:
        return exercise_name
        
    # Convert to lowercase and remove extra whitespace
    exercise_name = exercise_name.lower().strip()
    
    # Try direct lookup first
    if exercise_name in EXERCISE_NAME_MAPPING:
        return EXERCISE_NAME_MAPPING[exercise_name]
        
    # Try with spaces replaced by hyphens
    hyphenated = exercise_name.replace(' ', '-')
    if hyphenated in EXERCISE_NAME_MAPPING:
        return EXERCISE_NAME_MAPPING[hyphenated]
        
    # Try with spaces removed
    normalized = re.sub(r'[^a-z]', '', exercise_name)
    if normalized in EXERCISE_NAME_MAPPING:
        return EXERCISE_NAME_MAPPING[normalized]
        
    # Try with spaces replaced by nothing
    nospaces = exercise_name.replace(' ', '')
    if nospaces in EXERCISE_NAME_MAPPING:
        return EXERCISE_NAME_MAPPING[nospaces]
    
    # If no mapping found, normalize the name by removing special characters and spaces
    return re.sub(r'[^a-z]', '', exercise_name)

MAX_CONCURRENT_CALLS = 5  # Adjust based on rate limits
MAX_THREADS = getattr(settings, 'MAX_THREADS', 10)  # Default to 10 if not set

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
        # Log the API call details
        logger.info(f"Making YouTube API call: GET {url} with params {params}")

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        # Optionally, log the response status
        logger.info(f"YouTube API response status code: {response.status_code}")

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
        logger.info(f"Fetched video data from YouTube API for '{query}'.")
        return video_data
    except requests.RequestException as e:
        logger.error(f"Error fetching YouTube video data for query '{query}': {e}", exc_info=True)
        return None


# Create an SSL context that loads the default system certificates
ssl_context = ssl.create_default_context()

def get_video_id(exercise_name):
    """
    Synchronously fetch the video ID for an exercise from the database, cache, or YouTube API.
    """
    from .models import YouTubeVideo  # Import here to avoid circular imports
    
    standard_name = standardize_exercise_name(exercise_name)

    # First, check the database
    try:
        video = YouTubeVideo.objects.get(exercise_name=standard_name)
        logger.info(f"Retrieved video for '{standard_name}' from database.")
        return standard_name, video.video_id
    except YouTubeVideo.DoesNotExist:
        logger.info(f"Video for '{standard_name}' not found in database. Checking cache.")

    # Then check the cache
    cache_key = f'youtube_video_{standard_name}'
    video_data = cache.get(cache_key)

    if video_data:
        logger.info(f"Retrieved video for '{standard_name}' from cache.")
        return standard_name, video_data.get('video_id')

    logger.info(f"Cache MISS for '{standard_name}'. Making API call.")

    # Proceed with API call
    video_data = fetch_youtube_video_from_api(exercise_name)
    if video_data:
        # Save to cache
        cache.set(cache_key, video_data, CACHE_TTL)
        logger.info(f"Cached video for '{standard_name}' with video ID '{video_data['video_id']}'.")

        # Save to database
        video_data['exercise_name'] = standard_name  # Add exercise name to video data
        cache_youtube_video(video_data)  # Use the cache function to save to DB
        logger.info(f"Saved video for '{standard_name}' to the database.")

        return standard_name, video_data['video_id']
    else:
        logger.warning(f"No video found for '{exercise_name}'.")
        return standard_name, None

def cache_youtube_video(video_data):
    """
    Caches YouTube video data both in the cache and the database.
    """
    from .models import YouTubeVideo  # Import here to avoid circular imports
    
    if not video_data:
        return None

    cache_key = f'youtube_video_{video_data["video_id"]}'
    cache.set(cache_key, video_data, CACHE_TTL)
    logger.info(f"Cached video ID {video_data['video_id']} with TTL of 24 hours.")
    
    try:
        video, created = YouTubeVideo.objects.get_or_create(
            video_id=video_data['video_id'],
            defaults={
                'exercise_name': video_data.get('exercise_name', ''),
                'title': video_data.get('title', ''),
                'thumbnail_url': video_data.get('thumbnail_url', ''),
                'video_url': video_data.get('video_url', '')
            }
        )
        
        if not created and video.exercise_name != video_data.get('exercise_name'):
            video.exercise_name = video_data['exercise_name']
            video.save()
            
        return video_data
    except Exception as e:
        logger.error(f"Error caching video data: {str(e)}")
        return None

def get_youtube_video(query):
    """
    Retrieves YouTube video data for a given query from the database, cache, or API.
    """
    from .models import YouTubeVideo  # Import here to avoid circular imports
    
    standard_name = standardize_exercise_name(query)
    logger.info(f"Looking for video data for '{standard_name}'")

    # 1. Check the database
    try:
        video = YouTubeVideo.objects.get(exercise_name=standard_name)
        logger.info(f"Retrieved video for '{standard_name}' from database.")
        return {
            'video_id': video.video_id,
            'exercise_name': standard_name,
            'title': video.title,
            'thumbnail_url': video.thumbnail_url,
            'video_url': video.video_url,
            'cached_at': video.cached_at,
        }
    except YouTubeVideo.DoesNotExist:
        logger.info(f"No video found in database for '{standard_name}'. Checking cache.")

    # 2. Check the cache
    cache_key = f'youtube_video_{standard_name}'
    video_data = cache.get(cache_key)
    if video_data:
        logger.info(f"Retrieved video for '{standard_name}' from cache.")
        # Optionally, save to database for future requests
        YouTubeVideo.objects.create(
            exercise_name=standard_name,
            video_id=video_data['video_id'],
            title=video_data['title'],
            thumbnail_url=video_data['thumbnail_url'],
            video_url=video_data['video_url'],
            cached_at=timezone.now()
        )
        return video_data

    # 3. Make YouTube API call
    logger.info(f"No video in cache for '{standard_name}'. Fetching from YouTube API.")
    video_data = fetch_youtube_video_from_api(standard_name)
    if video_data:
        # Save to database
        YouTubeVideo.objects.create(
            exercise_name=standard_name,
            video_id=video_data['video_id'],
            title=video_data['title'],
            thumbnail_url=video_data['thumbnail_url'],
            video_url=video_data['video_url'],
            cached_at=timezone.now()
        )
        # Save to cache
        cache.set(cache_key, video_data, CACHE_TTL)
        logger.info(f"Cached and saved video data for '{standard_name}'.")
        return video_data
    else:
        logger.warning(f"Failed to retrieve video data for '{standard_name}' from YouTube API.")
        return None


def get_video_data_by_id(video_id):
    """
    Retrieves video data for a given video_id, checking cache and database before making an API call.
    """
    if not video_id:
        return None

    # Try to get from cache first
    cache_key = f'youtube_video_data_{video_id}'
    video_data = cache.get(cache_key)
    if video_data:
        logger.info(f"Retrieved video data for ID '{video_id}' from cache.")
        return video_data

    try:
        # Get from database, using first() instead of get() to handle duplicates
        video = YouTubeVideo.objects.filter(video_id=video_id).order_by('-cached_at').first()
        if video:
            video_data = {
                'video_id': video.video_id,
                'title': video.title,
                'thumbnail_url': video.thumbnail_url,
                'video_url': video.video_url,
                'cached_at': video.cached_at
            }
            # Cache the result
            cache.set(cache_key, video_data, timeout=CACHE_TTL)
            logger.info(f"Retrieved video data for ID '{video_id}' from database.")
            return video_data

        # If not in database, fetch from YouTube API
        video_data = fetch_youtube_video_by_id(video_id)
        if video_data:
            # Cache the result
            cache.set(cache_key, video_data, timeout=CACHE_TTL)
            logger.info(f"Retrieved and cached video data for ID '{video_id}' from YouTube API.")
            return video_data

    except Exception as e:
        logger.error(f"Error getting video data for ID '{video_id}': {str(e)}")

    return None

def cache_youtube_video_by_id(video_data):
    """
    Caches YouTube video data both in the cache and the database.
    """
    if not video_data:
        return
    cache_key = f'youtube_video_id_{video_data["video_id"]}'
    cache.set(cache_key, video_data, CACHE_TTL)
    logger.info(f"Cached video data for video_id '{video_data["video_id"]}' with TTL of {CACHE_TTL} seconds.")

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
        logger.info(f"Saved video data for video_id '{video_data['video_id']}' to the database.")
    except IntegrityError as e:
        logger.error(f"Database error while saving video data for video_id '{video_data['video_id']}': {e}", exc_info=True)

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

def send_workout_plan_to_group(user, plan_data):
    """
    Sends the workout plan to the user's group via Channels.

    Args:
        user: A User object.
        plan_data: The workout plan data dictionary.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.error("Channel layer is not configured.")
            return

        group_name = f'workout_plan_{user.id}'

        # Ensure we're sending the complete plan data
        message = {
            'type': 'workout_message',
            'message_type': 'workout_plan_completed',
            'plan_data': plan_data,
            'user_id': str(user.id)
        }

        logger.info(f"Sending workout plan to group {group_name}")
        logger.debug(f"Message content: {message}")

        async_to_sync(channel_layer.group_send)(group_name, message)
        
        logger.info(f"Workout plan sent to group: {group_name}")
    except Exception as e:
        logger.error(f"Error sending workout plan to group: {e}", exc_info=True)
        raise

def assign_video_ids_to_exercise_list(exercise_list):
    """
    Assigns YouTube video IDs to a list of exercises using standardized names.
    """
    # Create a mapping from standardized names to exercises
    exercise_standard_name_map = {}
    for exercise in exercise_list:
        original_name = exercise.get('name')
        if original_name:
            standardized_name = standardize_exercise_name(original_name)
            if standardized_name not in exercise_standard_name_map:
                exercise_standard_name_map[standardized_name] = []
            exercise_standard_name_map[standardized_name].append(exercise)
        else:
            exercise['videoId'] = None
            logger.warning("Exercise name is missing.")

    # Process each unique standardized exercise name
    for standardized_name, exercises in exercise_standard_name_map.items():
        # Get video data
        video_data = get_youtube_video(standardized_name)
        video_id = video_data.get('video_id') if video_data else None

        # Assign video ID to all exercises with this standardized name
        for exercise in exercises:
            if video_id:
                exercise['videoId'] = video_id
                logger.info(f"Assigned videoId '{video_id}' to exercise '{exercise['name']}'.")
            else:
                # Explicitly set to null if no video ID is found
                exercise['videoId'] = None
                logger.warning(f"No video ID found for exercise '{exercise['name']}'.")


def assign_video_ids_to_exercises(workout_plan_data):
    """
    Assigns YouTube video IDs to all exercises in the workout plan.
    """
    if not workout_plan_data or 'workoutDays' not in workout_plan_data:
        logger.warning("No workout days found in plan data")
        return workout_plan_data

    all_exercises = []
    for day in workout_plan_data.get('workoutDays', []):
        if day.get('type') == 'workout':  # Only process workout days
            exercises = day.get('exercises', [])
            all_exercises.extend(exercises)

    # Process exercises in batches to respect rate limits
    batch_size = MAX_CONCURRENT_CALLS
    for i in range(0, len(all_exercises), batch_size):
        batch = all_exercises[i:i + batch_size]
        assign_video_ids_to_exercise_list(batch)
        # Add a small delay between batches to respect rate limits
        if i + batch_size < len(all_exercises):
            time.sleep(1)  # 1 second delay between batches

    # Verify all exercises have videoId
    for day in workout_plan_data.get('workoutDays', []):
        if day.get('type') == 'workout':
            for exercise in day.get('exercises', []):
                if not exercise.get('videoId'):
                    # Try to get video ID one more time
                    video_data = get_youtube_video(exercise.get('name', ''))
                    if video_data and video_data.get('video_id'):
                        exercise['videoId'] = video_data['video_id']
                        logger.info(f"Successfully assigned videoId for exercise {exercise.get('name')}")
                    else:
                        logger.warning(f"Could not assign videoId for exercise {exercise.get('name')}")

    return workout_plan_data

def assign_video_ids_to_session(session_data):
    assign_video_ids_to_exercise_list(session_data.get('exercises', []))


def fetch_youtube_video_by_id(video_id):
    """
    Fetches YouTube video details from the YouTube Data API based on a video_id.
    """
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {
        'part': 'snippet',
        'id': video_id,
        'key': YOUTUBE_API_KEY,
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        items = data.get('items')
        if not items:
            logger.warning(f"No data found for video_id: {video_id}")
            return None
        item = items[0]
        snippet = item['snippet']
        video_data = {
            'video_id': video_id,
            'title': snippet['title'],
            'thumbnail_url': snippet['thumbnails']['high']['url'],
            'video_url': f"https://www.youtube.com/watch?v={video_id}",
            'cached_at': timezone.now()
        }
        logger.info(f"Fetched video data from YouTube API for video_id '{video_id}'.")
        return video_data
    except requests.RequestException as e:
        logger.error(f"Error fetching YouTube video data for video_id '{video_id}': {e}", exc_info=True)
        return None
