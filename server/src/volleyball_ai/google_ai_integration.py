"""
Google AI Studio Integration for Volleyball Analysis

This module provides functions for analyzing volleyball techniques, positioning,
and tactics using Google's Gemini Pro Vision model.
"""

import os
import cv2
import csv
import time
import google.generativeai as genai
from PIL import Image
from pathlib import Path
import subprocess
import tempfile
import shutil

# Try to import imghdr, but make it optional
try:
    import imghdr
    IMGHDR_AVAILABLE = True
except ImportError:
    print("Warning: imghdr module not available. Image type detection will be limited.")
    IMGHDR_AVAILABLE = False

# Get API key directly from environment variables
API_KEY = os.environ.get('GOOGLE_AI_API_KEY')

if not API_KEY:
    print("\nAvailable environment variables:")
    for key in os.environ:
        if 'KEY' in key:
            value = os.environ[key]
            masked_value = value[:4] + '...' + value[-4:] if len(value) > 8 else '***'
            print(f"{key}={masked_value}")
    raise ValueError("GOOGLE_AI_API_KEY not found in environment variables")

print(f"Configuring Google AI with API Key: {API_KEY[:4]}...{API_KEY[-4:] if len(API_KEY) > 8 else ''}")

try:
    genai.configure(api_key=API_KEY)
    # Initialize the Gemini model - using gemini-1.5-flash
    model = genai.GenerativeModel('gemini-1.5-flash')
    print("Successfully configured Google Generative AI with gemini-1.5-flash model")
except Exception as e:
    print(f"Error configuring Google Generative AI: {e}")
    if "API key not valid" in str(e):
        print("\n⚠️ Your Google AI API key is invalid.")
        print("Please get a valid API key from: https://makersuite.google.com/app/apikey")
        print("Then update your .env file with the new key.")
    raise

# Function to save frame properly
def save_frame_properly(frame, path):
    """Helper function to save a frame with proper error handling"""
    try:
        # First try direct OpenCV save
        success = cv2.imwrite(path, frame)
        if not success:
            raise ValueError("cv2.imwrite returned False")
        
        # Verify the file exists and has content
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            raise ValueError("File is empty or doesn't exist after cv2.imwrite")
        
        # Try to open with PIL to verify it's a valid image
        try:
            pil_img = Image.open(path)
            pil_img.verify()  # Verify it's a valid image
            pil_img.close()
            
            # Re-open to check format
            pil_img = Image.open(path)
            img_format = pil_img.format
            img_size = pil_img.size
            pil_img.close()
            
            print(f"Frame saved and verified: {path}, format={img_format}, size={img_size}")
            return True, path
        except Exception as pil_error:
            print(f"PIL verification failed: {str(pil_error)}")
            
            # Try to convert and save with PIL
            try:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(frame_rgb)
                
                # Save to a different path with PIL
                pil_path = f"{os.path.splitext(path)[0]}_pil.jpg"
                pil_img.save(pil_path, format="JPEG", quality=95)
                
                if os.path.exists(pil_path) and os.path.getsize(pil_path) > 0:
                    print(f"Frame saved with PIL: {pil_path}")
                    return True, pil_path
                else:
                    raise ValueError("Failed to save with PIL")
            except Exception as pil_save_error:
                print(f"PIL save failed: {str(pil_save_error)}")
                
                # Try one more approach - save as PNG
                try:
                    png_path = f"{os.path.splitext(path)[0]}.png"
                    cv2.imwrite(png_path, frame)
                    
                    if os.path.exists(png_path) and os.path.getsize(png_path) > 0:
                        print(f"Frame saved as PNG: {png_path}")
                        return True, png_path
                    else:
                        raise ValueError("Failed to save as PNG")
                except Exception as png_error:
                    print(f"PNG save failed: {str(png_error)}")
    except Exception as e:
        print(f"Error saving frame: {str(e)}")
    
    # Last resort - create a blank image with error message
    try:
        blank_img = Image.new('RGB', (800, 600), color='white')
        
        # Add text explaining the error
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(blank_img)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        error_text = "Could not save frame properly. This is a placeholder image."
        draw.text((50, 50), error_text, fill="black", font=font)
        
        # Save the blank image
        blank_path = f"{os.path.splitext(path)[0]}_blank.jpg"
        blank_img.save(blank_path)
        print(f"Created blank image as fallback: {blank_path}")
        return True, blank_path
    except Exception as blank_error:
        print(f"Even blank image creation failed: {str(blank_error)}")
        return False, None

