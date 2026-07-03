import os
import json
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import session, redirect, url_for, request
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class TokenEncryption:
    """Handle token encryption/decryption"""
    
    def __init__(self, key=None):
        if key is None:
            key = os.getenv('TOKEN_ENCRYPTION_KEY', 'dev-key-change-in-production')
        
        # Ensure key is bytes and valid
        if isinstance(key, str):
            key = key.encode()
        
        # If key is not 32 bytes, derive it
        if len(key) != 44:  # Base64 encoded 32-byte key
            key = Fernet.generate_key()
        
        self.cipher = Fernet(key)
    
    def encrypt(self, token):
        """Encrypt token"""
        try:
            if isinstance(token, str):
                token = token.encode()
            encrypted = self.cipher.encrypt(token)
            return encrypted.decode()
        except Exception as e:
            logger.error(f'Token encryption error: {str(e)}')
            raise
    
    def decrypt(self, encrypted_token):
        """Decrypt token"""
        try:
            if isinstance(encrypted_token, str):
                encrypted_token = encrypted_token.encode()
            decrypted = self.cipher.decrypt(encrypted_token)
            return decrypted.decode()
        except Exception as e:
            logger.error(f'Token decryption error: {str(e)}')
            raise


def login_required(f):
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login_page'))
        return f(*args, **kwargs)
    return decorated_function


def api_login_required(f):
    """Decorator to require login for API endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return {'error': True, 'message': 'Unauthorized', 'code': 'UNAUTHORIZED'}, 401
        return f(*args, **kwargs)
    return decorated_function


def validate_input(data, required_fields):
    """Validate request data"""
    errors = {}
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            errors[field] = f'{field} is required'
    return errors


def format_video_duration(seconds):
    """Format duration from seconds to HH:MM:SS"""
    if not seconds:
        return '0:00'
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f'{hours}:{minutes:02d}:{secs:02d}'
    return f'{minutes}:{secs:02d}'


def get_file_size_mb(file_path):
    """Get file size in MB"""
    if os.path.exists(file_path):
        return os.path.getsize(file_path) / (1024 * 1024)
    return 0


def ensure_directory_exists(directory):
    """Ensure directory exists"""
    if not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)
        logger.info(f'Created directory: {directory}')


class RateLimiter:
    """Simple rate limiter for API calls"""
    
    def __init__(self):
        self.requests = {}
    
    def is_allowed(self, key, max_requests=10, window_seconds=60):
        """Check if request is allowed"""
        now = datetime.utcnow()
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests outside window
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if (now - req_time).total_seconds() < window_seconds
        ]
        
        if len(self.requests[key]) < max_requests:
            self.requests[key].append(now)
            return True
        
        return False
    
    def get_retry_after(self, key, window_seconds=60):
        """Get retry-after in seconds"""
        if key in self.requests and self.requests[key]:
            oldest_request = self.requests[key][0]
            retry_after = window_seconds - (datetime.utcnow() - oldest_request).total_seconds()
            return max(1, int(retry_after))
        return 0
