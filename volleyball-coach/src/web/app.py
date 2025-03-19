#!/usr/bin/env python3
"""
Web interface for the Volleyball Coaching System
"""

import os
import time
import json
import threading
import cv2
import numpy as np
import io
import base64
from flask import Flask, Response, render_template, jsonify, request, send_file, send_from_directory
from dotenv import load_dotenv
import tempfile
import re
import argparse
import secrets
import uuid
from werkzeug.utils import secure_filename
import ssl
import shutil
import logging
from datetime import datetime

# Add parent directory to path to import from other modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from video.pipeline import VolleyballAnalysisPipeline, VolleyballStatTracker
from ai.agent_tools import create_volleyball_agent, analyze_with_agent

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure SSL context
ssl_context = None
cert_path = os.path.join(os.path.dirname(__file__), 'cert.pem')
key_path = os.path.join(os.path.dirname(__file__), 'key.pem')

# Generate self-signed certificates if they don't exist
if not os.path.exists(cert_path) or not os.path.exists(key_path):
    print("SSL certificates not found. Generating self-signed certificates...")
    try:
        from OpenSSL import crypto
        
        # Create a key pair
        k = crypto.PKey()
        k.generate_key(crypto.TYPE_RSA, 2048)
        
        # Create a self-signed cert
        cert = crypto.X509()
        cert.get_subject().C = "US"
        cert.get_subject().ST = "State"
        cert.get_subject().L = "City"
        cert.get_subject().O = "Organization"
        cert.get_subject().OU = "Organizational Unit"
        cert.get_subject().CN = "VolleyballCoach"
        cert.set_serial_number(1000)
        cert.gmtime_adj_notBefore(0)
        cert.gmtime_adj_notAfter(10*365*24*60*60)  # 10 years validity
        cert.set_issuer(cert.get_subject())
        cert.set_pubkey(k)
        cert.sign(k, 'sha256')
        
        # Save the certificate and private key
        with open(cert_path, "wb") as f:
            f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
        with open(key_path, "wb") as f:
            f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k))
        
        print("Self-signed certificates generated successfully")
    except Exception as e:
        print(f"Error generating SSL certificates: {str(e)}")
        print("Will continue without SSL...")

# Use certificates if they exist
if os.path.exists(cert_path) and os.path.exists(key_path):
    try:
        ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
        ssl_context.options |= ssl.OP_NO_TLSv1 | ssl.OP_NO_TLSv1_1  # Only use TLS 1.2 or higher
        print("SSL certificates found, HTTPS will be enabled")
    except Exception as e:
        print(f"Error setting up SSL: {str(e)}")
        ssl_context = None
        print("Continuing without SSL...")

# Create temp directory if not exists
temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'temp')
os.makedirs(temp_dir, exist_ok=True)

# Create static directory if not exists
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
os.makedirs(static_dir, exist_ok=True)

# Global pipeline instance
pipeline = None

# Global stats tracker
stats_tracker = VolleyballStatTracker()

# Analysis timestamps to track most recent
analysis_timestamps = {
    "technique": 0,
    "positioning": 0,
    "tactics": 0
}

# Settings
app_settings = {
    "camera_index": 0,
    "analysis_interval": 10,
    "use_agent": True,
    "auto_analyze": True,
    "camera_type": "default"  # Options: "default"
}

def initialize_pipeline():
    """Initialize the video pipeline with current settings"""
    global pipeline
    
    # Close existing pipeline if it exists
    if pipeline:
        pipeline.close()
    
    # Create new pipeline
    pipeline = VolleyballAnalysisPipeline(
        camera_index=app_settings["camera_index"],
        analysis_interval=app_settings["analysis_interval"],
        use_agent=app_settings["use_agent"],
        camera_type=app_settings["camera_type"]
    )
    
    # Set callback for analysis results
    pipeline.set_callback(analysis_callback)
    
    # Start processing in a separate thread
    pipeline_thread = threading.Thread(target=pipeline.process_video_feed, args=(False,))
    pipeline_thread.daemon = True
    pipeline_thread.start()
    
    print(f"Pipeline initialized with camera {app_settings['camera_index']} of type {app_settings['camera_type']}")
    return pipeline

