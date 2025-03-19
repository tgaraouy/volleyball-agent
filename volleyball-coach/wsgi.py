import os
import sys

# Add the proper paths to sys.path for imports to work correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'src'))

# Now import the app
from src.web.app import app

if __name__ == "__main__":
    app.run()
