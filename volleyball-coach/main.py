#!/usr/bin/env python3
"""
Main entry point for the Volleyball Coaching System.
This script provides a command-line interface to start different components of the system.
"""

import argparse
import os
import sys
import subprocess
import webbrowser
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def start_web_interface():
    """Start the web interface for coaches"""
    print("Starting web interface...")
    web_app_path = os.path.join('src', 'web', 'app.py')
    
    # Check if the file exists
    if not os.path.exists(web_app_path):
        print(f"Error: Could not find web app at {web_app_path}")
        return False
    
    # Start the web server
    try:
        process = subprocess.Popen([sys.executable, web_app_path])
        print("Web interface started at http://localhost:5000")
        print("Press Ctrl+C to stop")
        
        # Open web browser
        webbrowser.open('http://localhost:5000')
        
        # Wait for the process to complete
        process.wait()
        return True
    except KeyboardInterrupt:
        print("\nStopping web interface...")
        process.terminate()
        return True
    except Exception as e:
        print(f"Error starting web interface: {e}")
        return False

def test_video_pipeline():
    """Test the video processing pipeline with a sample video or camera"""
    print("Testing video pipeline...")
    pipeline_path = os.path.join('src', 'video', 'pipeline.py')
    
    # Check if the file exists
    if not os.path.exists(pipeline_path):
        print(f"Error: Could not find pipeline at {pipeline_path}")
        return False
    
    # Start the pipeline
    try:
        process = subprocess.Popen([sys.executable, pipeline_path])
        print("Video pipeline started")
        print("Press Ctrl+C to stop")
        
        # Wait for the process to complete
        process.wait()
        return True
    except KeyboardInterrupt:
        print("\nStopping video pipeline...")
        process.terminate()
        return True
    except Exception as e:
        print(f"Error starting video pipeline: {e}")
        return False

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("Checking dependencies...")
    
    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 9):
        print("Error: Python 3.9 or higher is required")
        return False
    
    # Check if required packages are installed
    required_packages = [
        'langchain',
        'langchain_openai',
        'opencv-python',
        'flask',
        'google-generativeai',
        'pillow',
        'python-dotenv',
        'numpy',
        'requests'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"Error: The following packages are missing: {', '.join(missing_packages)}")
        print("Please install them using: pip install -r requirements.txt")
        return False
    
    # Check if API keys are set
    if not os.getenv('GOOGLE_API_KEY'):
        print("Warning: GOOGLE_API_KEY environment variable is not set")
        print("Some features may not work correctly")
    
    if not os.getenv('OPENAI_API_KEY'):
        print("Warning: OPENAI_API_KEY environment variable is not set")
        print("Some features may not work correctly")
    
    print("All dependencies are installed")
    return True

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Volleyball Coaching System')
    parser.add_argument('--web', action='store_true', help='Start the web interface')
    parser.add_argument('--test', action='store_true', help='Test the video pipeline')
    parser.add_argument('--check', action='store_true', help='Check dependencies')
    
    args = parser.parse_args()
    
    # If no arguments are provided, show help
    if not any(vars(args).values()):
        parser.print_help()
        return
    
    # Check dependencies if requested or if starting a component
    if args.check or args.web or args.test:
        if not check_dependencies() and not args.check:
            return
    
    # Start components based on arguments
    if args.web:
        start_web_interface()
    
    if args.test:
        test_video_pipeline()

if __name__ == '__main__':
    main() 