def analysis_callback(analysis_type, result):
    """Callback function for new analysis results"""
    # Update timestamps
    analysis_timestamps[analysis_type] = time.time()
    
    # Extract technique and quality information for stats
    if analysis_type == "technique":
        try:
            # Try to identify the technique from the result
            technique_keywords = {
                "serving": ["serve", "serving", "float serve", "jump serve", "underhand serve"],
                "setting": ["set", "setting", "overhead pass"],
                "spiking": ["spike", "spiking", "attack", "hitting"],
                "blocking": ["block", "blocking", "net defense"],
                "digging": ["dig", "digging", "defense", "defensive position"],
                "passing": ["pass", "passing", "bump", "forearm pass"]
            }
            
            # Default technique and quality
            detected_technique = None
            quality_score = 0.5  # Default middle score
            
            # Search for technique keywords in the result
            for technique, keywords in technique_keywords.items():
                if any(keyword.lower() in result.lower() for keyword in keywords):
                    detected_technique = technique
                    
                    # Try to estimate quality from the text
                    if "excellent" in result.lower() or "perfect" in result.lower() or "great" in result.lower():
                        quality_score = 0.9
                    elif "good" in result.lower():
                        quality_score = 0.7
                    elif "poor" in result.lower() or "incorrect" in result.lower() or "improve" in result.lower():
                        quality_score = 0.3
                    
                    break
            
            # Update stats if technique detected
            if detected_technique:
                stats_tracker.update_technique_stat(detected_technique, quality_score)
                
                # Extract improvement suggestions
                if "improve" in result.lower() or "should" in result.lower() or "try to" in result.lower():
                    # Look for sentences with improvement suggestions
                    sentences = result.split('.')
                    for sentence in sentences:
                        if any(word in sentence.lower() for word in ["improve", "should", "try to", "adjust", "correct"]):
                            suggestion = sentence.strip()
                            if suggestion:
                                stats_tracker.add_improvement_suggestion(detected_technique, suggestion)
            
        except Exception as e:
            print(f"Error processing technique stats: {e}")

def analyze_volleyball_technique(frame_bytes):
    """
    Analyze volleyball technique from a frame
    
    Args:
        frame_bytes: Image bytes of the frame to analyze
        
    Returns:
        str: Analysis of the volleyball technique
    """
    # Sample response for technique analysis
    return """
    The player is demonstrating proper arm positioning during this volleyball movement.
    Good extension through the shoulders and elbows.
    The follow-through appears natural and balanced.
    To improve: Focus on maintaining a consistent contact point with the ball.
    """

def analyze_volleyball_positioning(frame_bytes):
    """
    Analyze volleyball positioning from a frame
    
    Args:
        frame_bytes: Image bytes of the frame to analyze
        
    Returns:
        str: Analysis of the volleyball positioning
    """
    # Sample response for positioning analysis
    return """
    Player positioning appears balanced on the court.
    Good stance with knees slightly bent, ready to move in any direction.
    Court coverage is appropriate for this situation.
    To improve: Consider maintaining slightly more distance from teammates to optimize court coverage.
    """

