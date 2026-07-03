import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv('.env.local')

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    TESTING = False
    
    # Flask-SQLAlchemy
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///youtube_republisher.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = os.getenv('SQLALCHEMY_TRACK_MODIFICATIONS', 'False') == 'True'
    SQLALCHEMY_ENGINE_OPTIONS = {'connect_args': {'check_same_thread': False}}
    
    # Session
    SESSION_COOKIE_SECURE = os.getenv('SECURE_COOKIES', 'True') == 'True'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=int(os.getenv('SESSION_TIMEOUT_HOURS', '24')))
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI')
    
    # YouTube API
    YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')
    YOUTUBE_SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
    ]
    
    # Upload Scheduler
    UPLOAD_INTERVAL_MINUTES = int(os.getenv('UPLOAD_INTERVAL_MINUTES', '150'))
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    DOWNLOAD_TIMEOUT_SECONDS = int(os.getenv('DOWNLOAD_TIMEOUT_SECONDS', '3600'))
    UPLOAD_TIMEOUT_SECONDS = int(os.getenv('UPLOAD_TIMEOUT_SECONDS', '3600'))
    
    # Storage
    DOWNLOADS_FOLDER = os.getenv('DOWNLOADS_FOLDER', './videos')
    MAX_DOWNLOAD_SIZE_GB = int(os.getenv('MAX_DOWNLOAD_SIZE_GB', '50'))
    MAX_VIDEO_FILE_SIZE_MB = int(os.getenv('MAX_VIDEO_FILE_SIZE_MB', '20000'))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', './logs/app.log')
    LOG_MAX_SIZE_MB = int(os.getenv('LOG_MAX_SIZE_MB', '10'))
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', '5'))
    
    # Security
    TOKEN_EXPIRY_BUFFER_SECONDS = int(os.getenv('TOKEN_EXPIRY_BUFFER_SECONDS', '300'))
    
    # Deployment
    RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL', 'http://localhost:5000')
    ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SESSION_COOKIE_SECURE = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SESSION_COOKIE_SECURE = False

def get_config():
    """Get appropriate config based on environment"""
    env = os.getenv('FLASK_ENV', 'production')
    if env == 'development':
        return DevelopmentConfig
    elif env == 'testing':
        return TestingConfig
    return ProductionConfig
