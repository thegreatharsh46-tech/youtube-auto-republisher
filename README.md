# YouTube Auto Republisher

A production-ready Flask web application that automates YouTube video republishing.

## Features

✅ **Google OAuth 2.0 Authentication** - Secure login with automatic token refresh  
✅ **YouTube Integration** - Access your YouTube channel and video library  
✅ **Smart Download** - Download videos using yt-dlp with resumable support  
✅ **Queue Management** - Organize and manage videos for republishing  
✅ **Automatic Scheduling** - Upload one video every 2.5 hours (configurable)  
✅ **Upload Management** - Track, retry, and manage uploads  
✅ **Responsive UI** - Mobile-first dark glassmorphism design  
✅ **Comprehensive Logging** - Full audit trail and debugging  
✅ **Production Ready** - Deployment-ready for Render  

## Quick Start

### Prerequisites
- Python 3.11+
- pip
- git

### Installation

1. **Clone repository**
```bash
git clone https://github.com/thegreatharsh46-tech/youtube-auto-republisher.git
cd youtube-auto-republisher
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r backend/requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

5. **Run application**
```bash
python wsgi.py
```

Access at `http://localhost:5000`

## Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create OAuth 2.0 Credentials (Web Application)
5. Add authorized redirect URI: `http://localhost:5000/api/auth/callback`
6. Copy Client ID and Secret to `.env.local`

### Environment Variables

```bash
# Flask
FLASK_ENV=production
SECRET_KEY=your-secure-random-key

# Database
DATABASE_URL=sqlite:///youtube_republisher.db

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback

# YouTube API
YOUTUBE_API_KEY=your-api-key

# Upload Scheduler
UPLOAD_INTERVAL_MINUTES=150
MAX_RETRIES=3

# Storage
DOWNLOADS_FOLDER=./videos

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
```

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate OAuth login
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/user/profile` - Get user profile

### Videos
- `GET /api/videos` - List user's videos
- `GET /api/videos/<video_id>` - Get video details

### Queue
- `GET /api/queue` - Get queue items
- `POST /api/queue` - Add to queue
- `GET /api/queue/<item_id>` - Get queue item
- `PUT /api/queue/<item_id>` - Update queue item
- `DELETE /api/queue/<item_id>` - Remove from queue
- `GET /api/queue/stats` - Get queue statistics

### Uploads
- `GET /api/uploads` - Get upload history
- `GET /api/uploads/<upload_id>` - Get upload details
- `GET /api/uploads/<upload_id>/progress` - Get upload progress
- `POST /api/uploads/<upload_id>/retry` - Retry failed upload

## Database Schema

### Users
Stores Google OAuth users and encrypted tokens

### Videos
Cached YouTube video metadata

### Queue Items
Videos awaiting republishing with custom metadata

### Upload Logs
Upload history and retry tracking

## Architecture

### Backend Structure
```
backend/
├── app.py                 # Flask application factory
├── config.py             # Configuration management
├── logging_config.py     # Logging setup
├── models/               # SQLAlchemy ORM models
├── services/             # Business logic services
├── routes/               # API route handlers
├── utilities/            # Helper functions
└── requirements.txt      # Python dependencies
```

### Frontend Structure
```
frontend/
├── index.html            # Main dashboard
├── login.html            # Login page
├── upload.html           # Upload management
├── css/                  # Stylesheets
└── js/                   # JavaScript modules
```

## Deployment

### Deploy to Render

1. Push to GitHub
2. Connect repository to Render
3. Set build command: `pip install -r backend/requirements.txt`
4. Set start command: `gunicorn -w 4 -b 0.0.0.0:$PORT wsgi:app`
5. Add environment variables
6. Deploy

### Environment on Render
```
FLASK_ENV=production
SECRET_KEY=<generate-new-key>
DATABASE_URL=<render-sqlite-path>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://<your-render-app>.onrender.com/api/auth/callback
YOUTUBE_API_KEY=<your-api-key>
UPLOAD_INTERVAL_MINUTES=150
```

## Troubleshooting

### OAuth Issues
- Verify Client ID and Secret
- Check redirect URI matches configuration
- Ensure cookies are enabled

### Download Issues
- Check internet connection
- Verify video is accessible
- Check disk space

### Upload Issues
- Verify YouTube API key
- Check token is valid
- Review error logs

## Logging

Logs are written to `./logs/app.log` with rotation:
- Format: `TIMESTAMP - LOGGER - LEVEL - [FILE:LINE] - MESSAGE`
- Max size: 10MB
- Backup count: 5
- Level: INFO (configurable)

## Security

- HTTPS enforced in production
- Tokens encrypted at rest (Fernet)
- Secure session cookies (HttpOnly, Secure, SameSite)
- CSRF protection on all POST requests
- SQL injection prevention via ORM
- Input validation on all endpoints

## Performance

- APScheduler for efficient job scheduling
- Database connection pooling
- Lazy loading for API responses
- Efficient video querying with pagination
- Caching for channel info

## License

Private - For personal use only

## Support

Check logs for debugging information:
```bash
tail -f logs/app.log
```