def analyze_volleyball_tactics(frame_bytes):
    """
    Analyze volleyball tactics from a frame
    
    Args:
        frame_bytes: Image bytes of the frame to analyze
        
    Returns:
        str: Analysis of the volleyball tactics
    """
    # Sample response for tactics analysis
    return """
    The player is showing good awareness of the opposing team's setup.
    Shot selection is appropriate for the defensive formation shown.
    Good decision-making based on the available options.
    To improve: Consider varying attack patterns to be less predictable.
    """

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/video')
def video():
    """Render the video analysis page"""
    return render_template('video.html')

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    def generate():
        if not pipeline:
            initialize_pipeline()
            
        try:
            for frame in pipeline.get_frames():
                # Save current frame to disk
                pipeline.save_current_frame()
                
                # Convert to JPEG for streaming
                _, jpeg = cv2.imencode('.jpg', frame)
                yield (b'--frame\r\n'
                      b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        except Exception as e:
            print(f"Error in video feed: {str(e)}")
            # Generate a fallback frame with error message
            fallback = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(fallback, "Camera not available", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.putText(fallback, "Please check camera settings", (50, 280), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            _, jpeg = cv2.imencode('.jpg', fallback)
            yield (b'--frame\r\n'
                  b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
    
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/analysis')
def get_analysis():
    """API endpoint to get current analysis results"""
    # Return a simplified response structure matching what the tablet UI expects
    results = {
        "success": True,
        "analysis": {
            "technique": "View 3D references by clicking the '3D References' tab above.",
            "positioning": "Select a technique from the dropdown to view perfect form models.",
            "tactics": "You can add your own reference models using YouTube videos."
        },
        "timestamp": {
            "technique": time.time(),
            "positioning": time.time(),
            "tactics": time.time()
        }
    }
    
    return jsonify(results)

@app.route('/stats')
def get_stats():
    """API endpoint to get current statistics"""
    # Return a simplified response structure matching what the tablet UI expects
    stats_summary = {
        "success": True,
        "stats": {
            "session_duration": "Active",
            "frames_analyzed": 0,
            "most_practiced_technique": "3D Reference Models",
            "techniques_identified": {
                "serving": 0,
                "setting": 0,
                "spiking": 0,
                "passing": 0,
                "blocking": 0,
                "digging": 0
            }
        }
    }
    
    return jsonify(stats_summary)

@app.route('/analyze/<analysis_type>', methods=['POST'])
def analyze_frame(analysis_type):
    """API endpoint to analyze the current frame with a specific analysis type"""
    if not pipeline:
        return jsonify({"success": False, "error": "Pipeline not initialized"})
    
    if analysis_type not in ["technique", "positioning", "tactics"]:
        return jsonify({"success": False, "error": "Invalid analysis type"})
    
    try:
        # Get the current frame
        with pipeline.frame_lock:
            if pipeline.current_frame is None:
                return jsonify({"success": False, "error": "No frame available"})
            
            frame = pipeline.current_frame.copy()
        
        # Analyze the frame
        result = pipeline.analyze_frame(frame, analysis_type)
        
        # Update latest analysis
        pipeline.latest_analysis[analysis_type] = result
        
        # Update timestamp
        analysis_timestamps[analysis_type] = time.time()
        
        return jsonify({"success": True, "result": result})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/capture', methods=['POST'])
def capture_frame():
    """API endpoint to capture the current frame"""
    if not pipeline:
        return jsonify({"success": False, "error": "Pipeline not initialized"})
    
    try:
        # Generate a timestamp
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"capture_{timestamp}.jpg"
        
        # Save the current frame
        with pipeline.frame_lock:
            if pipeline.current_frame is None:
                return jsonify({"success": False, "error": "No frame available"})
            
            filepath = os.path.join(temp_dir, filename)
            cv2.imwrite(filepath, pipeline.current_frame)
        
        return jsonify({"success": True, "filename": filename})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    """API endpoint to get or update settings"""
    global app_settings
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            
            if 'camera_index' in data:
                app_settings['camera_index'] = int(data['camera_index'])
            
            if 'analysis_interval' in data:
                app_settings['analysis_interval'] = int(data['analysis_interval'])
            
            if 'use_agent' in data:
                app_settings['use_agent'] = bool(data['use_agent'])
            
            if 'auto_analyze' in data:
                app_settings['auto_analyze'] = bool(data['auto_analyze'])
            
            if 'camera_type' in data:
                app_settings['camera_type'] = data['camera_type']
            
            # Reinitialize pipeline with new settings
            initialize_pipeline()
            
            return jsonify({"success": True, "settings": app_settings})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)})
    else:
        return jsonify({"success": True, "settings": app_settings})

@app.route('/camera/type/<camera_type>', methods=['POST'])
def set_camera_type(camera_type):
    """API endpoint to set the camera type"""
    global app_settings
    
    valid_types = ["default"]
    
    if camera_type not in valid_types:
        return jsonify({
            "success": False, 
            "error": f"Invalid camera type. Valid options are: {', '.join(valid_types)}"
        })
    
    try:
        # Update the camera type
        app_settings['camera_type'] = camera_type
        
        # Reinitialize pipeline with new settings
        initialize_pipeline()
        
        return jsonify({
            "success": True, 
            "message": f"Camera type set to {camera_type}",
            "settings": app_settings
        })
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": f"Error setting camera type: {str(e)}"
        })

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory(static_dir, filename)

