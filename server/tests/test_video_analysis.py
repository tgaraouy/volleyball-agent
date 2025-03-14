import requests
import sys
import os
import json

def analyze_video(video_path, analysis_type="technique", interval_seconds=2.0, max_frames=5):
    """
    Send a video file to the volleyball analysis API for processing.
    
    Args:
        video_path: Path to the video file
        analysis_type: Type of analysis (technique, positioning, tactics)
        interval_seconds: Interval between frames in seconds
        max_frames: Maximum number of frames to analyze
        
    Returns:
        API response as JSON
    """
    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        return None
    
    url = "http://localhost:3000/api/volleyball/analyze-video"
    
    # Prepare the form data
    files = {
        'video': (os.path.basename(video_path), open(video_path, 'rb'), 'video/mp4')
    }
    
    data = {
        'analysis_type': analysis_type,
        'interval_seconds': str(interval_seconds),
        'max_frames': str(max_frames)
    }
    
    print(f"Sending request to {url}")
    print(f"Video: {video_path}")
    print(f"Analysis type: {analysis_type}")
    print(f"Interval: {interval_seconds} seconds")
    print(f"Max frames: {max_frames}")
    
    try:
        # Send the request
        response = requests.post(url, files=files, data=data)
        
        # Check if the request was successful
        if response.status_code == 200:
            result = response.json()
            
            # Print the results
            print("\nAnalysis Results:")
            print(f"Video: {result.get('video')}")
            print(f"Analysis Type: {result.get('analysis_type')}")
            
            # Print each frame analysis
            for i, frame_result in enumerate(result.get('results', [])):
                print(f"\n--- Frame {i+1} ---")
                print(f"Timestamp: {frame_result.get('timestamp')}")
                
                if 'error' in frame_result:
                    print(f"Error: {frame_result.get('error')}")
                else:
                    print(f"Analysis: {frame_result.get('analysis')}")
            
            return result
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return None
    
    except Exception as e:
        print(f"Error sending request: {str(e)}")
        return None
    finally:
        # Close the file
        files['video'][1].close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_video_analysis.py <video_path> [analysis_type] [interval_seconds] [max_frames]")
        sys.exit(1)
    
    video_path = sys.argv[1]
    analysis_type = sys.argv[2] if len(sys.argv) > 2 else "technique"
    interval_seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    max_frames = int(sys.argv[4]) if len(sys.argv) > 4 else 5
    
    result = analyze_video(video_path, analysis_type, interval_seconds, max_frames)
    
    # Save the result to a JSON file
    if result:
        output_file = f"{os.path.splitext(os.path.basename(video_path))[0]}_analysis.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\nResults saved to {output_file}") 