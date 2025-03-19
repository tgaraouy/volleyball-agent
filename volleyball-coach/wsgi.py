import os
import sys

# Add the proper paths to sys.path for imports to work correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'src'))

# Set environment variables for Flask to locate templates and static files
os.environ['FLASK_APP_ROOT'] = current_dir
os.environ['FLASK_TEMPLATE_PATH'] = os.path.join(current_dir, 'src', 'web', 'templates')
os.environ['FLASK_STATIC_PATH'] = os.path.join(current_dir, 'src', 'web', 'static')

# Now import the app
from src.web.app import app

if __name__ == "__main__":
    app.run()
