import sys
import json
import cv2
import mediapipe as mp
import numpy as np

def extract_keypoints(frame_data):
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )

    # Decode frame data
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert BGR to RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame
    results = pose.process(frame_rgb)
    
    if not results.pose_landmarks:
        return None
    
    # Extract keypoints
    keypoints = []
    for landmark in results.pose_landmarks.landmark:
        keypoints.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
    
    return keypoints

def main():
    # Read frame data from stdin
    frame_data = sys.stdin.buffer.read()
    
    # Extract keypoints
    keypoints = extract_keypoints(frame_data)
    
    if keypoints is None:
        print(json.dumps({"error": "No pose detected"}))
        sys.exit(1)
    
    # Output keypoints as JSON
    print(json.dumps(keypoints))

if __name__ == "__main__":
    main() 