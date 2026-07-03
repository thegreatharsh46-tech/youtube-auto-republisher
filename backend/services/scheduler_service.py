import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from backend.models import db, User, QueueItem, UploadLog

logger = logging.getLogger(__name__)

class SchedulerService:
    """Handle automatic upload scheduling using APScheduler"""
    
    _instance = None
    _scheduler = None
    
    def __new__(cls, config=None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            if config:
                cls._instance._init_scheduler(config)
        return cls._instance
    
    def _init_scheduler(self, config):
        """Initialize scheduler"""
        self.config = config
        self.upload_interval_minutes = config.UPLOAD_INTERVAL_MINUTES
        
        if self._scheduler is None:
            self._scheduler = BackgroundScheduler()
            logger.info('APScheduler initialized')
    
    def start(self):
        """Start scheduler"""
        if self._scheduler and not self._scheduler.running:
            self._scheduler.start()
            logger.info('Scheduler started')
            self._schedule_uploads()
    
    def stop(self):
        """Stop scheduler"""
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown()
            logger.info('Scheduler stopped')
    
    def _schedule_uploads(self):
        """Schedule automatic uploads for all users"""
        try:
            users = User.query.all()
            
            for user in users:
                job_id = f'upload_user_{user.id}'
                
                # Remove existing job if present
                try:
                    self._scheduler.remove_job(job_id)
                except:
                    pass
                
                # Add new job
                self._scheduler.add_job(
                    self._execute_upload,
                    IntervalTrigger(minutes=self.upload_interval_minutes),
                    args=[user.id],
                    id=job_id,
                    name=f'Upload for user {user.id}',
                    replace_existing=True
                )
                
                logger.info(f'Scheduled upload job for user {user.id} every {self.upload_interval_minutes} minutes')
        
        except Exception as e:
            logger.error(f'Failed to schedule uploads: {str(e)}')
    
    def _execute_upload(self, user_id):
        """Execute upload for user"""
        try:
            logger.info(f'Executing scheduled upload for user {user_id}')
            
            from backend.services.youtube_service import YouTubeService
            from backend.services.download_service import DownloadService
            from backend.services.queue_service import QueueService
            from backend.services.upload_service import UploadService
            from backend.services.auth_service import AuthService
            
            user = User.query.get(user_id)
            if not user:
                logger.warning(f'User {user_id} not found')
                return
            
            # Initialize services
            queue_service = QueueService(self.config)
            download_service = DownloadService(self.config)
            upload_service = UploadService(self.config)
            youtube_service = YouTubeService(self.config)
            
            # Get next pending item
            queue_item = queue_service.get_next_pending_item(user_id)
            if not queue_item:
                logger.info(f'No pending items in queue for user {user_id}')
                return
            
            # Update status to downloading
            queue_service.update_item_status(
                queue_item.id,
                QueueItem.STATUS_DOWNLOADING
            )
            
            # Download video
            try:
                logger.info(f'Downloading video: {queue_item.video.youtube_video_id}')
                youtube_url = f'https://www.youtube.com/watch?v={queue_item.video.youtube_video_id}'
                
                file_path = download_service.download_video(
                    youtube_url,
                    queue_item.video.youtube_video_id
                )
                
                queue_item.local_file_path = file_path
                queue_service.update_item_status(
                    queue_item.id,
                    QueueItem.STATUS_DOWNLOADED,
                    progress=100
                )
                
                logger.info(f'Video downloaded successfully: {file_path}')
            
            except Exception as e:
                logger.error(f'Download failed: {str(e)}')
                queue_service.update_item_status(
                    queue_item.id,
                    QueueItem.STATUS_FAILED
                )
                return
            
            # Upload video
            try:
                logger.info(f'Uploading video: {queue_item.video.youtube_video_id}')
                upload_service.upload_video(
                    user,
                    queue_item,
                    download_service,
                    youtube_service
                )
                logger.info(f'Upload completed successfully')
            
            except Exception as e:
                logger.error(f'Upload failed: {str(e)}')
                queue_service.update_item_status(
                    queue_item.id,
                    QueueItem.STATUS_FAILED
                )
        
        except Exception as e:
            logger.error(f'Scheduled upload execution failed: {str(e)}')
    
    def pause_user_uploads(self, user_id):
        """Pause uploads for user"""
        try:
            job_id = f'upload_user_{user_id}'
            job = self._scheduler.get_job(job_id)
            if job:
                job.pause()
                logger.info(f'Paused uploads for user {user_id}')
        except Exception as e:
            logger.error(f'Failed to pause uploads: {str(e)}')
    
    def resume_user_uploads(self, user_id):
        """Resume uploads for user"""
        try:
            job_id = f'upload_user_{user_id}'
            job = self._scheduler.get_job(job_id)
            if job:
                job.resume()
                logger.info(f'Resumed uploads for user {user_id}')
        except Exception as e:
            logger.error(f'Failed to resume uploads: {str(e)}')
    
    def get_next_upload_time(self, user_id):
        """Get next scheduled upload time for user"""
        try:
            job_id = f'upload_user_{user_id}'
            job = self._scheduler.get_job(job_id)
            if job:
                return job.next_run_time
            return None
        except Exception as e:
            logger.error(f'Failed to get next upload time: {str(e)}')
            return None
    
    def get_scheduler_info(self):
        """Get scheduler information"""
        try:
            if not self._scheduler:
                return None
            
            jobs = self._scheduler.get_jobs()
            return {
                'running': self._scheduler.running,
                'jobs_count': len(jobs),
                'jobs': [{
                    'id': job.id,
                    'name': job.name,
                    'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
                } for job in jobs]
            }
        except Exception as e:
            logger.error(f'Failed to get scheduler info: {str(e)}')
            return None
