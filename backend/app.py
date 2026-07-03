import logging
from flask import Flask, render_template, session, redirect, url_for
from flask_cors import CORS
from backend.models import db
from backend.config import get_config
from backend.logging_config import setup_logging
from backend.routes.auth_routes import create_auth_routes
from backend.routes.dashboard_routes import create_dashboard_routes
from backend.routes.video_routes import create_video_routes
from backend.routes.queue_routes import create_queue_routes
from backend.routes.upload_routes import create_upload_routes
from backend.services.scheduler_service import SchedulerService

logger = logging.getLogger(__name__)

def create_app(config=None):
    """Application factory"""
    
    # Setup logging
    setup_logging()
    logger.info('Initializing Flask application')
    
    # Create Flask app
    app = Flask(__name__, 
                template_folder='../frontend',
                static_folder='../frontend')
    
    # Load configuration
    if config is None:
        config = get_config()
    
    app.config.from_object(config)
    logger.info(f'Loaded configuration: {config.__name__}')
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Create database tables
    with app.app_context():
        logger.info('Creating database tables')
        db.create_all()
    
    # Register blueprints
    app.register_blueprint(create_auth_routes(app, config))
    app.register_blueprint(create_dashboard_routes(app, config))
    app.register_blueprint(create_video_routes(app, config))
    app.register_blueprint(create_queue_routes(app, config))
    app.register_blueprint(create_upload_routes(app, config))
    
    logger.info('Registered API blueprints')
    
    # Initialize scheduler
    try:
        scheduler = SchedulerService(config)
        scheduler.start()
        logger.info('Scheduler started')
    except Exception as e:
        logger.error(f'Failed to start scheduler: {str(e)}')
    
    # Frontend routes
    @app.route('/')
    def index():
        """Serve main dashboard"""
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return render_template('index.html')
    
    @app.route('/login')
    def login_page():
        """Serve login page"""
        if 'user_id' in session:
            return redirect(url_for('index'))
        return render_template('login.html')
    
    @app.route('/uploads')
    def uploads_page():
        """Serve uploads page"""
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return render_template('upload.html')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        logger.warning(f'404 error: {error}')
        return {'error': True, 'message': 'Not found', 'code': 'NOT_FOUND'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        logger.error(f'500 error: {error}')
        db.session.rollback()
        return {'error': True, 'message': 'Internal server error', 'code': 'INTERNAL_ERROR'}, 500
    
    logger.info('Flask application initialized successfully')
    return app

def init_db(app):
    """Initialize database"""
    with app.app_context():
        logger.info('Initializing database')
        db.create_all()
        logger.info('Database initialized')

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
