from django.core.management.base import BaseCommand
from django.db.models import Count
from api.models import YouTubeVideo
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Cleans up duplicate YouTube videos in the database, keeping the most recently cached version'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Find video_ids with multiple entries
                duplicates = (
                    YouTubeVideo.objects.values('video_id')
                    .annotate(count=Count('id'))
                    .filter(count__gt=1)
                )

                total_duplicates = 0
                videos_deleted = 0

                for duplicate in duplicates:
                    video_id = duplicate['video_id']
                    count = duplicate['count']
                    total_duplicates += 1

                    # Get all entries for this video_id, ordered by cached_at
                    videos = YouTubeVideo.objects.filter(
                        video_id=video_id
                    ).order_by('-cached_at')

                    # Keep the most recent one and delete the rest
                    most_recent = videos.first()
                    if most_recent:
                        # Delete all other entries
                        deleted_count = videos.exclude(id=most_recent.id).delete()[0]
                        videos_deleted += deleted_count

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Cleaned up {deleted_count} duplicate entries for video {video_id}'
                            )
                        )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'\nCleanup complete!\n'
                        f'Found {total_duplicates} videos with duplicates\n'
                        f'Deleted {videos_deleted} duplicate entries\n'
                        f'Remaining entries: {YouTubeVideo.objects.count()}'
                    )
                )

        except Exception as e:
            logger.error(f"Error cleaning up duplicate videos: {str(e)}", exc_info=True)
            self.stdout.write(
                self.style.ERROR(f'Failed to clean up duplicate videos: {str(e)}')
            )
