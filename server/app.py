import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Get absolute path to the project root and load environment variables
PROJECT_ROOT = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = PROJECT_ROOT / '.env'

if not ENV_FILE.exists():
    raise ValueError(f"Could not find .env file at {ENV_FILE}")

print(f"Loading environment from: {ENV_FILE.absolute()}")
load_dotenv(dotenv_path=str(ENV_FILE), override=True)  # Use override=True to ensure values are updated

# Verify environment variables are loaded
google_ai_key = os.environ.get('GOOGLE_AI_API_KEY')
if not google_ai_key:
    raise ValueError("GOOGLE_AI_API_KEY not found in environment variables")
else:
    print(f"Successfully loaded Google AI API Key: {google_ai_key[:4]}...{google_ai_key[-4:]}")

# Now import other modules
import tempfile
import traceback
import cv2
import json
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image, UnidentifiedImageError
import io
import numpy as np

# Add src directory to path to import from volleyball_ai package
SERVER_DIR = PROJECT_ROOT / 'server'
sys.path.append(str(SERVER_DIR / 'src'))

# Import functions from volleyball_ai package
from volleyball_ai import (
    analyze_volleyball_image,
    analyze_technique,
    analyze_positioning,
    analyze_tactics,
    process_video_frames,
    analyze_video_frames_gemini,
    setup_real_time_analysis,
    VolleyballAgentSystem,
    detect_players,
    track_ball_movement,
    analyze_play_sequence,
    PlayerAgent,
    CoachAgent,
    TeamAnalysisAgent
)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
UPLOAD_DIR = UPLOAD_FOLDER  # Alias for consistency
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"Upload folder: {UPLOAD_FOLDER}")

# Set maximum content length (100MB)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# Initialize the volleyball agent system
try:
    agent_system = VolleyballAgentSystem(
        model_path=os.environ.get("MODEL_PATH", "../model/volleyball_model.h5"),
        labels_path=os.environ.get("LABELS_PATH", "../model/volleyball_labels.json"),
        api_key=os.environ.get("OPENAI_API_KEY")
    )
    print("Volleyball Agent System initialized successfully")
except Exception as e:
    print(f"Error initializing Volleyball Agent System: {e}")
    agent_system = None

# Utility function to validate and fix image files
def validate_and_fix_image(image_path):
    """
    Validates an image file and attempts to fix it if there are issues.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Tuple of (success, fixed_image_path or error_message)
    """
    if not os.path.exists(image_path):
        return False, f"Image file not found: {image_path}"
    
    if os.path.getsize(image_path) == 0:
        return False, f"Image file is empty: {image_path}"
    
    # Try different methods to validate and fix the image
    methods_tried = []
    
    # Method 1: Try with PIL directly
    try:
        methods_tried.append("PIL direct open")
        with Image.open(image_path) as img:
            img_format = img.format
            img_size = img.size
            img_mode = img.mode
            
            # Convert to RGB if needed
            if img_mode != 'RGB':
                img = img.convert('RGB')
            
            # Save a fixed copy
            fixed_path = f"{os.path.splitext(image_path)[0]}_fixed.jpg"
            img.save(fixed_path, format="JPEG", quality=95)
            print(f"Successfully fixed image with PIL: {fixed_path}")
            return True, fixed_path
    except UnidentifiedImageError:
        print(f"PIL could not identify the image format: {image_path}")
    except Exception as e:
        print(f"Error with PIL direct open: {str(e)}")
    
    # Method 2: Try with OpenCV
    try:
        methods_tried.append("OpenCV")
        img = cv2.imread(image_path)
        if img is None:
            print(f"OpenCV could not load the image: {image_path}")
        else:
            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Save using OpenCV
            fixed_path = f"{os.path.splitext(image_path)[0]}_cv_fixed.jpg"
            cv2.imwrite(fixed_path, img)
            
            # Verify the saved image
            if os.path.exists(fixed_path) and os.path.getsize(fixed_path) > 0:
                print(f"Successfully fixed image with OpenCV: {fixed_path}")
                return True, fixed_path
    except Exception as e:
        print(f"Error with OpenCV: {str(e)}")
    
    # Method 3: Try reading as binary and converting with PIL
    try:
        methods_tried.append("Binary read + PIL")
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Try to create an image from binary data
        img = Image.open(io.BytesIO(image_data))
        img_format = img.format
        
        # Save a fixed copy
        fixed_path = f"{os.path.splitext(image_path)[0]}_binary_fixed.jpg"
        img.save(fixed_path, format="JPEG", quality=95)
        print(f"Successfully fixed image with binary read + PIL: {fixed_path}")
        return True, fixed_path
    except Exception as e:
        print(f"Error with binary read + PIL: {str(e)}")
    
    # Method 4: Create a blank image with error message
    try:
        methods_tried.append("Create blank image")
        blank_img = Image.new('RGB', (800, 600), color='white')
        
        # Add text explaining the error
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(blank_img)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        error_text = f"Could not process the original image. Methods tried: {', '.join(methods_tried)}"
        draw.text((50, 50), error_text, fill="black", font=font)
        draw.text((50, 100), "This is a placeholder image created due to processing errors.", fill="black", font=font)
        
        # Save the blank image
        blank_path = f"{os.path.splitext(image_path)[0]}_blank.jpg"
        blank_img.save(blank_path)
        print(f"Created blank image with error message: {blank_path}")
        return True, blank_path
    except Exception as e:
        print(f"Error creating blank image: {str(e)}")
    
    return False, f"Failed to validate or fix image after trying multiple methods: {', '.join(methods_tried)}"