# Extract frames from a video file in a memory-efficient way
def extract_frames_from_video(video_path, output_dir=None, frame_interval=30, max_frames=None):
    """
    Extract frames from a video file in a memory-efficient way.
    
    Args:
        video_path: Path to the video file
        output_dir: Directory to save frames (temporary if None)
        frame_interval: Extract 1 frame per this many frames (or seconds if float)
        max_frames: Maximum number of frames to extract (evenly distributed if specified)
    
    Returns:
        List of paths to extracted frames
    """
    print(f"Extracting frames from video: {video_path}")
    
    # Create temporary directory if not specified
    if output_dir is None:
        output_dir = tempfile.mkdtemp()
        print(f"Created temporary directory for frames: {output_dir}")
    else:
        os.makedirs(output_dir, exist_ok=True)
        print(f"Using specified directory for frames: {output_dir}")
    
    # Open the video
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        # Try with different backend if default fails
        print("First attempt to open video failed, trying with different backend...")
        
        # Try with different backend options
        for backend in [cv2.CAP_FFMPEG, cv2.CAP_GSTREAMER, cv2.CAP_MSMF]:
            try:
                video = cv2.VideoCapture(video_path, backend)
                if video.isOpened():
                    print(f"Successfully opened video with backend {backend}")
                    break
            except:
                continue
        
        if not video.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
    
    # Get video properties
    fps = video.get(cv2.CAP_PROP_FPS)
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Video properties: {width}x{height}, {fps} fps, {frame_count} frames")
    
    if fps <= 0:
        print("Warning: Invalid fps detected, using default value of 30")
        fps = 30
    
    if frame_count <= 0 or frame_count > 100000:  # Unreasonably large frame count
        print("Warning: Invalid frame count detected, estimating based on duration")
        # Try to estimate frame count based on duration if available
        duration = video.get(cv2.CAP_PROP_POS_MSEC) / 1000
        if duration > 0:
            frame_count = int(duration * fps)
        else:
            # Default to 10 seconds if we can't determine
            print("Warning: Could not determine video duration, assuming 10 seconds")
            frame_count = int(10 * fps)
    
    # Calculate frame interval
    if isinstance(frame_interval, float):
        # Convert seconds to frames
        frame_interval_frames = int(fps * frame_interval)
        print(f"Converting {frame_interval} seconds to {frame_interval_frames} frames")
    else:
        frame_interval_frames = frame_interval
    
    if frame_interval_frames <= 0:
        frame_interval_frames = 1
    
    # Determine which frames to extract
    if max_frames and max_frames > 0:
        # Distribute frames evenly across the video
        target_frames = []
        if max_frames > 1 and frame_count > max_frames:
            for i in range(max_frames):
                # This ensures even distribution across the entire video
                target_frame = int((i / (max_frames - 1)) * (frame_count - 1))
                target_frames.append(target_frame)
            print(f"Extracting {max_frames} frames evenly distributed across video")
        else:
            # Just use interval-based extraction but cap at max_frames
            target_frames = list(range(0, frame_count, frame_interval_frames))[:max_frames]
            print(f"Extracting frames at interval of {frame_interval_frames} frames, capped at {max_frames}")
    else:
        # Use all frames at the specified interval
        target_frames = list(range(0, frame_count, frame_interval_frames))
        print(f"Extracting frames at interval of {frame_interval_frames} frames")
    
    # Extract frames
    frame_paths = []
    frames_processed = 0
    
    # For videos with unreliable frame counts, use time-based approach
    if frame_count > 10000 or os.path.splitext(video_path)[1].lower() == '.mov':
        print("Using time-based frame extraction for large video or MOV file")
        
        # Calculate time intervals based on estimated duration
        duration = frame_count / fps
        time_interval = duration / (len(target_frames) or 1)
        
        for i, _ in enumerate(target_frames):
            # Set position by time (milliseconds)
            time_pos = i * time_interval
            video.set(cv2.CAP_PROP_POS_MSEC, time_pos * 1000)
            
            success, frame = video.read()
            frames_processed += 1
            
            if not success:
                print(f"Failed to read frame at time position {time_pos:.2f} seconds")
                continue
            
            # Save frame
            frame_path = os.path.join(output_dir, f"frame_{i:06d}_{time_pos:.2f}s.jpg")
            
            success, saved_path = save_frame_properly(frame, frame_path)
            if success:
                frame_paths.append(saved_path)
                print(f"Saved frame at time position {time_pos:.2f} seconds")
            else:
                print(f"Warning: Failed to save frame at time position {time_pos:.2f} seconds")
            
            # Safety check
            if frames_processed >= 100:  # Limit for safety
                print("Maximum frame processing limit reached")
                break
    else:
        # Standard frame-based approach
        for i, frame_num in enumerate(target_frames):
            video.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            success, frame = video.read()
            frames_processed += 1
            
            if not success:
                print(f"Failed to read frame at position {frame_num}")
                continue
            
            # Calculate timestamp for filename
            timestamp = frame_num / fps
            
            # Save frame
            frame_path = os.path.join(output_dir, f"frame_{i:06d}_{frame_num}_{timestamp:.2f}s.jpg")
            
            success, saved_path = save_frame_properly(frame, frame_path)
            if success:
                frame_paths.append(saved_path)
                print(f"Saved frame at position {frame_num} (time: {timestamp:.2f}s)")
            else:
                print(f"Warning: Failed to save frame at position {frame_num}")
    
    video.release()
    print(f"Extracted {len(frame_paths)} frames from video")
    
    return frame_paths

