import os
from backend.app import create_app
from backend.config import get_config

config = get_config()
app = create_app(config)

if __name__ == '__main__':
    app.run()