@app.route('/')
def index():
    return send_from_directory('../public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../public', path)

@app.route('/api/volleyball-agent/analyze', methods=['POST'])
def analyze_video():
    """
    Analyze a volleyball video using the agent system.
    
    Expected JSON payload:
    {
        "video_data": "base64 encoded video data",
        "player_data": {
            "playerId": "player123",
            "name": "John Doe",
            "position": "outside_hitter",
            "skillLevel": "intermediate"
        }
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'video_data' not in data:
            return jsonify({"error": "Missing video data"}), 400
        
        # Get video data from request
        video_data = data.get('video_data')
        player_data = data.get('player_data', {})
        
        # Remove data:video/mp4;base64, prefix if present
        if ',' in video_data:
            video_data = video_data.split(',')[1]
        
        # Decode base64 video data
        video_bytes = base64.b64decode(video_data)
        
        # Save video to temporary file
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False, dir=UPLOAD_FOLDER) as temp_file:
            temp_file.write(video_bytes)
            video_path = temp_file.name
        
        # Analyze the video
        results = agent_system.analyze_player_video(video_path, player_data)
        
        # Clean up temporary file
        try:
            os.unlink(video_path)
        except:
            pass
        
        return jsonify(results)
    
    except Exception as e:
        print(f"Error analyzing video: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/feedback', methods=['POST'])
def get_real_time_feedback():
    """
    Get real-time feedback for a single video frame.
    
    Expected JSON payload:
    {
        "frame_data": "base64 encoded image data",
        "current_time": 10.5
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'frame_data' not in data:
            return jsonify({"error": "Missing frame data"}), 400
        
        # Get frame data from request
        frame_data = data.get('frame_data')
        current_time = data.get('current_time', 0)
        
        # Remove data:image/jpeg;base64, prefix if present
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        # Decode base64 frame data
        frame_bytes = base64.b64decode(frame_data)
        
        # Save frame to temporary file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False, dir=UPLOAD_FOLDER) as temp_file:
            temp_file.write(frame_bytes)
            frame_path = temp_file.name
        
        # Get feedback for the frame
        feedback = agent_system.get_real_time_feedback(frame_path, current_time)
        
        # Clean up temporary file
        try:
            os.unlink(frame_path)
        except:
            pass
        
        return jsonify(feedback)
    
    except Exception as e:
        print(f"Error getting feedback: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/training', methods=['POST'])
def generate_training_program():
    """
    Generate a personalized training program.
    
    Expected JSON payload:
    {
        "player_id": "player123",
        "technique_focus": "spike"
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'player_id' not in data:
            return jsonify({"error": "Missing player ID"}), 400
        
        # Get data from request
        player_id = data.get('player_id')
        technique_focus = data.get('technique_focus')
        
        # Generate training program
        program = agent_system.generate_training_program(player_id, technique_focus)
        
        return jsonify(program)
    
    except Exception as e:
        print(f"Error generating training program: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/team-analysis', methods=['POST'])
def analyze_team_performance():
    """
    Analyze team performance.
    
    Expected JSON payload:
    {
        "team_id": "varsity_2025",
        "game_data": {...}
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'team_id' not in data:
            return jsonify({"error": "Missing team ID"}), 400
        
        # Get data from request
        team_id = data.get('team_id')
        game_data = data.get('game_data')
        
        # Analyze team performance
        analysis = agent_system.analyze_team_performance(team_id, game_data)
        
        return jsonify(analysis)
    
    except Exception as e:
        print(f"Error analyzing team performance: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/collaborative-analysis', methods=['POST'])
def collaborative_analysis():
    """
    Perform a collaborative analysis using multiple agents.
    
    Expected JSON payload:
    {
        "frame_data": "base64 encoded image data",
        "player_id": "player123"
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'frame_data' not in data:
            return jsonify({"error": "Missing frame data"}), 400
        
        # Get frame data from request
        frame_data = data.get('frame_data')
        player_id = data.get('player_id')
        
        # Remove data:image/jpeg;base64, prefix if present
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        # Decode base64 image data
        img_bytes = base64.b64decode(frame_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        # Extract features from the frame
        if hasattr(agent_system.classifier, 'extract_features'):
            features = agent_system.classifier.extract_features(frame)
            features_dict = {f"feature_{i}": float(val) for i, val in enumerate(features)}
            
            # Perform collaborative analysis
            results = agent_system.collaborative_analysis(features_dict, player_id)
            
            return jsonify(results)
        else:
            return jsonify({"error": "Feature extraction not available"}), 500
    
    except Exception as e:
        print(f"Error performing collaborative analysis: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/vector-search', methods=['POST'])
def vector_search_analysis():
    """
    Analyze volleyball technique using vector search for similar techniques.
    
    Expected JSON payload:
    {
        "frame_data": "base64 encoded image data",
        "player_id": "player123"
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'frame_data' not in data:
            return jsonify({"error": "Missing frame data"}), 400
        
        # Get frame data from request
        frame_data = data.get('frame_data')
        player_id = data.get('player_id')
        
        # Remove data:image/jpeg;base64, prefix if present
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        # Decode base64 image data
        img_bytes = base64.b64decode(frame_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        # Extract features from the frame
        if hasattr(agent_system.classifier, 'extract_features'):
            features = agent_system.classifier.extract_features(frame)
            features_dict = {f"feature_{i}": float(val) for i, val in enumerate(features)}
            
            # Perform vector search analysis
            results = agent_system.analyze_with_vector_search(features_dict, player_id)
            
            return jsonify({"results": str(results)})
        else:
            return jsonify({"error": "Feature extraction not available"}), 500
    
    except Exception as e:
        print(f"Error performing vector search analysis: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/metrics', methods=['GET'])
def get_agent_metrics():
    """
    Get metrics about agent usage and performance.
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        metrics = agent_system.get_agent_metrics()
        return jsonify(metrics)
    
    except Exception as e:
        print(f"Error getting agent metrics: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/batch-process', methods=['POST'])
def batch_process_videos():
    """
    Process multiple videos in batch mode.
    
    Expected JSON payload:
    {
        "video_paths": ["path/to/video1.mp4", "path/to/video2.mp4"],
        "player_ids": ["player123", "player456"]
    }
    """
    if agent_system is None:
        return jsonify({"error": "Agent system not initialized"}), 500
    
    try:
        data = request.json
        
        if not data or 'video_paths' not in data:
            return jsonify({"error": "Missing video paths"}), 400
        
        # Get data from request
        video_paths = data.get('video_paths')
        player_ids = data.get('player_ids')
        
        # Process videos in batch
        results = agent_system.batch_process_videos(video_paths, player_ids)
        
        return jsonify(results)
    
    except Exception as e:
        print(f"Error batch processing videos: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball-agent/analyze-image', methods=['POST'])
def analyze_image():
    """
    Analyze a single image for volleyball technique.
    
    Expected JSON payload:
    {
        "image_data": "base64 encoded image data",
        "analysis_type": "technique|positioning|tactics"
    }
    """
    try:
        data = request.json
        
        if not data or 'image_data' not in data:
            return jsonify({"error": "Missing image data"}), 400
        
        # Get image data and analysis type from request
        image_data = data.get('image_data')
        analysis_type = data.get('analysis_type', 'technique')
        
        # Remove data:image/jpeg;base64, prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image data
        image_bytes = base64.b64decode(image_data)
        
        # Save image to temporary file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False, dir=UPLOAD_FOLDER) as temp_file:
            temp_file.write(image_bytes)
            image_path = temp_file.name
        
        # Analyze the image based on the analysis type
        try:
            if analysis_type == 'technique':
                result = analyze_technique(image_path)
            elif analysis_type == 'positioning':
                result = analyze_positioning(image_path)
            elif analysis_type == 'tactics':
                result = analyze_tactics(image_path)
            else:
                return jsonify({"error": f"Invalid analysis type: {analysis_type}"}), 400
        finally:
            # Clean up temporary file
            try:
                os.unlink(image_path)
            except:
                pass
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/volleyball/analyze-video', methods=['POST'])
def analyze_video_google():
    """
    Analyze a volleyball video using Google AI.
    
    Expects a multipart/form-data request with:
    - video: The video file
    - analysis_type: Type of analysis (technique, positioning, tactics)
    - interval_seconds: Optional interval between frames to analyze (in seconds)
    - max_frames: Optional maximum number of frames to analyze
    
    Returns:
        JSON with analysis results
    """
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        video_file = request.files['video']
        
        if video_file.filename == '':
            return jsonify({"error": "Empty video file name"}), 400
        
        # Get analysis parameters
        analysis_type = request.form.get('analysis_type', 'technique')
        interval_seconds = float(request.form.get('interval_seconds', 2.0))
        max_frames = int(request.form.get('max_frames', 5))
        
        print(f"Received video: {video_file.filename}, Content-Type: {video_file.content_type}")
        print(f"Analysis parameters: type={analysis_type}, interval={interval_seconds}s, max_frames={max_frames}")
        
        # Ensure uploads directory exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Determine file extension
        file_extension = os.path.splitext(video_file.filename)[1].lower()
        if not file_extension:
            # Try to determine from content type
            if 'mp4' in video_file.content_type:
                file_extension = '.mp4'
            elif 'quicktime' in video_file.content_type or 'mov' in video_file.content_type:
                file_extension = '.mov'
            elif 'avi' in video_file.content_type:
                file_extension = '.avi'
            else:
                file_extension = '.mp4'  # Default to mp4
        
        # Save the uploaded video to a temporary file
        temp_video_path = os.path.join(UPLOAD_FOLDER, f"tmp{next(tempfile._get_candidate_names())}{file_extension}")
        
        try:
            video_file.save(temp_video_path)
            print(f"Saved video to: {temp_video_path}")
            
            # Check if file exists and has content
            if not os.path.exists(temp_video_path):
                return jsonify({"error": f"Failed to save video file to {temp_video_path}"}), 500
                
            file_size = os.path.getsize(temp_video_path)
            if file_size == 0:
                return jsonify({"error": "Uploaded video file is empty"}), 400
                
            print(f"Video file size: {file_size} bytes")
            
            # For MOV files, convert to MP4 first
            if file_extension.lower() == '.mov':
                print("Converting MOV file to MP4 for better compatibility")
                try:
                    mp4_path = convert_video_to_mp4(temp_video_path)
                    print(f"Converted video to MP4: {mp4_path}")
                    
                    # Use the converted file for analysis
                    temp_video_path = mp4_path
                except Exception as conv_error:
                    print(f"Warning: Failed to convert MOV to MP4: {str(conv_error)}")
                    print("Proceeding with original MOV file")
            
            # Use our new frame-based approach for video analysis
            output_file, results = analyze_video_frames_gemini(
                temp_video_path,
                analysis_type=analysis_type,
                interval_seconds=interval_seconds,
                max_frames=max_frames
            )
            
            # Format results for JSON response
            formatted_results = []
            for result in results:
                formatted_result = {
                    "timestamp": result.get("timestamp", "Unknown"),
                    "analysis": result.get("analysis", "No analysis available")
                }
                if "error" in result:
                    formatted_result["error"] = result["error"]
                formatted_results.append(formatted_result)
            
            return jsonify({
                "success": True,
                "video": video_file.filename,
                "analysis_type": analysis_type,
                "results": formatted_results,
                "output_file": output_file
            })
            
        except Exception as e:
            error_msg = f"Error analyzing video: {str(e)}"
            print(error_msg)
            traceback.print_exc()
            return jsonify({"error": error_msg}), 500
            
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(temp_video_path):
                    os.unlink(temp_video_path)
                    print(f"Removed temporary video file: {temp_video_path}")
            except Exception as e:
                print(f"Warning: Could not remove temporary file {temp_video_path}: {str(e)}")
    
    except Exception as e:
        error_msg = f"Server error: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        return jsonify({"error": error_msg}), 500

@app.route('/api/volleyball/analyze-frame', methods=['POST'])
def analyze_frame():
    """
    Analyze a single video frame using Google AI.
    
    Expected form data:
    - frame: The frame image file to analyze
    - analysis_type: "technique" | "positioning" | "tactics"
    """
    try:
        # Check if form data is present
        if 'frame' not in request.files:
            return jsonify({"error": "Missing frame file"}), 400
        
        # Get frame file from request
        frame_file = request.files['frame']
        analysis_type = request.form.get('analysis_type', 'technique')
        
        # Debug information
        print(f"Received frame: {frame_file.filename}, Content-Type: {frame_file.content_type}")
        
        # Ensure uploads directory exists
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            print(f"Created uploads directory: {UPLOAD_FOLDER}")
        
        # Save frame to temporary file
        try:
            # Generate a unique filename with proper extension
            file_ext = os.path.splitext(frame_file.filename)[1].lower()
            if not file_ext or file_ext not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                file_ext = '.jpg'  # Default to jpg
                
            temp_file_path = os.path.join(UPLOAD_FOLDER, f"tmp{next(tempfile._get_candidate_names())}{file_ext}")
            frame_file.save(temp_file_path)
            print(f"Saved frame to: {temp_file_path}")
            
            # Verify and fix the image if needed
            success, result_path = validate_and_fix_image(temp_file_path)
            if not success:
                return jsonify({"error": result_path}), 400
                
            # Use the fixed image path for analysis
            frame_path = result_path
            print(f"Using validated/fixed frame: {frame_path}")
            
            # Analyze the frame
            try:
                if analysis_type == 'technique':
                    result = analyze_technique(frame_path)
                elif analysis_type == 'positioning':
                    result = analyze_positioning(frame_path)
                elif analysis_type == 'tactics':
                    result = analyze_tactics(frame_path)
                else:
                    return jsonify({"error": f"Invalid analysis type: {analysis_type}"}), 400
            except Exception as analysis_error:
                print(f"Error during frame analysis: {str(analysis_error)}")
                traceback.print_exc()
                return jsonify({"error": f"Analysis error: {str(analysis_error)}"}), 500
            
            # Clean up temporary files
            try:
                os.unlink(temp_file_path)
                if frame_path != temp_file_path:  # If we created a fixed version
                    os.unlink(frame_path)
                print(f"Cleaned up temporary files")
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up temporary files: {str(cleanup_error)}")
            
            return jsonify({"analysis": result})
            
        except Exception as save_error:
            print(f"Error saving or processing uploaded file: {str(save_error)}")
            traceback.print_exc()
            return jsonify({"error": f"Error processing uploaded file: {str(save_error)}"}), 500
    
    except Exception as e:
        print(f"Error analyzing frame: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/health')
def health_check():
    """
    Simple health check endpoint to verify the server is running.
    """
    return jsonify({
        "status": "ok",
        "message": "Server is running",
        "google_ai_integration": os.environ.get("GOOGLE_AI_API_KEY") is not None,
        "openai_integration": os.environ.get("OPENAI_API_KEY") is not None
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=True) 