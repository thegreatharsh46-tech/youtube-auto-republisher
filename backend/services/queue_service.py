import logging
from datetime import datetime
from backend.models import db, QueueItem, Video
from backend.utilities.errors import ValidationError, NotFoundError

logger = logging.getLogger(__name__)

class QueueService:
    """Handle queue management for videos awaiting republishing"""
    
    def __init__(self, config):
        self.config = config
    
    def add_to_queue(self, user_id, video_id, metadata=None):
        """Add video to republishing queue"""
        try:
            # Verify video exists
            video = Video.query.filter_by(
                user_id=user_id,
                id=video_id
            ).first()
            
            if not video:
                raise NotFoundError('Video')
            
            # Check if already in queue
            existing = QueueItem.query.filter_by(
                user_id=user_id,
                video_id=video_id,
                status__in=[QueueItem.STATUS_PENDING, QueueItem.STATUS_DOWNLOADING, QueueItem.STATUS_DOWNLOADED]
            ).first()
            
            if existing:
                logger.warning(f'Video already in queue: {video_id}')
                return existing
            
            # Create queue item
            queue_item = QueueItem(
                user_id=user_id,
                video_id=video_id,
                status=QueueItem.STATUS_PENDING,
                new_title=metadata.get('title') if metadata else None,
                new_description=metadata.get('description') if metadata else None,
                new_tags=metadata.get('tags') if metadata else None,
                privacy_status=metadata.get('privacy_status', QueueItem.PRIVACY_PUBLIC) if metadata else QueueItem.PRIVACY_PUBLIC,
            )
            
            db.session.add(queue_item)
            db.session.commit()
            
            logger.info(f'Added video to queue: user_id={user_id}, video_id={video_id}')
            return queue_item
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Failed to add to queue: {str(e)}')
            raise
    
    def remove_from_queue(self, user_id, queue_item_id):
        """Remove item from queue"""
        try:
            queue_item = QueueItem.query.filter_by(
                id=queue_item_id,
                user_id=user_id
            ).first()
            
            if not queue_item:
                raise NotFoundError('Queue item')
            
            db.session.delete(queue_item)
            db.session.commit()
            
            logger.info(f'Removed from queue: queue_item_id={queue_item_id}')
            return True
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Failed to remove from queue: {str(e)}')
            raise
    
    def get_queue(self, user_id, status=None):
        """Get user's queue items"""
        try:
            query = QueueItem.query.filter_by(user_id=user_id)
            
            if status:
                query = query.filter_by(status=status)
            
            items = query.order_by(QueueItem.created_at.desc()).all()
            logger.info(f'Retrieved {len(items)} queue items for user {user_id}')
            return items
        
        except Exception as e:
            logger.error(f'Failed to get queue: {str(e)}')
            raise
    
    def get_queue_item(self, user_id, queue_item_id):
        """Get specific queue item"""
        try:
            queue_item = QueueItem.query.filter_by(
                id=queue_item_id,
                user_id=user_id
            ).first()
            
            if not queue_item:
                raise NotFoundError('Queue item')
            
            return queue_item
        
        except Exception as e:
            logger.error(f'Failed to get queue item: {str(e)}')
            raise
    
    def update_queue_item(self, user_id, queue_item_id, update_data):
        """Update queue item metadata"""
        try:
            queue_item = self.get_queue_item(user_id, queue_item_id)
            
            # Update allowed fields
            if 'new_title' in update_data:
                queue_item.new_title = update_data['new_title']
            if 'new_description' in update_data:
                queue_item.new_description = update_data['new_description']
            if 'new_tags' in update_data:
                queue_item.new_tags = update_data['new_tags']
            if 'privacy_status' in update_data:
                if update_data['privacy_status'] not in QueueItem.PRIVACY_CHOICES:
                    raise ValidationError('Invalid privacy_status')
                queue_item.privacy_status = update_data['privacy_status']
            
            queue_item.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f'Updated queue item: queue_item_id={queue_item_id}')
            return queue_item
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Failed to update queue item: {str(e)}')
            raise
    
    def get_next_pending_item(self, user_id):
        """Get next pending item for processing"""
        try:
            queue_item = QueueItem.query.filter_by(
                user_id=user_id,
                status=QueueItem.STATUS_PENDING
            ).order_by(QueueItem.created_at).first()
            
            if queue_item:
                logger.info(f'Retrieved next pending item: queue_item_id={queue_item.id}')
            
            return queue_item
        
        except Exception as e:
            logger.error(f'Failed to get next pending item: {str(e)}')
            raise
    
    def update_item_status(self, queue_item_id, new_status, progress=None, error_message=None):
        """Update queue item status"""
        try:
            queue_item = QueueItem.query.get(queue_item_id)
            if not queue_item:
                raise NotFoundError('Queue item')
            
            if new_status not in QueueItem.STATUS_CHOICES:
                raise ValidationError(f'Invalid status: {new_status}')
            
            queue_item.status = new_status
            queue_item.updated_at = datetime.utcnow()
            
            if progress is not None:
                if new_status in [QueueItem.STATUS_DOWNLOADING, QueueItem.STATUS_DOWNLOADED]:
                    queue_item.download_progress = progress
                elif new_status in [QueueItem.STATUS_UPLOADING, QueueItem.STATUS_COMPLETED]:
                    queue_item.upload_progress = progress
            
            db.session.commit()
            logger.info(f'Updated queue item status: queue_item_id={queue_item_id}, status={new_status}')
            return queue_item
        
        except Exception as e:
            db.session.rollback()
            logger.error(f'Failed to update item status: {str(e)}')
            raise
    
    def get_queue_stats(self, user_id):
        """Get queue statistics"""
        try:
            total = QueueItem.query.filter_by(user_id=user_id).count()
            pending = QueueItem.query.filter_by(
                user_id=user_id,
                status=QueueItem.STATUS_PENDING
            ).count()
            completed = QueueItem.query.filter_by(
                user_id=user_id,
                status=QueueItem.STATUS_COMPLETED
            ).count()
            failed = QueueItem.query.filter_by(
                user_id=user_id,
                status=QueueItem.STATUS_FAILED
            ).count()
            
            return {
                'total': total,
                'pending': pending,
                'completed': completed,
                'failed': failed,
            }
        
        except Exception as e:
            logger.error(f'Failed to get queue stats: {str(e)}')
            raise