# New function to analyze video frames with Gemini
def analyze_video_frames_gemini(video_path, analysis_type="technique", interval_seconds=2.0, max_frames=5, output_file=None):
    """
    Analyze frames from a video using Google's Gemini model.
    
    Args:
        video_path: Path to the video file
        analysis_type: Type of analysis to perform ("technique", "positioning", or "tactics")
        interval_seconds: Time interval between frames in seconds
        max_frames: Maximum number of frames to analyze
        output_file: Path to save the analysis results (CSV format)
        
    Returns:
        Path to the output file with analysis results and list of analysis results
    """
    # Check if file exists
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    # Determine the output file path if not provided
    if output_file is None:
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_file = f"{base_name}_analysis.csv"
    
    # Create a directory for temporary frames
    temp_dir = os.path.join(os.path.dirname(video_path), "temp_frames")
    os.makedirs(temp_dir, exist_ok=True)
    print(f"Created temporary directory: {temp_dir}")
    
    # Select the analysis function based on type
    if analysis_type == "technique":
        prompt = """
        Identify and analyze the volleyball technique being performed in this image.
        
        Please include:
        1. The specific technique being performed (e.g., serve, set, spike, block, dig)
        2. Assessment of proper form and body positioning
        3. Strengths in the execution
        4. Areas for improvement
        5. Specific coaching cues for better performance
        """
    elif analysis_type == "positioning":
        prompt = """
        Analyze the volleyball court positioning in this image.
        
        Please include:
        1. The formation being used (e.g., 5-1, 6-2, 4-2)
        2. Evaluation of court coverage
        3. Player positioning relative to the ball
        4. Defensive or offensive readiness
        5. Suggested positioning improvements
        """
    elif analysis_type == "tactics":
        prompt = """
        Provide a tactical analysis of this volleyball scenario.
        
        Please include:
        1. The game situation (e.g., serve receive, transition, free ball)
        2. Offensive or defensive strategies in use
        3. Team formation effectiveness
        4. Decision-making assessment
        5. Potential tactical adjustments
        """
    else:
        raise ValueError(f"Invalid analysis type: {analysis_type}")
    
    try:
        # Extract frames from the video
        print(f"Extracting frames from video at {interval_seconds} second intervals, max {max_frames} frames")
        frame_paths = extract_frames_from_video(
            video_path, 
            output_dir=temp_dir,
            frame_interval=interval_seconds,
            max_frames=max_frames
        )
        
        if not frame_paths:
            raise ValueError("No frames could be extracted from the video")
        
        # Analyze each frame
        results = []
        
        # Create CSV file for results
        with open(output_file, 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(["Timestamp", "Analysis"])
            
            for frame_path in frame_paths:
                try:
                    # Extract timestamp from filename
                    filename = os.path.basename(frame_path)
                    # Format: frame_000001_30_1.00s.jpg
                    parts = filename.split('_')
                    if len(parts) >= 4:
                        # Try to get timestamp from filename
                        try:
                            timestamp_str = parts[3].replace('s.jpg', '')
                            timestamp = float(timestamp_str)
                            minutes = int(timestamp // 60)
                            seconds = int(timestamp % 60)
                            timestamp_display = f"{minutes}:{seconds:02d}"
                        except:
                            # Fallback to frame number
                            frame_num = int(parts[2])
                            timestamp_display = f"Frame {frame_num}"
                    else:
                        timestamp_display = f"Frame {parts[1]}"
                    
                    print(f"Analyzing frame: {frame_path} (Timestamp: {timestamp_display})")
                    
                    # Analyze the frame
                    try:
                        # Load the image with PIL
                        image = Image.open(frame_path)
                        
                        # Generate content with the image and prompt
                        response = model.generate_content([prompt, image])
                        analysis = response.text
                        
                        # Add to results
                        result_item = {
                            "timestamp": timestamp_display,
                            "frame_path": frame_path,
                            "analysis": analysis
                        }
                        results.append(result_item)
                        
                        # Write to CSV
                        writer.writerow([timestamp_display, analysis])
                        print(f"Successfully analyzed frame at {timestamp_display}")
                        
                    except Exception as e:
                        error_msg = f"Error analyzing frame: {str(e)}"
                        print(error_msg)
                        result_item = {
                            "timestamp": timestamp_display,
                            "frame_path": frame_path,
                            "error": error_msg
                        }
                        results.append(result_item)
                        writer.writerow([timestamp_display, f"Error: {error_msg}"])
                
                except Exception as e:
                    print(f"Error processing frame {frame_path}: {str(e)}")
        
        print(f"Video analysis complete. Analyzed {len(results)} frames.")
        print(f"Results saved to: {output_file}")
        
        return output_file, results
    
    finally:
        # Clean up temporary frames (optional)
        # Uncomment if you want to automatically delete the frames after analysis
        # for frame_path in frame_paths:
        #     try:
        #         os.remove(frame_path)
        #     except:
        #         pass
        # try:
        #     os.rmdir(temp_dir)
        # except:
        #     pass
        pass

def safe_analyze_image(image_path, prompt):
    """
    Safely analyze an image with error handling.
    
    Args:
        image_path: Path to the image
        prompt: Prompt for the analysis
        
    Returns:
        Analysis text or error message
    """
    try:
        return analyze_volleyball_image(image_path, prompt)
    except Exception as e:
        error_msg = f"Error analyzing image: {str(e)}"
        print(error_msg)
        
        if "API key not valid" in str(e):
            return "Unable to analyze the image. Your Google AI API key is invalid. Please update your .env file with a valid API key from https://makersuite.google.com/app/apikey"
        
        return f"Unable to analyze the image. {error_msg}"

def analyze_volleyball_image(image_path, prompt):
    """
    Analyze a volleyball image using Google's Gemini 1.5 Flash model.
    
    Args:
        image_path: Path to the volleyball image
        prompt: Question about the volleyball technique
        
    Returns:
        The model's analysis of the volleyball technique
    """
    # Check if file exists
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Check file size
    file_size = os.path.getsize(image_path)
    if file_size == 0:
        raise ValueError(f"Image file is empty: {image_path}")
    
    print(f"Loading image from: {image_path} (size: {file_size} bytes)")
    
    # Try to verify the image file format using imghdr if available
    if IMGHDR_AVAILABLE:
        try:
            img_type = imghdr.what(image_path)
            print(f"Image type detected by imghdr: {img_type}")
            if img_type is None:
                print("Warning: imghdr could not identify the image type")
        except Exception as e:
            print(f"Error in imghdr: {str(e)}")
    else:
        # Alternative method to check image type using file extension
        file_ext = os.path.splitext(image_path)[1].lower()
        print(f"Using file extension for image type detection: {file_ext}")
        if file_ext not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            print(f"Warning: Unrecognized image file extension: {file_ext}")
    
    try:
        # Load the image with PIL
        image = Image.open(image_path)
        
        # Verify image was loaded correctly
        img_format = image.format
        img_size = image.size
        img_mode = image.mode
        print(f"Image loaded successfully: format={img_format}, size={img_size}, mode={img_mode}")
        
        # Convert to RGB if needed (some formats like RGBA can cause issues)
        if img_mode != 'RGB':
            print(f"Converting image from {img_mode} to RGB")
            image = image.convert('RGB')
        
        # Save a copy of the image in a standard format for debugging
        debug_path = f"{os.path.splitext(image_path)[0]}_debug.jpg"
        image.save(debug_path, format="JPEG")
        print(f"Saved debug copy of image to: {debug_path}")
        
        # Generate content with the image and prompt
        print("Sending image to Google AI for analysis using gemini-1.5-flash model...")
        
        # For gemini-1.5-flash, we can use the simpler API
        response = model.generate_content([prompt, image])
        
        # Return the text response
        return response.text
    except Exception as e:
        print(f"Error in analyze_volleyball_image with PIL: {str(e)}")
        
        # Try alternative approach for problematic images
        try:
            print("Attempting alternative approach with OpenCV...")
            # Try loading with OpenCV and converting to PIL
            cv_img = cv2.imread(image_path)
            if cv_img is None:
                raise ValueError(f"OpenCV could not load the image: {image_path}")
            
            # Convert from BGR to RGB (OpenCV uses BGR)
            cv_img_rgb = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
            
            # Save a debug copy of the OpenCV-processed image
            cv_debug_path = f"{os.path.splitext(image_path)[0]}_cv_debug.jpg"
            cv2.imwrite(cv_debug_path, cv_img)
            print(f"Saved OpenCV debug copy to: {cv_debug_path}")
            
            # Convert to PIL image
            pil_img = Image.fromarray(cv_img_rgb)
            
            print("Successfully converted image with OpenCV, sending to Google AI...")
            
            # Try with the alternative format
            response = model.generate_content([prompt, pil_img])
            
            return response.text
        except Exception as cv_error:
            print(f"Alternative approach also failed: {str(cv_error)}")
            
            # Last resort: try to create a blank image with text
            try:
                print("Creating a blank image with error message as last resort...")
                # Create a blank image
                blank_img = Image.new('RGB', (800, 600), color='white')
                
                # Add text explaining the error
                from PIL import ImageDraw, ImageFont
                draw = ImageDraw.Draw(blank_img)
                try:
                    font = ImageFont.truetype("arial.ttf", 20)
                except:
                    font = ImageFont.load_default()
                
                error_text = f"Could not process the original image. Error: {str(e)}"
                draw.text((50, 50), error_text, fill="black", font=font)
                draw.text((50, 100), "This is a placeholder image created due to processing errors.", fill="black", font=font)
                
                # Save the blank image for debugging
                blank_path = f"{os.path.splitext(image_path)[0]}_blank.jpg"
                blank_img.save(blank_path)
                print(f"Saved blank image to: {blank_path}")
                
                # Try to analyze with the blank image
                response = model.generate_content([
                    "The original image could not be processed. " + prompt,
                    blank_img
                ])
                
                return "ERROR PROCESSING IMAGE: " + response.text
            except Exception as blank_error:
                print(f"Even blank image approach failed: {str(blank_error)}")
                raise Exception(f"Failed to process image with all methods: {str(e)} | {str(cv_error)} | {str(blank_error)}")

def analyze_technique(image_path):
    """
    Analyze volleyball technique in an image.
    
    Args:
        image_path: Path to the volleyball image
        
    Returns:
        Analysis of the volleyball technique
    """
    prompt = """
    Identify and analyze the volleyball technique being performed in this image.
    
    Please include:
    1. The specific technique being performed (e.g., serve, set, spike, block, dig)
    2. Assessment of proper form and body positioning
    3. Strengths in the execution
    4. Areas for improvement
    5. Specific coaching cues for better performance
    """
    return safe_analyze_image(image_path, prompt)

def analyze_positioning(image_path):
    """
    Analyze volleyball court positioning in an image.
    
    Args:
        image_path: Path to the volleyball image
        
    Returns:
        Analysis of the volleyball court positioning
    """
    prompt = """
    Analyze the volleyball court positioning in this image.
    
    Please include:
    1. The formation being used (e.g., 5-1, 6-2, 4-2)
    2. Evaluation of court coverage
    3. Player positioning relative to the ball
    4. Defensive or offensive readiness
    5. Suggested positioning improvements
    """
    return safe_analyze_image(image_path, prompt)

def analyze_tactics(image_path):
    """
    Provide tactical analysis of a volleyball scenario.
    
    Args:
        image_path: Path to the volleyball image
        
    Returns:
        Tactical analysis of the volleyball scenario
    """
    prompt = """
    Provide a tactical analysis of this volleyball scenario.
    
    Please include:
    1. The game situation (e.g., serve receive, transition, free ball)
    2. Offensive or defensive strategies in use
    3. Team formation effectiveness
    4. Decision-making assessment
    5. Potential tactical adjustments
    """
    return safe_analyze_image(image_path, prompt)

def process_video_frames(video_path, analysis_type="technique", interval_seconds=2, output_file=None):
    """
    Process video frames at regular intervals and analyze them.
    
    Args:
        video_path: Path to the volleyball video
        analysis_type: Type of analysis to perform ("technique", "positioning", or "tactics")
        interval_seconds: Interval between frames to analyze (in seconds)
        output_file: Path to save the analysis results (CSV format)
        
    Returns:
        Path to the output file with analysis results
    """
    # Check if file exists
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    # Check file size
    file_size = os.path.getsize(video_path)
    if file_size == 0:
        raise ValueError(f"Video file is empty: {video_path}")
    
    # Get file extension
    file_extension = os.path.splitext(video_path)[1].lower()
    print(f"Processing video from: {video_path} (size: {file_size} bytes, extension: {file_extension})")
    
    # Determine the output file path if not provided
    if output_file is None:
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_file = f"{base_name}_analysis.csv"
    
    # Create a directory for temporary frames
    temp_dir = os.path.join(os.path.dirname(video_path), "temp_frames")
    os.makedirs(temp_dir, exist_ok=True)
    print(f"Created temporary directory: {temp_dir}")
    
    # Open the video
    video = cv2.VideoCapture(video_path)
    if not video.isOpened():
        # Try with different backend if default fails (especially for MOV files)
        print("First attempt to open video failed, trying with different backend...")
        
        # Try with different backend options
        for backend in [cv2.CAP_FFMPEG, cv2.CAP_GSTREAMER, cv2.CAP_MSMF]:
            try:
                video = cv2.VideoCapture(video_path, backend)
                if video.isOpened():
                    print(f"Successfully opened video with backend {backend}")
                    break
            except:
                continue
        
        if not video.isOpened():
            raise ValueError(f"Could not open video file: {video_path}. Make sure it's a valid video format (MP4, MOV, AVI).")
    
    fps = video.get(cv2.CAP_PROP_FPS)
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Video properties: {width}x{height}, {fps} fps, {frame_count} frames, duration: {frame_count/fps:.2f} seconds")
    
    if fps <= 0:
        print("Warning: Invalid fps detected, using default value of 30")
        fps = 30
    
    if frame_count <= 0:
        print("Warning: Invalid frame count detected, estimating based on duration")
        # Try to estimate frame count based on duration if available
        duration = video.get(cv2.CAP_PROP_POS_MSEC) / 1000
        if duration > 0:
            frame_count = int(duration * fps)
        else:
            # Default to 10 seconds if we can't determine
            print("Warning: Could not determine video duration, assuming 10 seconds")
            frame_count = int(10 * fps)
    
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid video dimensions: {width}x{height}")
    
    # Select the analysis function
    if analysis_type == "technique":
        analysis_func = analyze_technique
    elif analysis_type == "positioning":
        analysis_func = analyze_positioning
    elif analysis_type == "tactics":
        analysis_func = analyze_tactics
    else:
        raise ValueError(f"Invalid analysis type: {analysis_type}")
    
    # Create CSV file for results
    with open(output_file, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Timestamp", "Analysis"])
        
        # Process frames at intervals
        interval_frames = int(fps * interval_seconds)
        if interval_frames <= 0:
            interval_frames = 1
        
        print(f"Analyzing frames at intervals of {interval_frames} frames ({interval_seconds} seconds)")
        
        frames_processed = 0
        frames_analyzed = 0
        
        # For MOV files or when frame count is unreliable, use a different approach
        if file_extension == '.mov' or frame_count > 10000:  # Unreasonably large frame count
            print("Using time-based frame extraction for MOV file or large frame count")
            current_time = 0
            max_duration = 600  # Maximum 10 minutes to prevent infinite loops
            
            while current_time < max_duration:
                # Set position by time (milliseconds)
                video.set(cv2.CAP_PROP_POS_MSEC, current_time * 1000)
                success, frame = video.read()
                frames_processed += 1
                
                if not success:
                    print(f"End of video reached at {current_time} seconds")
                    break
                
                # Process this frame
                temp_frame_path = os.path.join(temp_dir, f"frame_{current_time}.jpg")
                
                # Save frame with proper error handling
                success, saved_path = save_frame_properly(frame, temp_frame_path)
                if not success:
                    print(f"Warning: Failed to save frame at time {current_time}")
                    current_time += interval_seconds
                    continue
                
                # Format timestamp
                minutes = int(current_time // 60)
                seconds = int(current_time % 60)
                timestamp_str = f"{minutes}:{seconds:02d}"
                
                # Analyze frame
                try:
                    print(f"Analyzing frame at {timestamp_str} (time {current_time}s)")
                    analysis = analysis_func(saved_path)
                    frames_analyzed += 1
                    
                    # Write to CSV
                    writer.writerow([timestamp_str, analysis])
                    print(f"Successfully analyzed frame at {timestamp_str}")
                except Exception as e:
                    print(f"Error analyzing frame at {timestamp_str}: {str(e)}")
                    writer.writerow([timestamp_str, f"Error: {str(e)}"])
                
                # Clean up
                try:
                    os.unlink(saved_path)
                except Exception as e:
                    print(f"Warning: Could not delete temporary file {saved_path}: {str(e)}")
                
                # Move to next interval
                current_time += interval_seconds
                
                # Safety check to prevent infinite loops
                if frames_processed > 1000:
                    print("Maximum frame limit reached, stopping analysis")
                    break
        else:
            # Standard frame-based approach for normal videos
            for frame_num in range(0, frame_count, interval_frames):
                video.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                success, frame = video.read()
                frames_processed += 1
                
                if success:
                    # Save frame temporarily
                    temp_frame_path = os.path.join(temp_dir, f"frame_{frame_num}.jpg")
                    
                    # Save frame with proper error handling
                    success, saved_path = save_frame_properly(frame, temp_frame_path)
                    if not success:
                        print(f"Warning: Failed to save frame at position {frame_num}")
                        continue
                    
                    # Get timestamp
                    timestamp = frame_num / fps
                    timestamp_str = f"{int(timestamp // 60)}:{int(timestamp % 60):02d}"
                    
                    # Analyze frame
                    try:
                        print(f"Analyzing frame at {timestamp_str} (frame {frame_num})")
                        analysis = analysis_func(saved_path)
                        frames_analyzed += 1
                        
                        # Write to CSV
                        writer.writerow([timestamp_str, analysis])
                        print(f"Successfully analyzed frame at {timestamp_str}")
                    except Exception as e:
                        print(f"Error analyzing frame at {timestamp_str}: {str(e)}")
                        writer.writerow([timestamp_str, f"Error: {str(e)}"])
                    
                    # Clean up
                    try:
                        os.unlink(saved_path)
                    except Exception as e:
                        print(f"Warning: Could not delete temporary file {saved_path}: {str(e)}")
                else:
                    print(f"Warning: Could not read frame at position {frame_num}")
    
    # Clean up temp directory
    try:
        os.rmdir(temp_dir)
        print(f"Removed temporary directory: {temp_dir}")
    except Exception as e:
        print(f"Warning: Could not remove temporary directory {temp_dir}: {str(e)}")
    
    video.release()
    print(f"Video processing complete. Processed {frames_processed} frames, successfully analyzed {frames_analyzed} frames.")
    print(f"Results saved to: {output_file}")
    
    return output_file

def setup_real_time_analysis(camera_index=0):
    """
    Set up real-time analysis from a camera feed.
    
    Args:
        camera_index: Index of the camera to use
    """
    import cv2
    import time
    
    cap = cv2.VideoCapture(camera_index)
    last_analysis_time = 0
    analysis_result = "Ready for analysis"
    
    # Create a directory for temporary frames
    temp_dir = "temp_frames"
    os.makedirs(temp_dir, exist_ok=True)
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            break
            
        # Display the frame
        cv2.putText(frame, "Press 'A' to analyze", (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
        # Display current analysis (first 50 chars)
        lines = [analysis_result[i:i+50] for i in range(0, len(analysis_result), 50)]
        for i, line in enumerate(lines[:3]):  # Show up to 3 lines
            cv2.putText(frame, line, (10, 70 + i*30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imshow('Volleyball Analysis', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        # Analyze when 'A' is pressed (but not too frequently)
        if key == ord('a') and time.time() - last_analysis_time > 5:
            # Save current frame
            temp_path = os.path.join(temp_dir, "temp_analysis.jpg")
            cv2.imwrite(temp_path, frame)
            
            # Perform analysis
            analysis_result = analyze_technique(temp_path)
            last_analysis_time = time.time()
            
            # Clean up
            os.remove(temp_path)
            
        # Exit on 'Q'
        if key == ord('q'):
            break
            
    # Clean up
    cap.release()
    cv2.destroyAllWindows()
    
    try:
        os.rmdir(temp_dir)
    except:
        pass

def convert_video_to_mp4(input_path, output_path=None):
    """
    Convert a video file to MP4 format using FFmpeg.
    
    Args:
        input_path: Path to the input video file
        output_path: Path to save the output MP4 file (optional)
        
    Returns:
        Path to the converted MP4 file
    """
    if output_path is None:
        # Create output path with same name but .mp4 extension
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}_converted.mp4"
    
    print(f"Converting video from {input_path} to {output_path}")
    
    try:
        # First try using FFmpeg if available
        try:
            # Check if FFmpeg is installed
            subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            
            # Use FFmpeg to convert the video
            cmd = [
                "ffmpeg",
                "-i", input_path,
                "-c:v", "libx264",
                "-preset", "fast",
                "-c:a", "aac",
                "-y",  # Overwrite output file if it exists
                output_path
            ]
            
            print(f"Running FFmpeg command: {' '.join(cmd)}")
            subprocess.run(cmd, check=True)
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                print(f"Successfully converted video to {output_path}")
                return output_path
            else:
                print("FFmpeg conversion failed or produced empty file")
                raise Exception("FFmpeg conversion failed")
                
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            print(f"FFmpeg not available or failed: {str(e)}")
            raise
            
    except Exception as e:
        print(f"Error converting video with FFmpeg: {str(e)}")
        
        # Fallback to OpenCV if FFmpeg fails
        try:
            print("Attempting conversion with OpenCV...")
            
            # Open the input video
            input_video = cv2.VideoCapture(input_path)
            if not input_video.isOpened():
                raise ValueError(f"Could not open input video: {input_path}")
            
            # Get video properties
            fps = input_video.get(cv2.CAP_PROP_FPS)
            width = int(input_video.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(input_video.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            if fps <= 0:
                fps = 30  # Default to 30 fps if we can't determine
            
            # Create VideoWriter object
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # MP4 codec
            output_video = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            # Process the video frame by frame
            frame_count = 0
            while True:
                ret, frame = input_video.read()
                if not ret:
                    break
                
                output_video.write(frame)
                frame_count += 1
                
                if frame_count % 100 == 0:
                    print(f"Processed {frame_count} frames")
            
            # Release resources
            input_video.release()
            output_video.release()
            
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                print(f"Successfully converted video with OpenCV to {output_path} ({frame_count} frames)")
                return output_path
            else:
                raise ValueError("OpenCV conversion failed or produced empty file")
                
        except Exception as cv_error:
            print(f"Error converting video with OpenCV: {str(cv_error)}")
            raise Exception(f"Failed to convert video with both FFmpeg and OpenCV: {str(e)} | {str(cv_error)}")
    
    return output_path

if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Volleyball Analysis with Google AI")
    parser.add_argument("--image", help="Path to volleyball image for analysis")
    parser.add_argument("--video", help="Path to volleyball video for analysis")
    parser.add_argument("--type", choices=["technique", "positioning", "tactics"], 
                        default="technique", help="Type of analysis to perform")
    parser.add_argument("--camera", action="store_true", help="Use camera for real-time analysis")
    
    args = parser.parse_args()
    
    if args.image:
        if args.type == "technique":
            result = analyze_technique(args.image)
        elif args.type == "positioning":
            result = analyze_positioning(args.image)
        elif args.type == "tactics":
            result = analyze_tactics(args.image)
        
        print(result)
    
    elif args.video:
        output_file = process_video_frames(args.video, args.type)
        print(f"Analysis saved to {output_file}")
    
    elif args.camera:
        setup_real_time_analysis()
    
    else:
        parser.print_help() 