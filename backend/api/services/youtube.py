from googleapiclient.discovery import build
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from ..models import YouTubeVideo
import logging

logger = logging.getLogger(__name__)

class YouTubeService:
    """Service for handling YouTube API interactions."""
    
    def __init__(self):
        self.youtube = build('youtube', 'v3', 
                           developerKey=settings.YOUTUBE_API_KEY)
        self.cache_timeout = 86400 * 7  # 1 week
        
    def search_exercise_video(self, exercise_name):
        """Search for exercise video and return details."""
        cache_key = f'youtube_search_{exercise_name}'
        cached = cache.get(cache_key)
        
        if cached:
            return cached
            
        try:
            response = self.youtube.search().list(
                part="snippet",
                maxResults=1,
                q=f"{exercise_name} exercise tutorial form guide",
                type="video"
            ).execute()
            
            if not response.get('items'):
                return None
                
            video = response['items'][0]
            video_data = {
                'video_id': video['id']['videoId'],
                'title': video['snippet']['title'],
                'thumbnail_url': video['snippet']['thumbnails']['high']['url'],
                'video_url': f"https://youtube.com/watch?v={video['id']['videoId']}"
            }
            
            # Save to database
            YouTubeVideo.objects.update_or_create(
                video_id=video_data['video_id'],
                defaults={
                    'exercise_name': exercise_name,
                    'title': video_data['title'],
                    'thumbnail_url': video_data['thumbnail_url'],
                    'video_url': video_data['video_url'],
                    'cached_at': timezone.now()
                }
            )
            
            # Cache the result
            cache.set(cache_key, video_data, self.cache_timeout)
            return video_data
            
        except Exception as e:
            logger.error(f"YouTube API error: {str(e)}")
            return None
