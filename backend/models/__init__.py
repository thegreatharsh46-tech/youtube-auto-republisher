from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """User model for storing Google OAuth users"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    google_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    youtube_channel_id = db.Column(db.String(255), nullable=True, unique=True)
    youtube_channel_title = db.Column(db.String(255), nullable=True)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)
    profile_picture_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    videos = db.relationship('Video', backref='user', lazy=True, cascade='all, delete-orphan')
    queue_items = db.relationship('QueueItem', backref='user', lazy=True, cascade='all, delete-orphan')
    upload_logs = db.relationship('UploadLog', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'youtube_channel_id': self.youtube_channel_id,
            'youtube_channel_title': self.youtube_channel_title,
            'profile_picture_url': self.profile_picture_url,
            'created_at': self.created_at.isoformat(),
        }


class Video(db.Model):
    """Video model for storing YouTube videos"""
    __tablename__ = 'videos'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    youtube_video_id = db.Column(db.String(255), nullable=False, index=True)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=True)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    duration_seconds = db.Column(db.Integer, nullable=True)
    published_at = db.Column(db.DateTime, nullable=True)
    view_count = db.Column(db.Integer, default=0)
    like_count = db.Column(db.Integer, default=0)
    comment_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Composite index for user and youtube video
    __table_args__ = (
        db.UniqueConstraint('user_id', 'youtube_video_id', name='uq_user_youtube_video'),
    )
    
    def __repr__(self):
        return f'<Video {self.youtube_video_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'youtube_video_id': self.youtube_video_id,
            'title': self.title,
            'description': self.description,
            'thumbnail_url': self.thumbnail_url,
            'duration_seconds': self.duration_seconds,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'view_count': self.view_count,
            'like_count': self.like_count,
            'comment_count': self.comment_count,
        }


class QueueItem(db.Model):
    """Queue item model for videos awaiting republishing"""
    __tablename__ = 'queue_items'
    
    # Status constants
    STATUS_PENDING = 'pending'
    STATUS_DOWNLOADING = 'downloading'
    STATUS_DOWNLOADED = 'downloaded'
    STATUS_UPLOADING = 'uploading'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    
    STATUS_CHOICES = [
        STATUS_PENDING,
        STATUS_DOWNLOADING,
        STATUS_DOWNLOADED,
        STATUS_UPLOADING,
        STATUS_COMPLETED,
        STATUS_FAILED,
    ]
    
    # Privacy constants
    PRIVACY_PUBLIC = 'public'
    PRIVACY_UNLISTED = 'unlisted'
    PRIVACY_PRIVATE = 'private'
    
    PRIVACY_CHOICES = [PRIVACY_PUBLIC, PRIVACY_UNLISTED, PRIVACY_PRIVATE]
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id'), nullable=False, index=True)
    status = db.Column(db.String(50), default=STATUS_PENDING, nullable=False, index=True)
    local_file_path = db.Column(db.String(500), nullable=True)
    new_title = db.Column(db.String(500), nullable=True)
    new_description = db.Column(db.Text, nullable=True)
    new_tags = db.Column(db.String(500), nullable=True)
    privacy_status = db.Column(db.String(50), default=PRIVACY_PUBLIC, nullable=False)
    position_in_queue = db.Column(db.Integer, nullable=True, index=True)
    download_progress = db.Column(db.Integer, default=0)
    upload_progress = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship
    video = db.relationship('Video', backref='queue_items')
    
    def __repr__(self):
        return f'<QueueItem {self.id} - {self.status}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'video_id': self.video_id,
            'status': self.status,
            'new_title': self.new_title or self.video.title,
            'new_description': self.new_description or self.video.description,
            'new_tags': self.new_tags,
            'privacy_status': self.privacy_status,
            'download_progress': self.download_progress,
            'upload_progress': self.upload_progress,
            'video': self.video.to_dict() if self.video else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class UploadLog(db.Model):
    """Upload log model for tracking upload history"""
    __tablename__ = 'upload_logs'
    
    # Status constants
    STATUS_PENDING = 'pending'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    
    STATUS_CHOICES = [STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_COMPLETED, STATUS_FAILED]
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    queue_item_id = db.Column(db.Integer, db.ForeignKey('queue_items.id'), nullable=False, index=True)
    youtube_video_id = db.Column(db.String(255), nullable=True, index=True)
    status = db.Column(db.String(50), default=STATUS_PENDING, nullable=False, index=True)
    progress_percent = db.Column(db.Integer, default=0)
    error_message = db.Column(db.Text, nullable=True)
    retry_count = db.Column(db.Integer, default=0)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    queue_item = db.relationship('QueueItem', backref='upload_logs')
    
    def __repr__(self):
        return f'<UploadLog {self.id} - {self.status}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'queue_item_id': self.queue_item_id,
            'youtube_video_id': self.youtube_video_id,
            'status': self.status,
            'progress_percent': self.progress_percent,
            'error_message': self.error_message,
            'retry_count': self.retry_count,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat(),
        }
