import os
import logging
from datetime import datetime, timedelta
from backend.models import db, UploadLog, QueueItem
from backend.utilities.errors import UploadError, NotFoundError

logger = logging.getLogger(__name__)

class UploadService:
    """Handle video upload to YouTube"""
    
    def __init__(self, config):
        self.config = config
        self.max_retries = config.MAX_RETRIES
    
    def upload_video(self, user, queue_item, download_service, youtube_service):
        """Upload video to YouTube"""
        upload_log = None
        try:
            # Get file path
            file_path = download_service.get_download_path(queue_item.video.youtube_video_id)
            
            if not os.path.exists(file_path):
                raise UploadError(f'Video file not found: {file_path}')
            
            # Create upload log
            upload_log = UploadLog(
                user_id=user.id,
                queue_item_id=queue_item.id,
                status=UploadLog.STATUS_IN_PROGRESS,
                started_at=datetime.utcnow(),
            )
            db.session.add(upload_log)
            db.session.commit()
            
            logger.info(f'Starting upload: queue_item_id={queue_item.id}, file_path={file_path}')
            
            # Prepare metadata
            metadata = {
                'title': queue_item.new_title or queue_item.video.title,
                'description': queue_item.new_description or queue_item.video.description,
                'tags': queue_item.new_tags or '',
                'privacy_status': queue_item.privacy_status,
            }
            
            # Get valid credentials
            from backend.services.auth_service import AuthService
            auth_service = AuthService(self.config)
            credentials = auth_service.get_valid_credentials(user)
            
            # Upload to YouTube
            result = youtube_service.upload_video(credentials, file_path, metadata)
            
            # Update upload log
            upload_log.youtube_video_id = result['youtube_video_id']
            upload_log.status = UploadLog.STATUS_COMPLETED
            upload_log.progress_percent = 100
            upload_log.completed_at = datetime.utcnow()
            
            # Update queue item
            queue_item.status = QueueItem.STATUS_COMPLETED
            queue_item.upload_progress = 100
            queue_item.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f'Upload completed: youtube_video_id={result["youtube_video_id"]}')
            return upload_log
        
        except Exception as e:
            logger.error(f'Upload failed: {str(e)}')
            
            # Update logs - FIX: Check if upload_log exists before accessing
            try:
                if upload_log:
                    upload_log.status = UploadLog.STATUS_FAILED
                    upload_log.error_message = str(e)
                if queue_item:
                    queue_item.status = QueueItem.STATUS_FAILED
                db.session.commit()
            except:
                pass
            
            raise UploadError(f'Upload failed: {str(e)}')
    
    def retry_upload(self, upload_log_id, download_service, youtube_service):
        """Retry failed upload"""
        try:
            upload_log = UploadLog.query.get(upload_log_id)
            if not upload_log:
                raise NotFoundError('Upload log')
            
            if upload_log.retry_count >= self.max_retries:
                raise UploadError(f'Max retries ({self.max_retries}) exceeded')
            
            queue_item = upload_log.queue_item
            user = upload_log.user
            
            # Update retry count
            upload_log.retry_count += 1
            upload_log.status = UploadLog.STATUS_IN_PROGRESS
            upload_log.started_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f'Retrying upload: upload_log_id={upload_log_id}, retry_count={upload_log.retry_count}')
            
            # Retry upload
            return self.upload_video(user, queue_item, download_service, youtube_service)
        
        except Exception as e:
            logger.error(f'Retry upload failed: {str(e)}')
            raise
    
    def get_upload_history(self, user_id, limit=50):
        """Get user's upload history"""
        try:
            uploads = UploadLog.query.filter_by(
                user_id=user_id
            ).order_by(UploadLog.created_at.desc()).limit(limit).all()
            
            logger.info(f'Retrieved {len(uploads)} upload history items for user {user_id}')
            return uploads
        
        except Exception as e:
            logger.error(f'Failed to get upload history: {str(e)}')
            raise
    
    def get_upload_log(self, upload_log_id):
        """Get specific upload log"""
        try:
            upload_log = UploadLog.query.get(upload_log_id)
            if not upload_log:
                raise NotFoundError('Upload log')
            
            return upload_log
        
        except Exception as e:
            logger.error(f'Failed to get upload log: {str(e)}')
            raise
