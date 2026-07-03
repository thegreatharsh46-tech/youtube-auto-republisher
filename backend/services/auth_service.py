import os
import logging
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import session, url_for
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from backend.models import db, User
from backend.utilities import TokenEncryption
from backend.utilities.errors import AuthenticationError, TokenRefreshError

logger = logging.getLogger(__name__)

class AuthService:
    """Handle Google OAuth authentication and token management"""
    
    def __init__(self, config):
        self.config = config
        self.client_id = config.GOOGLE_CLIENT_ID
        self.client_secret = config.GOOGLE_CLIENT_SECRET
        self.redirect_uri = config.GOOGLE_REDIRECT_URI
        self.scopes = config.YOUTUBE_SCOPES
        self.encryption = TokenEncryption()
    
    def get_oauth_flow(self):
        """Create and return OAuth flow"""
        try:
            flow = Flow.from_client_config(
                {
                    'installed': {
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                        'token_uri': 'https://oauth2.googleapis.com/token',
                        'redirect_uris': [self.redirect_uri],
                    }
                },
                scopes=self.scopes
            )
            flow.redirect_uri = self.redirect_uri
            return flow
        except Exception as e:
            logger.error(f'Failed to create OAuth flow: {str(e)}')
            raise AuthenticationError('Failed to initialize OAuth')
    
    def get_authorization_url(self):
        """Get OAuth authorization URL"""
        try:
            flow = self.get_oauth_flow()
            authorization_url, state = flow.authorization_url(
                access_type='offline',
                prompt='consent',
                include_granted_scopes='true'
            )
            logger.info(f'Generated authorization URL with state: {state}')
            return authorization_url, state
        except Exception as e:
            logger.error(f'Failed to get authorization URL: {str(e)}')
            raise AuthenticationError('Failed to generate authorization URL')
    
    def handle_callback(self, code, state=None):
        """Handle OAuth callback and exchange code for tokens"""
        try:
            flow = self.get_oauth_flow()
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            logger.info(f'Successfully exchanged authorization code for tokens')
            return credentials
        except Exception as e:
            logger.error(f'Failed to handle OAuth callback: {str(e)}')
            raise AuthenticationError('Failed to authenticate with Google')
    
    def get_user_info(self, credentials):
        """Get user info from Google OAuth credentials"""
        try:
            from google.auth.transport.requests import Request
            from googleapiclient.discovery import build
            
            oauth_service = build('oauth2', 'v2', credentials=credentials)
            user_info = oauth_service.userinfo().get().execute()
            
            logger.info(f'Retrieved user info for: {user_info.get("email")}')
            return user_info
        except Exception as e:
            logger.error(f'Failed to get user info: {str(e)}')
            raise AuthenticationError('Failed to retrieve user information')
    
    def create_or_update_user(self, credentials, user_info):
        """Create or update user in database"""
        try:
            # Encrypt tokens
            encrypted_access_token = self.encryption.encrypt(credentials.token)
            encrypted_refresh_token = None
            if credentials.refresh_token:
                encrypted_refresh_token = self.encryption.encrypt(credentials.refresh_token)
            
            # Calculate token expiry
            token_expires_at = None
            if credentials.expiry:
                token_expires_at = credentials.expiry
            
            # Find or create user
            user = User.query.filter_by(google_id=user_info['id']).first()
            
            if user:
                user.email = user_info['email']
                user.access_token = encrypted_access_token
                if encrypted_refresh_token:
                    user.refresh_token = encrypted_refresh_token
                user.token_expires_at = token_expires_at
                if 'picture' in user_info:
                    user.profile_picture_url = user_info['picture']
                logger.info(f'Updated existing user: {user.email}')
            else:
                user = User(
                    email=user_info['email'],
                    google_id=user_info['id'],
                    access_token=encrypted_access_token,
                    refresh_token=encrypted_refresh_token,
                    token_expires_at=token_expires_at,
                    profile_picture_url=user_info.get('picture')
                )
                logger.info(f'Created new user: {user.email}')
            
            db.session.add(user)
            db.session.commit()
            
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f'Failed to create/update user: {str(e)}')
            raise AuthenticationError('Failed to save user information')
    
    def is_token_expired(self, user):
        """Check if user's token is expired"""
        if not user.token_expires_at:
            return False
        
        # Check if token expires within buffer time (5 minutes)
        buffer_seconds = self.config.TOKEN_EXPIRY_BUFFER_SECONDS
        expiry_threshold = user.token_expires_at - timedelta(seconds=buffer_seconds)
        
        return datetime.utcnow() >= expiry_threshold
    
    def refresh_access_token(self, user):
        """Refresh user's access token"""
        try:
            if not user.refresh_token:
                logger.error(f'No refresh token available for user: {user.email}')
                raise TokenRefreshError('No refresh token available')
            
            # Decrypt refresh token
            refresh_token = self.encryption.decrypt(user.refresh_token)
            
            # Create credentials object
            credentials = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=self.client_id,
                client_secret=self.client_secret
            )
            
            # Refresh the token
            request = Request()
            credentials.refresh(request)
            
            # Update user in database
            encrypted_access_token = self.encryption.encrypt(credentials.token)
            user.access_token = encrypted_access_token
            user.token_expires_at = credentials.expiry
            db.session.commit()
            
            logger.info(f'Successfully refreshed token for user: {user.email}')
            return credentials
        except Exception as e:
            logger.error(f'Failed to refresh token for user {user.email}: {str(e)}')
            raise TokenRefreshError(f'Failed to refresh token: {str(e)}')
    
    def get_valid_credentials(self, user):
        """Get valid credentials, refreshing if necessary"""
        try:
            # Decrypt access token
            access_token = self.encryption.decrypt(user.access_token)
            
            # Create credentials object
            credentials = Credentials(
                token=access_token,
                refresh_token=user.refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=self.scopes
            )
            
            # Check if token is expired and refresh if necessary
            if self.is_token_expired(user):
                logger.info(f'Token expired for user {user.email}, refreshing...')
                credentials = self.refresh_access_token(user)
            
            return credentials
        except Exception as e:
            logger.error(f'Failed to get valid credentials for user {user.email}: {str(e)}')
            raise AuthenticationError(f'Failed to get credentials: {str(e)}')
    
    def logout_user(self, user):
        """Logout user and revoke tokens"""
        try:
            credentials = self.get_valid_credentials(user)
            
            # Revoke token
            from google.auth.transport.requests import Request as ReqObj
            ReqObj().request(
                'POST',
                'https://oauth2.googleapis.com/revoke',
                params={'token': credentials.token}
            )
            
            logger.info(f'Revoked tokens for user: {user.email}')
        except Exception as e:
            logger.warning(f'Failed to revoke tokens for user {user.email}: {str(e)}')
    
    def require_auth(self, f):
        """Decorator to require valid authentication"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = session.get('user_id')
            if not user_id:
                raise AuthenticationError('No user logged in')
            
            user = User.query.get(user_id)
            if not user:
                raise AuthenticationError('User not found')
            
            return f(user=user, *args, **kwargs)
        return decorated_function
