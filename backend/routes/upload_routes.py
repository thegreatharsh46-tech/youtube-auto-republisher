import logging
from flask import Blueprint, jsonify, request, session
from backend.models import db, User, UploadLog
from backend.services.upload_service import UploadService
from backend.utilities.errors import AppError, NotFoundError, UploadError

logger = logging.getLogger(__name__)

def create_upload_routes(app, config):
    """Create upload routes"""
    upload_bp = Blueprint('uploads', __name__, url_prefix='/api/uploads')
    upload_service = UploadService(config)
    
    def get_current_user():
        """Get current logged in user"""
        user_id = session.get('user_id')
        if not user_id:
            return None
        return User.query.get(user_id)
    
    @upload_bp.route('', methods=['GET'])
    def get_upload_history():
        """Get user's upload history"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            limit = min(int(request.args.get('limit', '50')), 100)
            uploads = upload_service.get_upload_history(user.id, limit=limit)
            
            return jsonify({
                'uploads': [u.to_dict() for u in uploads],
                'total': len(uploads),
            }), 200
        
        except Exception as e:
            logger.error(f'Upload history error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get upload history',
                'code': 'UPLOAD_HISTORY_ERROR'
            }), 500
    
    @upload_bp.route('/<int:upload_id>', methods=['GET'])
    def get_upload(upload_id):
        """Get upload details"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            upload_log = upload_service.get_upload_log(upload_id)
            
            # Verify ownership
            if upload_log.user_id != user.id:
                return jsonify({
                    'error': True,
                    'message': 'Forbidden',
                    'code': 'FORBIDDEN'
                }), 403
            
            return jsonify(upload_log.to_dict()), 200
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Upload detail error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get upload details',
                'code': 'UPLOAD_DETAIL_ERROR'
            }), 500
    
    @upload_bp.route('/<int:upload_id>/progress', methods=['GET'])
    def get_upload_progress(upload_id):
        """Get upload progress"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            upload_log = upload_service.get_upload_log(upload_id)
            
            # Verify ownership
            if upload_log.user_id != user.id:
                return jsonify({
                    'error': True,
                    'message': 'Forbidden',
                    'code': 'FORBIDDEN'
                }), 403
            
            return jsonify({
                'upload_id': upload_log.id,
                'status': upload_log.status,
                'progress_percent': upload_log.progress_percent,
                'youtube_video_id': upload_log.youtube_video_id,
                'error_message': upload_log.error_message,
            }), 200
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Upload progress error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get upload progress',
                'code': 'UPLOAD_PROGRESS_ERROR'
            }), 500
    
    @upload_bp.route('/<int:upload_id>/retry', methods=['POST'])
    def retry_upload(upload_id):
        """Retry failed upload"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            upload_log = upload_service.get_upload_log(upload_id)
            
            # Verify ownership
            if upload_log.user_id != user.id:
                return jsonify({
                    'error': True,
                    'message': 'Forbidden',
                    'code': 'FORBIDDEN'
                }), 403
            
            # Retry upload (note: this is async in production)
            from backend.services.download_service import DownloadService
            from backend.services.youtube_service import YouTubeService
            
            download_service = DownloadService(config)
            youtube_service = YouTubeService(config)
            
            retry_log = upload_service.retry_upload(
                upload_id,
                download_service,
                youtube_service
            )
            
            logger.info(f'Retried upload: upload_id={upload_id}')
            
            return jsonify(retry_log.to_dict()), 200
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except UploadError as e:
            logger.error(f'Upload error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Retry upload error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to retry upload',
                'code': 'RETRY_UPLOAD_ERROR'
            }), 500
    
    return upload_bp
