class AppError(Exception):
    """Base application error"""
    def __init__(self, message, code='ERROR', status_code=500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class AuthenticationError(AppError):
    """Authentication error"""
    def __init__(self, message='Authentication failed'):
        super().__init__(message, 'AUTH_ERROR', 401)


class TokenRefreshError(AppError):
    """Token refresh error"""
    def __init__(self, message='Failed to refresh token'):
        super().__init__(message, 'TOKEN_REFRESH_ERROR', 401)


class YouTubeAPIError(AppError):
    """YouTube API error"""
    def __init__(self, message='YouTube API error', status_code=500):
        super().__init__(message, 'YOUTUBE_API_ERROR', status_code)


class DownloadError(AppError):
    """Download error"""
    def __init__(self, message='Download failed'):
        super().__init__(message, 'DOWNLOAD_ERROR', 500)


class UploadError(AppError):
    """Upload error"""
    def __init__(self, message='Upload failed'):
        super().__init__(message, 'UPLOAD_ERROR', 500)


class ValidationError(AppError):
    """Validation error"""
    def __init__(self, message='Validation failed', details=None):
        super().__init__(message, 'VALIDATION_ERROR', 400)
        self.details = details or {}


class NotFoundError(AppError):
    """Not found error"""
    def __init__(self, resource='Resource'):
        super().__init__(f'{resource} not found', 'NOT_FOUND', 404)


class QuotaExceededError(AppError):
    """YouTube API quota exceeded"""
    def __init__(self, message='YouTube API quota exceeded'):
        super().__init__(message, 'QUOTA_EXCEEDED', 429)


class RateLimitError(AppError):
    """Rate limit exceeded"""
    def __init__(self, retry_after=60):
        super().__init__('Rate limit exceeded', 'RATE_LIMIT', 429)
        self.retry_after = retry_after
