# volleyball_agents.py
import os
import json
import numpy as np
import cv2
from pathlib import Path
import datetime
from openai import OpenAI
from .google_ai_integration import analyze_technique, analyze_positioning, analyze_tactics
from .volleyball_inference import VolleyballTechniqueClassifier

try:
    import tensorflow as tf
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False

class VolleyballAgentSystem:
    """
    A comprehensive volleyball coaching system using OpenAI's API.
    This system integrates with the existing VolleyballTechniqueClassifier
    and provides enhanced analysis, feedback, and training recommendations.
    """
    
    def __init__(self, model_path=None, labels_path=None, api_key=None):
        """
        Initialize the volleyball agent system.
        
        Args:
            model_path: Path to the saved TensorFlow model
            labels_path: Path to the JSON file containing technique labels
            api_key: OpenAI API key (if not provided, will look for OPENAI_API_KEY env var)
        """
        # Set up OpenAI client
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        
        # Initialize the base classifier if TensorFlow is available
        if TENSORFLOW_AVAILABLE and model_path and labels_path:
            try:
                self.classifier = VolleyballTechniqueClassifier(model_path, labels_path)
                print("Volleyball Technique Classifier initialized successfully")
            except Exception as e:
                print(f"Error initializing classifier: {e}")
                self.classifier = None
        else:
            self.classifier = None
            if not TENSORFLOW_AVAILABLE:
                print("TensorFlow not available. Running without local model.")
        
        print("Volleyball Agent System initialized successfully")
    
    def analyze_player_video(self, video_path, player_data=None):
        """
        Analyze a volleyball player's video.
        
        Args:
            video_path: Path to the video file
            player_data: Dictionary containing player information
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Extract frames from video
            frames = self.extract_frames(video_path)
            
            # Analyze technique in each frame
            technique_results = []
            for frame in frames:
                result = analyze_technique(frame)
                technique_results.append(result)
            
            # Analyze player positioning
            positioning_results = analyze_positioning(frames)
            
            # Analyze team tactics if available
            tactics_results = analyze_tactics(frames)
            
            # Combine results
            analysis = {
                "technique": technique_results,
                "positioning": positioning_results,
                "tactics": tactics_results,
                "player_data": player_data
            }
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing video: {e}")
            return {"error": str(e)}
    
    def get_real_time_feedback(self, frame_path, current_time=0):
        """
        Get real-time feedback for a single video frame.
        
        Args:
            frame_path: Path to the frame image file
            current_time: Current time in the video (seconds)
            
        Returns:
            Dictionary containing feedback
        """
        try:
            # Load and analyze the frame
            frame = cv2.imread(frame_path)
            if frame is None:
                return {"error": "Could not load frame"}
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Analyze technique
            technique = analyze_technique(frame_rgb)
            
            # Analyze positioning
            positioning = analyze_positioning([frame_rgb])
            
            # Combine feedback
            feedback = {
                "timestamp": current_time,
                "technique": technique,
                "positioning": positioning[0] if positioning else None
            }
            
            return feedback
            
        except Exception as e:
            print(f"Error getting feedback: {e}")
            return {"error": str(e)}
    
    def extract_frames(self, video_path, sample_rate=15):
        """
        Extract frames from a video file.
        
        Args:
            video_path: Path to the video file
            sample_rate: Extract every Nth frame
            
        Returns:
            List of extracted frames as numpy arrays
        """
        if not Path(video_path).exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video {video_path}")
        
        frames = []
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % sample_rate == 0:
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)
            
            frame_count += 1
        
        cap.release()
        return frames

class PlayerAgent:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
    
    def analyze_performance(self, video_frames):
        """
        Analyze a player's performance in video frames.
        
        Args:
            video_frames: List of video frames as numpy arrays
            
        Returns:
            Dictionary containing performance analysis
        """
        try:
            # Analyze technique
            technique_results = []
            for frame in video_frames:
                result = analyze_technique(frame)
                technique_results.append(result)
            
            # Analyze positioning
            positioning_results = analyze_positioning(video_frames)
            
            return {
                "technique": technique_results,
                "positioning": positioning_results
            }
        except Exception as e:
            print(f"Error analyzing performance: {e}")
            return {"error": str(e)}

class CoachAgent:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
    
    def provide_feedback(self, analysis_results):
        """
        Provide coaching feedback based on analysis results.
        
        Args:
            analysis_results: Dictionary containing analysis results
            
        Returns:
            Dictionary containing feedback and recommendations
        """
        try:
            # TODO: Implement coaching feedback using OpenAI
            return {
                "feedback": "Feedback not implemented yet",
                "recommendations": []
            }
        except Exception as e:
            print(f"Error providing feedback: {e}")
            return {"error": str(e)}

class TeamAnalysisAgent:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
    
    def analyze_team_performance(self, video_frames):
        """
        Analyze team performance in video frames.
        
        Args:
            video_frames: List of video frames as numpy arrays
            
        Returns:
            Dictionary containing team analysis
        """
        try:
            # Analyze team tactics
            tactics_results = analyze_tactics(video_frames)
            
            return {
                "tactics": tactics_results,
                "team_coordination": "Not implemented yet",
                "areas_for_improvement": []
            }
        except Exception as e:
            print(f"Error analyzing team performance: {e}")
            return {"error": str(e)}

# Example usage
if __name__ == "__main__":
    # Test the agents with a sample video
    try:
        results = process_video_for_analysis(
            video_path="videos/player_spike.mp4",
            player_id="player123"
        )
        
        print("Analysis Results:")
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(f"Error in example usage: {e}") 