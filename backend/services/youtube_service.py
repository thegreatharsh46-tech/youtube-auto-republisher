import logging
import time
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from backend.utilities.errors import YouTubeAPIError, QuotaExceededError

logger = logging.getLogger(__name__)

class YouTubeService:
    """Handle YouTube Data API interactions"""
    
    def __init__(self, config):
        self.config = config
        self.youtube_api_key = config.YOUTUBE_API_KEY
        self.max_retries = 3
        self.backoff_factor = 2
    
    def build_service(self, credentials):
        """Build YouTube API service with credentials"""
        try:
            service = build('youtube', 'v3', credentials=credentials)
            return service
        except Exception as e:
            logger.error(f'Failed to build YouTube service: {str(e)}')
            raise YouTubeAPIError('Failed to initialize YouTube API')
    
    def _handle_api_error(self, error, retry_count=0):
        """Handle YouTube API errors with exponential backoff"""
        if hasattr(error, 'resp'):
            status = error.resp.status
            
            # Check for quota exceeded
            if status == 403:
                error_content = error.content.decode() if hasattr(error, 'content') else str(error)
                if 'quotaExceeded' in error_content:
                    logger.error('YouTube API quota exceeded')
                    raise QuotaExceededError()
            
            # Retry on server errors
            if status >= 500 and retry_count < self.max_retries:
                wait_time = self.backoff_factor ** retry_count
                logger.warning(f'YouTube API server error (status {status}), retrying in {wait_time}s')
                time.sleep(wait_time)
                return True  # Signal to retry
            
            # Retry on rate limit
            if status == 429 and retry_count < self.max_retries:
                wait_time = self.backoff_factor ** retry_count
                logger.warning(f'YouTube API rate limited, retrying in {wait_time}s')
                time.sleep(wait_time)
                return True  # Signal to retry
        
        return False  # Don't retry
    
    def get_channel_info(self, credentials):
        """Get authenticated user's YouTube channel information"""
        try:
            service = self.build_service(credentials)
            
            request = service.channels().list(
                part='snippet,contentDetails,statistics',
                mine=True
            )
            
            response = request.execute()
            
            if not response.get('items'):
                logger.error('No channel found for authenticated user')
                raise YouTubeAPIError('No YouTube channel found')
            
            channel = response['items'][0]
            logger.info(f'Retrieved channel info: {channel["snippet"]["title"]}')
            
            return {
                'id': channel['id'],
                'title': channel['snippet']['title'],
                'description': channel['snippet']['description'],
                'thumbnail_url': channel['snippet']['thumbnails'].get('high', {}).get('url'),
                'view_count': channel['statistics'].get('viewCount', 0),
                'subscriber_count': channel['statistics'].get('subscriberCount', 0),
                'video_count': channel['statistics'].get('videoCount', 0),
            }
        except HttpError as e:
            logger.error(f'YouTube API error getting channel info: {str(e)}')
            raise YouTubeAPIError(f'Failed to get channel info: {str(e)}')
    
    def get_user_videos(self, credentials, page_token=None, max_results=25):
        """Get user's uploaded videos with pagination"""
        try:
            service = self.build_service(credentials)
            
            # Get uploads playlist ID
            channel_request = service.channels().list(
                part='contentDetails',
                mine=True
            )
            channel_response = channel_request.execute()
            
            if not channel_response.get('items'):
                raise YouTubeAPIError('Failed to get uploads playlist')
            
            uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
            
            # Get videos from uploads playlist
            playlist_request = service.playlistItems().list(
                part='snippet,contentDetails',
                playlistId=uploads_playlist_id,
                maxResults=max_results,
                pageToken=page_token,
                order='date'
            )
            
            response = playlist_request.execute()
            
            videos = []
            for item in response.get('items', []):
                video_id = item['contentDetails']['videoId']
                
                videos.append({
                    'youtube_video_id': video_id,
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'],
                    'thumbnail_url': item['snippet']['thumbnails'].get('high', {}).get('url'),
                    'published_at': item['snippet']['publishedAt'],
                })
            
            logger.info(f'Retrieved {len(videos)} videos from uploads playlist')
            
            return {
                'videos': videos,
                'next_page_token': response.get('nextPageToken'),
                'prev_page_token': response.get('prevPageToken'),
                'total_results': response.get('pageInfo', {}).get('totalResults', len(videos)),
            }
        except HttpError as e:
            logger.error(f'YouTube API error getting videos: {str(e)}')
            raise YouTubeAPIError(f'Failed to get videos: {str(e)}')
    
    def get_video_details(self, credentials, video_id):
        """Get detailed information about a specific video"""
        try:
            service = self.build_service(credentials)
            
            request = service.videos().list(
                part='snippet,contentDetails,statistics',
                id=video_id
            )
            
            response = request.execute()
            
            if not response.get('items'):
                raise YouTubeAPIError(f'Video {video_id} not found')
            
            video = response['items'][0]
            
            return {
                'youtube_video_id': video['id'],
                'title': video['snippet']['title'],
                'description': video['snippet']['description'],
                'thumbnail_url': video['snippet']['thumbnails'].get('high', {}).get('url'),
                'duration_seconds': self._parse_duration(video['contentDetails']['duration']),
                'published_at': video['snippet']['publishedAt'],
                'view_count': int(video['statistics'].get('viewCount', 0)),
                'like_count': int(video['statistics'].get('likeCount', 0)),
                'comment_count': int(video['statistics'].get('commentCount', 0)),
            }
        except HttpError as e:
            logger.error(f'YouTube API error getting video details: {str(e)}')
            raise YouTubeAPIError(f'Failed to get video details: {str(e)}')
    
    def _parse_duration(self, duration_str):
        """Parse ISO 8601 duration string to seconds"""
        import re
        pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration_str)
        
        if not match:
            return 0
        
        hours = int(match.group(1)) if match.group(1) else 0
        minutes = int(match.group(2)) if match.group(2) else 0
        seconds = int(match.group(3)) if match.group(3) else 0
        
        return hours * 3600 + minutes * 60 + seconds
    
    def upload_video(self, credentials, file_path, metadata):
        """Upload video to YouTube"""
        try:
            from googleapiclient.http import MediaFileUpload
            
            service = self.build_service(credentials)
            
            # Prepare video metadata
            body = {
                'snippet': {
                    'title': metadata.get('title', 'Untitled'),
                    'description': metadata.get('description', ''),
                    'tags': metadata.get('tags', '').split(',') if metadata.get('tags') else [],
                    'categoryId': '22',  # People & Blogs
                },
                'status': {
                    'privacyStatus': metadata.get('privacy_status', 'public'),
                    'madeForKids': False,
                },
            }
            
            # Create resumable media upload
            media = MediaFileUpload(
                file_path,
                chunksize=10 * 1024 * 1024,  # 10 MB chunks
                resumable=True
            )
            
            # Execute upload
            request = service.videos().insert(
                part='snippet,status',
                body=body,
                media_body=media,
                onFailure=self._on_upload_error,
                onProgress=self._on_upload_progress
            )
            
            response = None
            retry_count = 0
            
            while response is None:
                try:
                    status, response = request.next_chunk()
                    if status:
                        progress = int(status.progress() * 100)
                        logger.info(f'Upload progress: {progress}%')
                except HttpError as error:
                    if self._handle_api_error(error, retry_count):
                        retry_count += 1
                        continue
                    raise
            
            video_id = response['id']
            logger.info(f'Successfully uploaded video: {video_id}')
            
            return {
                'youtube_video_id': video_id,
                'status': response['status']['privacyStatus'],
            }
        except HttpError as e:
            logger.error(f'YouTube API error uploading video: {str(e)}')
            raise YouTubeAPIError(f'Failed to upload video: {str(e)}')
    
    def _on_upload_error(self, error):
        """Handle upload errors"""
        logger.error(f'Upload error: {str(error)}')
    
    def _on_upload_progress(self, status):
        """Track upload progress"""
        logger.debug(f'Upload progress: {status.progress()}')
