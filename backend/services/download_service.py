import os
import logging
import subprocess
from pathlib import Path
from backend.utilities.errors import DownloadError
from backend.utilities import ensure_directory_exists, get_file_size_mb

logger = logging.getLogger(__name__)

class DownloadService:
    """Handle video downloading using yt-dlp"""
    
    def __init__(self, config):
        self.config = config
        self.downloads_folder = config.DOWNLOADS_FOLDER
        self.max_download_size_gb = config.MAX_DOWNLOAD_SIZE_GB
        self.max_file_size_mb = config.MAX_VIDEO_FILE_SIZE_MB
        ensure_directory_exists(self.downloads_folder)
    
    def get_download_path(self, video_id):
        """Get download path for video"""
        return os.path.join(self.downloads_folder, f'{video_id}.mp4')
    
    def check_storage_available(self, required_gb=1):
        """Check if sufficient storage is available"""
        try:
            import shutil
            stat = shutil.disk_usage(self.downloads_folder)
            available_gb = stat.free / (1024**3)
            
            if available_gb < required_gb:
                logger.error(f'Insufficient storage: {available_gb}GB available, {required_gb}GB required')
                raise DownloadError(f'Insufficient storage available ({available_gb:.2f}GB)')
            
            logger.info(f'Storage check passed: {available_gb:.2f}GB available')
            return True
        except Exception as e:
            logger.error(f'Storage check failed: {str(e)}')
            raise DownloadError(f'Failed to check storage: {str(e)}')
    
    def download_video(self, youtube_url, video_id, progress_callback=None):
        """Download video using yt-dlp with progress tracking"""
        try:
            # Check storage
            self.check_storage_available()
            
            output_path = self.get_download_path(video_id)
            
            # Skip if already downloaded
            if os.path.exists(output_path):
                logger.info(f'Video already downloaded: {output_path}')
                return output_path
            
            # Prepare yt-dlp options
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': output_path.replace('.mp4', ''),
                'quiet': False,
                'no_warnings': False,
                'socket_timeout': self.config.DOWNLOAD_TIMEOUT_SECONDS,
                'retries': 5,
                'fragment_retries': 5,
                'skip_unavailable_fragments': True,
                'postprocessors': [{
                    'key': 'FFmpegVideoConvertMultiple',
                    'prefixes': [],
                    'ext': 'mp4',
                }],
            }
            
            # Add progress hook if callback provided
            if progress_callback:
                ydl_opts['progress_hooks'] = [self._create_progress_hook(progress_callback)]
            
            logger.info(f'Starting download: {youtube_url} -> {output_path}')
            
            # Import here to avoid import errors if yt-dlp not installed
            import yt_dlp
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                logger.info(f'Successfully downloaded video: {info.get("id")}')
            
            # Verify file
            if not os.path.exists(output_path):
                raise DownloadError(f'Video file not found after download: {output_path}')
            
            file_size_mb = get_file_size_mb(output_path)
            if file_size_mb > self.max_file_size_mb:
                os.remove(output_path)
                raise DownloadError(f'Video file too large: {file_size_mb:.2f}MB (max: {self.max_file_size_mb}MB)')
            
            logger.info(f'Video download complete: {output_path} ({file_size_mb:.2f}MB)')
            return output_path
        
        except Exception as e:
            logger.error(f'Download failed for {youtube_url}: {str(e)}')
            raise DownloadError(f'Failed to download video: {str(e)}')
    
    def _create_progress_hook(self, callback):
        """Create progress hook for yt-dlp"""
        def hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                downloaded = d.get('downloaded_bytes', 0)
                
                if total > 0:
                    progress = int((downloaded / total) * 100)
                    callback(progress, downloaded, total)
            elif d['status'] == 'finished':
                callback(100, d.get('downloaded_bytes', 0), d.get('total_bytes', 0))
        
        return hook
    
    def delete_video(self, video_id):
        """Delete downloaded video file"""
        try:
            output_path = self.get_download_path(video_id)
            if os.path.exists(output_path):
                os.remove(output_path)
                logger.info(f'Deleted video file: {output_path}')
            return True
        except Exception as e:
            logger.error(f'Failed to delete video {video_id}: {str(e)}')
            raise DownloadError(f'Failed to delete video: {str(e)}')
    
    def cleanup_old_videos(self, days=30):
        """Clean up old downloaded videos"""
        try:
            import time
            cutoff_time = time.time() - (days * 24 * 60 * 60)
            deleted_count = 0
            
            for filename in os.listdir(self.downloads_folder):
                file_path = os.path.join(self.downloads_folder, filename)
                if os.path.isfile(file_path) and os.path.getmtime(file_path) < cutoff_time:
                    os.remove(file_path)
                    deleted_count += 1
                    logger.info(f'Cleaned up old video: {file_path}')
            
            logger.info(f'Cleanup complete: {deleted_count} files deleted')
            return deleted_count
        except Exception as e:
            logger.error(f'Cleanup failed: {str(e)}')
            raise DownloadError(f'Cleanup failed: {str(e)}')
