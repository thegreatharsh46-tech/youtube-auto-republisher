import logging
from flask import Blueprint, jsonify, request, session
from backend.models import db, User, Video
from backend.services.youtube_service import YouTubeService
from backend.services.auth_service import AuthService
from backend.utilities.errors import AppError, YouTubeAPIError, NotFoundError

logger = logging.getLogger(__name__)

def create_video_routes(app, config):
    """Create video routes"""
    video_bp = Blueprint('videos', __name__, url_prefix='/api/videos')
    youtube_service = YouTubeService(config)
    auth_service = AuthService(config)
    
    def get_current_user():
        """Get current logged in user"""
        user_id = session.get('user_id')
        if not user_id:
            return None
        return User.query.get(user_id)
    
    @video_bp.route('', methods=['GET'])
    def list_videos():
        """List user's YouTube videos"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            page_token = request.args.get('pageToken')
            max_results = min(int(request.args.get('maxResults', '25')), 50)
            
            # Get valid credentials
            credentials = auth_service.get_valid_credentials(user)
            
            # Get videos from YouTube
            youtube_data = youtube_service.get_user_videos(
                credentials,
                page_token=page_token,
                max_results=max_results
            )
            
            # Sync with database
            for video_data in youtube_data['videos']:
                video = Video.query.filter_by(
                    user_id=user.id,
                    youtube_video_id=video_data['youtube_video_id']
                ).first()
                
                if not video:
                    video = Video(
                        user_id=user.id,
                        **video_data
                    )
                    db.session.add(video)
            
            db.session.commit()
            logger.info(f'Synced {len(youtube_data["videos"])} videos for user {user.id}')
            
            return jsonify({
                'videos': youtube_data['videos'],
                'nextPageToken': youtube_data.get('next_page_token'),
                'prevPageToken': youtube_data.get('prev_page_token'),
                'totalResults': youtube_data.get('total_results'),
            }), 200
        
        except YouTubeAPIError as e:
            logger.error(f'YouTube API error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Video list error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to list videos',
                'code': 'VIDEO_LIST_ERROR'
            }), 500
    
    @video_bp.route('/<video_id>', methods=['GET'])
    def get_video(video_id):
        """Get video details"""
        try:
            user = get_current_user()
            if not user:
                return jsonify({
                    'error': True,
                    'message': 'Unauthorized',
                    'code': 'UNAUTHORIZED'
                }), 401
            
            # Get valid credentials
            credentials = auth_service.get_valid_credentials(user)
            
            # Get video details from YouTube
            video_data = youtube_service.get_video_details(credentials, video_id)
            
            # Sync with database
            video = Video.query.filter_by(
                user_id=user.id,
                youtube_video_id=video_id
            ).first()
            
            if not video:
                video = Video(
                    user_id=user.id,
                    **video_data
                )
                db.session.add(video)
            else:
                # Update video data
                for key, value in video_data.items():
                    setattr(video, key, value)
            
            db.session.commit()
            
            return jsonify(video.to_dict()), 200
        
        except YouTubeAPIError as e:
            logger.error(f'YouTube API error: {str(e)}')
            return jsonify({
                'error': True,
                'message': e.message,
                'code': e.code
            }), e.status_code
        
        except Exception as e:
            logger.error(f'Video detail error: {str(e)}')
            return jsonify({
                'error': True,
                'message': 'Failed to get video details',
                'code': 'VIDEO_DETAIL_ERROR'
            }), 500
    
    return video_bp
