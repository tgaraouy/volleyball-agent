import cv2
import time
import numpy as np
import threading
import queue
import sys
import os

# Add parent directory to path to import from ai module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai.analysis_tools import create_volleyball_agent

class VolleyballAnalysisPipeline:
    def __init__(self, camera_index=0, analysis_interval=3, video_file=None):
        """
        Initialize the volleyball analysis pipeline.
        
        Args:
            camera_index: Camera device index
            analysis_interval: Seconds between analyses
            video_file: Optional path to video file instead of camera
        """
        if video_file and os.path.exists(video_file):
            self.cap = cv2.VideoCapture(video_file)
        else:
            self.cap = cv2.VideoCapture(camera_index)
            
        self.analysis_interval = analysis_interval
        self.last_analysis_time = 0
        self.latest_analysis = {
            "technique": "No analysis yet", 
            "positioning": "No analysis yet",
            "tactics": "No analysis yet"
        }
        self.agent = create_volleyball_agent()
        self.callback = None
        self.frame_queue = queue.Queue(maxsize=10)
        self.analysis_queue = queue.Queue()
        self.running = False
        
    def set_callback(self, callback):
        """Set a callback function to receive analysis results"""
        self.callback = callback
        
    def encode_frame(self, frame):
        """Convert OpenCV frame to bytes"""
        _, buffer = cv2.imencode('.jpg', frame)
        return buffer.tobytes()
    
    def analyze_frame(self, frame, analysis_type):
        """Analyze a single frame"""
        frame_bytes = self.encode_frame(frame)
        
        try:
            result = self.agent.invoke({
                "input": f"Analyze this volleyball frame for {analysis_type}.",
                "frame_bytes": frame_bytes,
                "analysis_type": analysis_type
            })
            
            analysis_result = result["output"]
            
            # Update latest analysis
            self.latest_analysis[analysis_type] = analysis_result
            
            # Call callback if set
            if self.callback:
                self.callback(analysis_type, analysis_result)
                
            # Add to analysis queue
            self.analysis_queue.put({"type": analysis_type, "result": analysis_result})
            
            return analysis_result
        except Exception as e:
            print(f"Error analyzing frame: {e}")
            return f"Analysis error: {str(e)}"
    
    def get_frames(self):
        """Generator to yield frames from the video source"""
        if not self.cap.isOpened():
            print("Error: Could not open video capture")
            return
            
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                break
                
            # Add overlay of current analysis
            frame_with_overlay = self.add_analysis_overlay(frame.copy())
            
            yield frame_with_overlay
            
            # Add original frame to queue for analysis
            if not self.frame_queue.full():
                self.frame_queue.put(frame)
    
    def add_analysis_overlay(self, frame):
        """Add analysis text overlay to frame"""
        y_pos = 30
        for analysis_type, text in self.latest_analysis.items():
            # Truncate text if too long
            display_text = f"{analysis_type.capitalize()}: {text[:50]}..."
            cv2.putText(frame, display_text, 
                        (10, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            y_pos += 30
            
        return frame
    
    def analysis_worker(self):
        """Worker thread to analyze frames"""
        while self.running:
            try:
                # Get a frame from the queue
                if not self.frame_queue.empty():
                    frame = self.frame_queue.get(timeout=1)
                    
                    # Determine which analysis type to run based on time
                    current_time = time.time()
                    if current_time - self.last_analysis_time >= self.analysis_interval:
                        types = list(self.latest_analysis.keys())
                        analysis_type = types[(int(current_time) // self.analysis_interval) % len(types)]
                        
                        print(f"Analyzing {analysis_type}...")
                        self.analyze_frame(frame, analysis_type)
                        self.last_analysis_time = current_time
                        
                    self.frame_queue.task_done()
                else:
                    # Sleep briefly if queue is empty
                    time.sleep(0.1)
            except queue.Empty:
                # Timeout on queue.get, just continue
                pass
            except Exception as e:
                print(f"Error in analysis worker: {e}")
    
    def start(self):
        """Start the analysis pipeline"""
        self.running = True
        
        # Start analysis worker thread
        self.analysis_thread = threading.Thread(target=self.analysis_worker)
        self.analysis_thread.daemon = True
        self.analysis_thread.start()
        
    def stop(self):
        """Stop the analysis pipeline"""
        self.running = False
        if hasattr(self, 'analysis_thread'):
            self.analysis_thread.join(timeout=1.0)
        self.cap.release()
    
    def process_video_feed(self):
        """Process the video feed in real-time"""
        if not self.cap.isOpened():
            print("Error: Could not open video capture")
            return
        
        self.start()
        
        try:
            while self.running:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                # Display the frame with analysis overlay
                display_frame = self.add_analysis_overlay(frame.copy())
                cv2.imshow('Volleyball Analysis', display_frame)
                
                # Add original frame to queue for analysis
                if not self.frame_queue.full():
                    self.frame_queue.put(frame)
                
                # Exit on 'q' key
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        finally:
            self.stop()
            cv2.destroyAllWindows()

class VolleyballStatTracker:
    def __init__(self):
        self.stats = {
            'team': {
                'attack_attempts': 0,
                'kills': 0,
                'errors': 0,
                'blocks': 0,
                'digs': 0,
                'aces': 0,
            },
            'players': {}
        }
    
    def update_stats(self, event_type, player_id=None):
        """Update statistics based on recognized events"""
        # Update team stats
        if event_type in self.stats['team']:
            self.stats['team'][event_type] += 1
        
        # Update player stats if player_id is provided
        if player_id:
            if player_id not in self.stats['players']:
                self.stats['players'][player_id] = {
                    'attack_attempts': 0,
                    'kills': 0,
                    'errors': 0,
                    'blocks': 0,
                    'digs': 0,
                    'aces': 0,
                }
            
            if event_type in self.stats['players'][player_id]:
                self.stats['players'][player_id][event_type] += 1
    
    def get_team_efficiency(self):
        """Calculate team attack efficiency"""
        attempts = self.stats['team']['attack_attempts']
        if attempts == 0:
            return 0
        
        kills = self.stats['team']['kills']
        errors = self.stats['team']['errors']
        
        return (kills - errors) / attempts
    
    def get_stats_summary(self):
        """Get a summary of current stats"""
        efficiency = self.get_team_efficiency()
        
        return {
            'team_stats': self.stats['team'],
            'efficiency': f"{efficiency:.3f}",
            'player_count': len(self.stats['players']),
            'total_points': self.stats['team']['kills'] + self.stats['team']['aces'] + self.stats['team']['blocks']
        }

# Simple test function
def test_pipeline():
    # Create pipeline with a video file if available, otherwise use camera
    video_file = "test_volleyball.mp4"
    if os.path.exists(video_file):
        pipeline = VolleyballAnalysisPipeline(video_file=video_file)
    else:
        pipeline = VolleyballAnalysisPipeline(camera_index=0)
    
    # Define a callback function
    def analysis_callback(analysis_type, result):
        print(f"\n--- {analysis_type.upper()} ANALYSIS ---")
        print(result)
        print("-" * 50)
    
    # Set the callback
    pipeline.set_callback(analysis_callback)
    
    # Process the video
    pipeline.process_video_feed()

if __name__ == "__main__":
    test_pipeline() 