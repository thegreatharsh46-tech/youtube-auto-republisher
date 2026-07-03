import logging
from flask import Blueprint, jsonify, request, session, redirect, url_for
from backend.models import db, User
from backend.services.auth_service import AuthService
from backend.utilities.errors import AppError, AuthenticationError

logger = logging.getLogger(__name__)

def create_auth_routes(app, config):
    """Create authentication routes"""
    auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
    auth_service = AuthService(config)
    
    @auth_bp.route('/login', methods=['GET'])
    def login():
        """Initiate Google OAuth login"""
        try:
            authorization_url, state = auth_service.get_authorization_url()
            session['oauth_state'] = state
            logger.info('Initiated OAuth login')
            return redirect(authorization_url)
        except AppError as e:
            logger.error(f'Login error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
    
    @auth_bp.route('/callback', methods=['GET'])
    def callback():
        """Handle OAuth callback"""
        try:
            code = request.args.get('code')
            state = request.args.get('state')
            
            if not code:
                raise AuthenticationError('No authorization code received')
            
            # Verify state
            stored_state = session.pop('oauth_state', None)
            if not stored_state or stored_state != state:
                logger.warning('OAuth state mismatch')
                raise AuthenticationError('OAuth state validation failed')
            
            # Exchange code for credentials
            credentials = auth_service.handle_callback(code, state)
            
            # Get user info
            user_info = auth_service.get_user_info(credentials)
            
            # Create or update user
            user = auth_service.create_or_update_user(credentials, user_info)
            
            # Set session
            session['user_id'] = user.id
            session['email'] = user.email
            session.permanent = True
            
            logger.info(f'User logged in: {user.email}')
            return redirect(url_for('dashboard'))
        
        except AppError as e:
            logger.error(f'Callback error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
    
    @auth_bp.route('/logout', methods=['POST'])
    def logout():
        """Logout user"""
        try:
            user_id = session.get('user_id')
            if user_id:
                user = User.query.get(user_id)
                if user:
                    auth_service.logout_user(user)
            
            session.clear()
            logger.info('User logged out')
            return redirect(url_for('login_page'))
        
        except AppError as e:
            logger.error(f'Logout error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
    
    @auth_bp.route('/status', methods=['GET'])
    def status():
        """Check authentication status"""
        try:
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({
                    'authenticated': False,
                    'user': None
                }), 200
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({
                    'authenticated': False,
                    'user': None
                }), 200
            
            return jsonify({
                'authenticated': True,
                'user': user.to_dict()
            }), 200
        
        except Exception as e:
            logger.error(f'Status check error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Status check failed',
                'code': 'STATUS_CHECK_ERROR'
            }), 500
    
    return auth_bp
