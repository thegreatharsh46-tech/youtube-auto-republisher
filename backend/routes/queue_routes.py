import logging
from flask import Blueprint, jsonify, request, session
from backend.models import db, User, QueueItem
from backend.services.queue_service import QueueService
from backend.utilities.errors import AppError, ValidationError, NotFoundError
from backend.utilities import validate_input

logger = logging.getLogger(__name__)

def create_queue_routes(app, config):
    """Create queue routes"""
    queue_bp = Blueprint('queue', __name__, url_prefix='/api/queue')
    queue_service = QueueService(config)
    
    def get_current_user():
        """Get current logged in user"""
        user_id = session.get('user_id')
        if not user_id:
            return None
        return User.query.get(user_id)
    
    @queue_bp.route('', methods=['GET'])
    def get_queue():
        """Get user's queue"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            status = request.args.get('status')
            queue_items = queue_service.get_queue(user.id, status=status)
            
            return jsonify({
                'items': [item.to_dict() for item in queue_items],
                'total': len(queue_items),
            }), 200
        
        except Exception as e:
            logger.error(f'Queue list error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get queue',
                'code': 'QUEUE_LIST_ERROR'
            }), 500
    
    @queue_bp.route('', methods=['POST'])
    def add_to_queue():
        """Add video to queue"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            data = request.get_json() or {}
            
            # Validate input
            errors = validate_input(data, ['video_id'])
            if errors:
                return jsonify({
                    'error': True,
                    'message': 'Validation failed',
                    'code': 'VALIDATION_ERROR',
                    'details': errors
                }), 400
            
            # Add to queue
            metadata = {
                'title': data.get('title'),
                'description': data.get('description'),
                'tags': data.get('tags'),
                'privacy_status': data.get('privacy_status', 'public'),
            }
            
            queue_item = queue_service.add_to_queue(
                user.id,
                data['video_id'],
                metadata
            )
            
            logger.info(f'Added to queue: user_id={user.id}, video_id={data["video_id"]}')
            
            return jsonify(queue_item.to_dict()), 201
        
        except ValidationError as e:
            logger.error(f'Validation error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code,
                'details': e.details
            }), e.status_code
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Queue add error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to add to queue',
                'code': 'QUEUE_ADD_ERROR'
            }), 500
    
    @queue_bp.route('/<int:queue_item_id>', methods=['GET'])
    def get_queue_item(queue_item_id):
        """Get queue item details"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            queue_item = queue_service.get_queue_item(user.id, queue_item_id)
            
            return jsonify(queue_item.to_dict()), 200
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Queue detail error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get queue item',
                'code': 'QUEUE_DETAIL_ERROR'
            }), 500
    
    @queue_bp.route('/<int:queue_item_id>', methods=['PUT'])
    def update_queue_item(queue_item_id):
        """Update queue item"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            data = request.get_json() or {}
            
            queue_item = queue_service.update_queue_item(
                user.id,
                queue_item_id,
                data
            )
            
            logger.info(f'Updated queue item: queue_item_id={queue_item_id}')
            
            return jsonify(queue_item.to_dict()), 200
        
        except ValidationError as e:
            logger.error(f'Validation error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code,
                'details': e.details
            }), e.status_code
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Queue update error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to update queue item',
                'code': 'QUEUE_UPDATE_ERROR'
            }), 500
    
    @queue_bp.route('/<int:queue_item_id>', methods=['DELETE'])
    def remove_from_queue(queue_item_id):
        """Remove item from queue"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            queue_service.remove_from_queue(user.id, queue_item_id)
            
            logger.info(f'Removed from queue: queue_item_id={queue_item_id}')
            
            return jsonify({'success': True}), 204
        
        except NotFoundError as e:
            logger.error(f'Not found: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Queue remove error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to remove from queue',
                'code': 'QUEUE_REMOVE_ERROR'
            }), 500
    
    @queue_bp.route('/stats', methods=['GET'])
    def get_queue_stats():
        """Get queue statistics"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            stats = queue_service.get_queue_stats(user.id)
            
            return jsonify(stats), 200
        
        except Exception as e:
            logger.error(f'Queue stats error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get queue stats',
                'code': 'QUEUE_STATS_ERROR'
            }), 500
    
    return queue_bp