@app.route('/last_captured')
def last_captured():
    """Serve the last captured frame"""
    last_capture_path = os.path.join(temp_dir, 'last_captured.jpg')
    if os.path.exists(last_capture_path):
        return send_file(last_capture_path, mimetype='image/jpeg')
    else:
        return "No capture available", 404

@app.route('/clips')
def clips():
    """Render clips page"""
    return render_template('clips.html')

@app.route('/tablet')
def tablet():
    """Render tablet mode interface for sideline viewing"""
    return render_template('tablet.html')

@app.route('/api/clips')
def get_clips():
    """API endpoint to get saved clips"""
    # Return a simplified response structure
    clips = [
        {
            "id": "sample_clip",
            "start_time": time.time() - 3600,  # 1 hour ago
            "duration": 5.0,
            "reason": "Example clip for 3D reference model"
        }
    ]
    return jsonify({"success": True, "clips": clips})

@app.route('/api/clips/<clip_id>')
def get_clip(clip_id):
    """API endpoint to get a specific clip"""
    if not pipeline:
        return jsonify({"success": False, "error": "Pipeline not initialized"})
    
    try:
        clips = pipeline.get_saved_clips()
        for clip in clips:
            if clip['id'] == clip_id:
                return jsonify({"success": True, "clip": clip})
        
        return jsonify({"success": False, "error": "Clip not found"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/clips/<clip_id>', methods=['DELETE'])
def delete_clip(clip_id):
    """API endpoint to delete a specific clip"""
    if not pipeline:
        return jsonify({"success": False, "error": "Pipeline not initialized"})
    
    try:
        # Look for the clip
        clips = pipeline.get_saved_clips()
        clip_to_delete = None
        
        for clip in clips:
            if clip['id'] == clip_id:
                clip_to_delete = clip
                break
        
        if not clip_to_delete:
            return jsonify({"success": False, "error": "Clip not found"})
        
        # Delete the clip file
        clip_path = os.path.join(pipeline.clips_dir, f"{clip_id}.mp4")
        if os.path.exists(clip_path):
            os.remove(clip_path)
        
        # Remove from saved clips
        pipeline.saved_clips = [clip for clip in pipeline.saved_clips if clip['id'] != clip_id]
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/clips/<path:filename>')
def serve_clip(filename):
    """Serve a saved clip file"""
    if not pipeline:
        return "Pipeline not initialized", 500
    
    return send_from_directory(pipeline.clips_dir, filename)

# Technique reference images for side-by-side comparison
technique_references = {
    "serving": "reference_serve.jpg",
    "setting": "reference_set.jpg",
    "spiking": "reference_spike.jpg", 
    "blocking": "reference_block.jpg",
    "digging": "reference_dig.jpg",
    "passing": "reference_pass.jpg"
}

@app.route('/api/reference/<technique>')
def get_reference_image(technique):
    """API endpoint to get reference images for technique comparison"""
    if technique in technique_references:
        reference_file = technique_references[technique]
        reference_path = os.path.join(static_dir, 'references', reference_file)
        
        # If reference file doesn't exist, return a placeholder
        if not os.path.exists(reference_path):
            return send_from_directory(static_dir, 'placeholder.jpg')
        
        return send_file(reference_path)
    else:
        return "Technique reference not found", 404

# === 3D Technique Reference Model Routes ===
@app.route('/api/reference3d/<model_id>')
def get_reference_model(model_id):
    """API endpoint to get a specific 3D reference model"""
    try:
        print(f"Requested model ID: {model_id}")
        
        # Handle both formats: with or without _reference suffix
        base_model_id = model_id.replace('_reference', '')
        
        # Try different filenames
        possible_paths = [
            os.path.join(app.static_folder, 'references', '3d_models', f'{model_id}.json'),
            os.path.join(app.static_folder, 'references', '3d_models', f'{base_model_id}.json'),
            os.path.join(app.static_folder, 'references', '3d_models', f'{base_model_id}_reference.json')
        ]
        
        # Try each path
        model_path = None
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                print(f"Found model file at: {model_path}")
                break
        
        if not model_path:
            print(f"Model file not found for {model_id}. Tried: {possible_paths}")
            return jsonify({
                'success': False,
                'message': f'Model {model_id} not found'
            }), 404
            
        # Read the model file
        with open(model_path, 'r') as f:
            model_data = json.load(f)
            print(f"Loaded model data with keys: {list(model_data.keys())}")
            
        # Return wrapped in the expected format
        return jsonify({
            'success': True,
            'technique': model_data
        })
    except Exception as e:
        print(f"Error getting reference model: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/reference3d')
def list_reference_models():
    """List all available 3D reference models"""
    try:
        print("Listing available 3D reference models")
        models_dir = os.path.join(app.static_folder, 'references', '3d_models')
        
        # Create directory if it doesn't exist
        if not os.path.exists(models_dir):
            os.makedirs(models_dir, exist_ok=True)
            print(f"Created models directory: {models_dir}")
            
        models = []
        
        # List all JSON files in the models directory
        for filename in os.listdir(models_dir):
            if filename.endswith('.json'):
                model_id = filename.replace('.json', '')
                model_name = model_id.replace('_', ' ').title()
                model_path = f'/api/reference3d/{model_id}'
                
                print(f"Found model file: {filename}, ID: {model_id}, URL: {model_path}")
                
                # Try to load the model to get description
                description = "Volleyball technique reference model"
                try:
                    with open(os.path.join(models_dir, filename), 'r') as f:
                        model_data = json.load(f)
                        if 'description' in model_data:
                            description = model_data['description']
                        elif 'name' in model_data:
                            model_name = model_data['name']
                except Exception as e:
                    print(f"Error loading model data from {filename}: {str(e)}")
                
                models.append({
                    'name': model_name,
                    'url': model_path,
                    'description': description
                })
        
        # If no models are found, add a sample
        if not models:
            print("No models found, creating a sample model")
            # Create a sample model if not exists
            sample_path = os.path.join(models_dir, 'sample.json')
            if not os.path.exists(sample_path):
                sample_data = {
                    'name': 'Sample Technique',
                    'type': 'forearm_pass',
                    'description': 'Sample volleyball technique model',
                    'skill_level': 'Intermediate',
                    'source': 'Generated',
                    'keypoints': [
                        {'x': 0, 'y': 0, 'z': 0},
                        {'x': 10, 'y': 10, 'z': 0},
                        {'x': 20, 'y': 20, 'z': 0},
                        {'x': 30, 'y': 30, 'z': 0},
                        {'x': 40, 'y': 40, 'z': 0},
                        {'x': -10, 'y': 10, 'z': 0},
                        {'x': -20, 'y': 20, 'z': 0},
                        {'x': -30, 'y': 30, 'z': 0},
                        {'x': -40, 'y': 40, 'z': 0},
                        {'x': 0, 'y': -20, 'z': 0},
                        {'x': 0, 'y': -40, 'z': 0},
                        {'x': 0, 'y': -60, 'z': 0},
                        {'x': 10, 'y': -70, 'z': 0},
                        {'x': -10, 'y': -70, 'z': 0},
                        {'x': 15, 'y': -15, 'z': 0},
                        {'x': 25, 'y': 0, 'z': 0},
                        {'x': 35, 'y': 15, 'z': 0},
                        {'x': -15, 'y': -15, 'z': 0},
                        {'x': -25, 'y': 0, 'z': 0},
                        {'x': -35, 'y': 15, 'z': 0}
                    ],
                    'key_points': [
                        'Keep your arms straight and locked',
                        'Form a flat platform with your forearms',
                        'Bend your knees for better balance',
                        'Direct the ball with your shoulders, not your arms',
                        'Watch the ball contact your arms'
                    ]
                }
                
                os.makedirs(os.path.dirname(sample_path), exist_ok=True)
                with open(sample_path, 'w') as f:
                    json.dump(sample_data, f, indent=2)
                
                # Also create sample_reference.json for compatibility
                sample_reference_path = os.path.join(models_dir, 'sample_reference.json')
                with open(sample_reference_path, 'w') as f:
                    json.dump(sample_data, f, indent=2)
                
                models.append({
                    'name': 'Sample Technique',
                    'url': '/api/reference3d/sample',
                    'description': 'Sample volleyball technique model'
                })
                
                models.append({
                    'name': 'Sample Reference',
                    'url': '/api/reference3d/sample_reference',
                    'description': 'Sample volleyball technique reference model'
                })
        
        print(f"Returning {len(models)} models: {[model['url'] for model in models]}")
        return jsonify({
            'success': True,
            'models': models
        })
    except Exception as e:
        print(f"Error listing reference models: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/3d-viewer')
def technique_viewer():
    """Render 3D viewer page"""
    return render_template('3d_viewer.html')

@app.route('/analyze/<analysis_type>/mobile', methods=['POST'])
def analyze_mobile(analysis_type):
    """API endpoint for mobile device analysis with uploaded frames"""
    try:
        print("\n===== MOBILE ANALYSIS REQUEST =====")
        print(f"Analysis type: {analysis_type}")
        print(f"Request content type: {request.content_type}")
        print(f"Request files keys: {list(request.files.keys())}")
        print(f"Request form keys: {list(request.form.keys())}")
        
        if analysis_type not in ["technique", "positioning", "tactics"]:
            print(f"ERROR: Invalid analysis type: {analysis_type}")
            return jsonify({"error": "Invalid analysis type"}), 400
        
        # Check if we have a file in the request
        if 'image' not in request.files:
            print("ERROR: No image file found in request")
            for key in request.files:
                print(f"Found file with key: {key}")
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            print("ERROR: Empty filename in request")
            return jsonify({"error": "No image provided"}), 400
        
        print(f"Image filename: {file.filename}")
        print(f"Image content type: {file.content_type}")
        
        # Read the file directly as bytes
        img_bytes = file.read()
        print(f"Read {len(img_bytes)} bytes from uploaded image")
        
        # Use the AI agent for analysis with the raw bytes
        print("Creating volleyball agent...")
        agent = create_volleyball_agent()
        print(f"Calling analyze_with_agent for {analysis_type} analysis...")
        result = analyze_with_agent(agent, img_bytes, analysis_type)
        print(f"Analysis result: {result[:100]}...")
        
        # Update stats via callback
        analysis_callback(analysis_type, result)
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in analyze_mobile: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/capture/mobile', methods=['POST'])
def capture_mobile_frame():
    """API endpoint to capture an uploaded frame from a mobile device"""
    try:
        # Check if image was uploaded
        if 'image' not in request.files:
            return jsonify({"success": False, "error": "No image uploaded"})
        
        # Get the uploaded image
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "error": "Empty file"})
        
        # Read the image
        in_memory_file = io.BytesIO()
        file.save(in_memory_file)
        data = np.frombuffer(in_memory_file.getvalue(), dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({"success": False, "error": "Could not decode image"})
        
        # Generate a timestamp
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"capture_mobile_{timestamp}.jpg"
        
        # Save the image
        filepath = os.path.join(temp_dir, filename)
        cv2.imwrite(filepath, image)
        
        # Also save as last_captured
        last_capture_path = os.path.join(temp_dir, 'last_captured.jpg')
        cv2.imwrite(last_capture_path, image)
        
        return jsonify({"success": True, "filename": filename})
    
    except Exception as e:
        print(f"Error capturing mobile frame: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})

@app.route('/capture_still')
def capture_still():
    """API endpoint to capture a still frame from the current video feed"""
    try:
        if not pipeline:
            initialize_pipeline()
            
        # Get the current frame from the pipeline
        frame = pipeline.get_current_frame()
        
        if frame is None:
            # Return a default error image
            fallback = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(fallback, "No camera frame available", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            _, jpeg = cv2.imencode('.jpg', fallback)
            return Response(jpeg.tobytes(), mimetype='image/jpeg')
        
        # Convert to JPEG for sending
        _, jpeg = cv2.imencode('.jpg', frame)
        
        # Also save to a file for potential later use
        timestamp = int(time.time())
        still_filename = f"still_{timestamp}.jpg"
        still_path = os.path.join(temp_dir, still_filename)
        cv2.imwrite(still_path, frame)
        
        # Return as an image response
        return Response(jpeg.tobytes(), mimetype='image/jpeg')
    
    except Exception as e:
        print(f"Error capturing still frame: {str(e)}")
        # Return a default error image
        fallback = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(fallback, f"Error: {str(e)}", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        _, jpeg = cv2.imencode('.jpg', fallback)
        return Response(jpeg.tobytes(), mimetype='image/jpeg')

@app.route('/get_frame', methods=['GET'])
def get_frame():
    """API endpoint to get the latest frame from the video feed"""
    try:
        global pipeline
        
        if pipeline is None or not hasattr(pipeline, 'get_current_frame'):
            app.logger.error("Pipeline not initialized or doesn't support get_current_frame")
            return Response(status=500)
        
        frame = pipeline.get_current_frame()
        if frame is None:
            app.logger.error("No frame available from pipeline")
            return Response(status=404)
        
        # Convert the frame to JPEG
        success, buffer = cv2.imencode('.jpg', frame)
        if not success:
            app.logger.error("Failed to encode frame as JPEG")
            return Response(status=500)
        
        app.logger.info("Successfully retrieved and encoded frame")
        return Response(buffer.tobytes(), mimetype='image/jpeg')
    except Exception as e:
        app.logger.error(f"Error in get_frame: {str(e)}")
        return Response(status=500)

@app.route('/test_mobile_image', methods=['POST'])
def test_mobile_image():
    """Simple test endpoint to verify mobile image upload is working correctly"""
    try:
        # Log all the form data and files for debugging
        app.logger.info(f"Request form data keys: {list(request.form.keys())}")
        app.logger.info(f"Request files keys: {list(request.files.keys())}")
        
        # Check for image in all possible field names
        image_file = None
        image_field_name = None
        
        for field_name in ['image', 'frame', 'file', 'photo']:
            if field_name in request.files:
                image_file = request.files[field_name]
                image_field_name = field_name
                break
        
        if not image_file:
            app.logger.error("No image found in any standard field")
            return jsonify({
                "success": False, 
                "error": "No image found", 
                "payload": {
                    "form_keys": list(request.form.keys()),
                    "file_keys": list(request.files.keys()),
                    "content_type": request.content_type,
                    "content_length": request.content_length
                }
            }), 400
        
        # Read the file directly as bytes
        img_bytes = image_file.read()
        
        # Get basic info about the image
        image_info = {
            "field_name": image_field_name,
            "filename": image_file.filename,
            "content_type": image_file.content_type,
            "size_bytes": len(img_bytes)
        }
        
        app.logger.info(f"Successfully received image: {image_info}")
        
        # Save the image for verification
        timestamp = int(time.time())
        temp_filename = f"test_mobile_{timestamp}.jpg"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(img_bytes)
        
        # Return success with image details
        return jsonify({
            "success": True,
            "message": "Image successfully received and processed",
            "image_info": image_info,
            "saved_as": temp_filename
        })
    except Exception as e:
        app.logger.error(f"Error in test_mobile_image: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/mobile_test')
def mobile_test_page():
    """Renders a simple test page for mobile devices"""
    return render_template('mobile_test.html')

@app.route('/api/volleyball/analyze-video', methods=['POST'])
def analyze_video():
    """
    Analyze a volleyball video using the AI system.
    
    Expects a multipart/form-data request with:
    - video: The video file
    - analysis_type: Type of analysis (technique, positioning, tactics)
    - interval_seconds: Optional interval between frames to analyze (in seconds)
    - max_frames: Optional maximum number of frames to analyze
    
    Returns:
        JSON with analysis results
    """
    try:
        print("\n===== VIDEO ANALYSIS REQUEST =====")
        # Check if video file is present
        if 'video' not in request.files:
            print("ERROR: No video file found in request")
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        
        if video_file.filename == '':
            print("ERROR: Empty video filename")
            return jsonify({"error": "Empty video file name"}), 400
        
        # Get analysis parameters
        analysis_type = request.form.get('analysis_type', 'technique')
        interval_seconds = float(request.form.get('interval_seconds', 1.0))
        max_frames = int(request.form.get('max_frames', 5))
        
        print(f"Analysis requested - Type: {analysis_type}, Interval: {interval_seconds}s, Max frames: {max_frames}")
        
        # Save the video file temporarily
        temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        video_path = os.path.join(temp_dir, f"{int(time.time())}_uploaded_{secure_filename(video_file.filename)}")
        video_file.save(video_path)
        print(f"Video saved to: {video_path}")
        
        # Analyze the video
        print("Opening video for analysis...")
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"ERROR: Could not open video file at {video_path}")
            return jsonify({"error": "Could not process video file"}), 500
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        
        print(f"Video properties - FPS: {fps}, Frames: {frame_count}, Duration: {duration:.2f}s")
        
        # Calculate frame indices to analyze
        frame_indices = []
        if duration > 0:
            # Distribute frames evenly across video
            for i in range(min(max_frames, int(duration / interval_seconds) + 1)):
                frame_idx = int(i * interval_seconds * fps)
                if frame_idx < frame_count:
                    frame_indices.append(frame_idx)
                    
            # Ensure we have at least one frame if video is very short
            if not frame_indices and frame_count > 0:
                frame_indices = [int(frame_count / 2)]  # Middle frame
                
        print(f"Will analyze frames at indices: {frame_indices}")
        
        # Extract and analyze frames
        results = []
        frame_images = []
        
        for idx, frame_idx in enumerate(frame_indices):
            # Set frame position
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            
            if not ret:
                print(f"WARNING: Could not read frame at index {frame_idx}")
                continue
                
            # Save frame as image for reference
            frame_path = os.path.join(temp_dir, f"{int(time.time())}_frame_{idx}.jpg")
            cv2.imwrite(frame_path, frame)
            frame_images.append(frame_path)
            
            print(f"Processing frame {idx+1}/{len(frame_indices)} (index {frame_idx})...")
            
            # Convert frame to bytes for analysis
            success, buffer = cv2.imencode('.jpg', frame)
            if not success:
                print(f"WARNING: Could not encode frame {idx} to JPEG")
                continue
                
            frame_bytes = buffer.tobytes()
            
            # Analyze frame based on analysis type
            try:
                if analysis_type == "technique":
                    analysis_result = analyze_volleyball_technique(frame_bytes)
                elif analysis_type == "positioning":
                    analysis_result = analyze_volleyball_positioning(frame_bytes)
                elif analysis_type == "tactics":
                    analysis_result = analyze_volleyball_tactics(frame_bytes)
                else:
                    analysis_result = "Unknown analysis type requested"
                    
                print(f"Analysis for frame {idx+1} complete: {len(analysis_result) if analysis_result else 0} chars")
                    
                results.append({
                    "frame_index": frame_idx,
                    "timestamp": frame_idx / fps if fps > 0 else 0,
                    "analysis": analysis_result,
                    "frame_path": os.path.basename(frame_path)
                })
            except Exception as e:
                import traceback
                print(f"Error analyzing frame {idx}: {str(e)}")
                traceback.print_exc()
                results.append({
                    "frame_index": frame_idx,
                    "timestamp": frame_idx / fps if fps > 0 else 0,
                    "error": str(e),
                    "frame_path": os.path.basename(frame_path)
                })
        
        # Release video
        cap.release()
        
        # Prepare response with analysis results and metadata
        response = {
            "success": True,
            "analysis_type": analysis_type,
            "video_info": {
                "fps": fps,
                "frame_count": frame_count,
                "duration": duration,
                "filename": os.path.basename(video_path)
            },
            "frames_analyzed": len(results),
            "results": results
        }
        
        print(f"Analysis complete - {len(results)} frames analyzed")
        return jsonify(response)
        
    except Exception as e:
        app.logger.error(f"Error in analyze_video: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/temp/<path:filename>')
def serve_temp_file(filename):
    """
    Serve files from the temp directory
    """
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'temp')
    return send_from_directory(temp_dir, filename)

def run_app():
    """Run the Flask app"""
    try:
        import argparse
        
        # Parse command line arguments
        parser = argparse.ArgumentParser(description='Run the Volleyball Coach web application')
        parser.add_argument('--host', default='127.0.0.1', help='Host address to run the server on')
        parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
        args = parser.parse_args()
        
        # Initialize the pipeline
        initialize_pipeline()
        
        # Print access information
        protocol = "https" if ssl_context else "http"
        print(f"Volleyball Coach running at {protocol}://{args.host}:{args.port}")
        if args.host == '0.0.0.0' or args.host not in ['127.0.0.1', 'localhost']:
            import socket
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            print(f"Access from other devices using: {protocol}://{local_ip}:{args.port}")
        
        # Run the app
        app.run(host=args.host, port=args.port, ssl_context=ssl_context, threaded=True)
    
    except KeyboardInterrupt:
        print("Server stopped by user")
    finally:
        if pipeline:
            pipeline.close()

if __name__ == "__main__":
    run_app() 