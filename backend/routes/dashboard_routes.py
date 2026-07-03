import logging
from flask import Blueprint, jsonify, session
from backend.models import User, QueueItem, UploadLog
from backend.utilities.errors import AppError

logger = logging.getLogger(__name__)

def create_dashboard_routes(app, config):
    """Create dashboard routes"""
    dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')
    
    def get_current_user():
        """Get current logged in user"""
        user_id = session.get('user_id')
        if not user_id:
            return None
        return User.query.get(user_id)
    
    @dashboard_bp.route('/dashboard', methods=['GET'])
    def get_dashboard():
        """Get dashboard data"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            # Queue statistics
            total_queue = QueueItem.query.filter_by(user_id=user.id).count()
            pending_queue = QueueItem.query.filter_by(
                user_id=user.id,
                status=QueueItem.STATUS_PENDING
            ).count()
            completed = QueueItem.query.filter_by(
                user_id=user.id,
                status=QueueItem.STATUS_COMPLETED
            ).count()
            failed = QueueItem.query.filter_by(
                user_id=user.id,
                status=QueueItem.STATUS_FAILED
            ).count()
            
            # Recent uploads
            recent_uploads = UploadLog.query.filter_by(
                user_id=user.id
            ).order_by(UploadLog.created_at.desc()).limit(5).all()
            
            return jsonify({
                'user': user.to_dict(),
                'queue': {
                    'total': total_queue,
                    'pending': pending_queue,
                    'completed': completed,
                    'failed': failed,
                },
                'recent_uploads': [u.to_dict() for u in recent_uploads],
            }), 200
        
        except Exception as e:
            logger.error(f'Dashboard error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to load dashboard',
                'code': 'DASHBOARD_ERROR'
            }), 500
    
    @dashboard_bp.route('/user/profile', methods=['GET'])
    def get_user_profile():
        """Get user profile"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            return jsonify(user.to_dict()), 200
        
        except Exception as e:
            logger.error(f'Profile error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to load profile',
                'code': 'PROFILE_ERROR'
            }), 500
    
    return dashboard_bp
