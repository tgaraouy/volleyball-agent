from flask import Flask, render_template, Response, jsonify, request
import threading
import queue
import sys
import os
import json
import time

# Add parent directory to path to import from video module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from video.pipeline import VolleyballAnalysisPipeline, VolleyballStatTracker

app = Flask(__name__)

# Shared queues for analysis results and frames
analysis_queue = queue.Queue()
stats_tracker = VolleyballStatTracker()

# Global pipeline instance
pipeline = None

def initialize_pipeline(video_source=0):
    """Initialize the volleyball analysis pipeline"""
    global pipeline
    
    # Check if video_source is a file path or camera index
    if isinstance(video_source, str) and os.path.exists(video_source):
        pipeline = VolleyballAnalysisPipeline(video_file=video_source)
    else:
        try:
            camera_index = int(video_source)
            pipeline = VolleyballAnalysisPipeline(camera_index=camera_index)
        except ValueError:
            # Default to camera 0 if conversion fails
            pipeline = VolleyballAnalysisPipeline(camera_index=0)
    
    # Set callback to update analysis queue
    def analysis_callback(analysis_type, result):
        analysis_queue.put({"type": analysis_type, "result": result, "timestamp": time.time()})
        
        # If this is an event detection, update stats
        if analysis_type == "event":
            # Parse the result to extract event type
            # This is a simplified example - in a real app, we would parse the AI response
            if "spike" in result.lower():
                stats_tracker.update_stats("attack_attempts")
                if "successful" in result.lower():
                    stats_tracker.update_stats("kills")
            elif "block" in result.lower():
                stats_tracker.update_stats("blocks")
            elif "dig" in result.lower():
                stats_tracker.update_stats("digs")
            elif "ace" in result.lower() or ("serve" in result.lower() and "point" in result.lower()):
                stats_tracker.update_stats("aces")
    
    pipeline.set_callback(analysis_callback)
    
    # Start the pipeline
    pipeline.start()
    
    return pipeline

# Start the analysis pipeline in a separate thread
def run_analysis_pipeline(video_source=0):
    global pipeline
    pipeline = initialize_pipeline(video_source)
    pipeline.process_video_feed()

# Video streaming route
@app.route('/video_feed')
def video_feed():
    def generate():
        global pipeline
        if pipeline is None:
            pipeline = initialize_pipeline()
            
        for frame in pipeline.get_frames():
            _, jpeg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                  b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
    
    return Response(generate(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

# Analysis results API endpoint
@app.route('/analysis')
def get_analysis():
    results = {}
    
    # Get all available results without blocking
    while not analysis_queue.empty():
        item = analysis_queue.get()
        results[item["type"]] = {
            "result": item["result"],
            "timestamp": item["timestamp"]
        }
    
    return jsonify(results)

# Stats API endpoint
@app.route('/stats')
def get_stats():
    return jsonify(stats_tracker.get_stats_summary())

# Configuration endpoint
@app.route('/config', methods=['POST'])
def update_config():
    config = request.json
    
    # Update video source if provided
    if 'video_source' in config:
        global pipeline
        if pipeline:
            pipeline.stop()
        
        pipeline = initialize_pipeline(config['video_source'])
        
    return jsonify({"status": "success", "message": "Configuration updated"})

# Main page
@app.route('/')
def index():
    return render_template('index.html')

# Create templates directory and index.html
os.makedirs(os.path.join(os.path.dirname(__file__), 'templates'), exist_ok=True)

with open(os.path.join(os.path.dirname(__file__), 'templates', 'index.html'), 'w') as f:
    f.write("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Volleyball Coach</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 20px;
        }
        .analysis-card {
            margin-bottom: 15px;
        }
        .video-container {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 56.25%; /* 16:9 aspect ratio */
            overflow: hidden;
        }
        .video-container img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .stats-container {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="text-center mb-4">Volleyball Coach Assistant</h1>
        
        <div class="row">
            <div class="col-md-8">
                <div class="card mb-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Video Feed</h5>
                        <button class="btn btn-sm btn-primary" id="configBtn">Configure</button>
                    </div>
                    <div class="card-body">
                        <div class="video-container">
                            <img src="/video_feed" alt="Volleyball Video Feed" id="videoFeed">
                        </div>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Team Statistics</h5>
                    </div>
                    <div class="card-body">
                        <div class="stats-container" id="statsContainer">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Attack Efficiency: <span id="efficiency">0.000</span></h6>
                                    <h6>Total Points: <span id="totalPoints">0</span></h6>
                                </div>
                                <div class="col-md-6">
                                    <h6>Players: <span id="playerCount">0</span></h6>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-md-4">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h3 id="kills">0</h3>
                                            <p class="mb-0">Kills</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h3 id="blocks">0</h3>
                                            <p class="mb-0">Blocks</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h3 id="aces">0</h3>
                                            <p class="mb-0">Aces</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Analysis</h5>
                    </div>
                    <div class="card-body">
                        <div id="analysisContainer">
                            <div class="analysis-card" id="techniqueCard">
                                <h6>Technique Analysis</h6>
                                <p id="techniqueAnalysis">No analysis yet</p>
                                <small class="text-muted" id="techniqueTimestamp"></small>
                            </div>
                            <hr>
                            <div class="analysis-card" id="positioningCard">
                                <h6>Positioning Analysis</h6>
                                <p id="positioningAnalysis">No analysis yet</p>
                                <small class="text-muted" id="positioningTimestamp"></small>
                            </div>
                            <hr>
                            <div class="analysis-card" id="tacticsCard">
                                <h6>Tactics Analysis</h6>
                                <p id="tacticsAnalysis">No analysis yet</p>
                                <small class="text-muted" id="tacticsTimestamp"></small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Configuration Modal -->
    <div class="modal fade" id="configModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Configuration</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="videoSource" class="form-label">Video Source</label>
                        <select class="form-select" id="videoSource">
                            <option value="0">Camera 0</option>
                            <option value="1">Camera 1</option>
                            <option value="test_volleyball.mp4">Test Video</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveConfigBtn">Save changes</button>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Function to format timestamp
        function formatTimestamp(timestamp) {
            const date = new Date(timestamp * 1000);
            return date.toLocaleTimeString();
        }
        
        // Function to update analysis
        function updateAnalysis() {
            fetch('/analysis')
                .then(response => response.json())
                .then(data => {
                    for (const type in data) {
                        const element = document.getElementById(`${type}Analysis`);
                        const timestampElement = document.getElementById(`${type}Timestamp`);
                        
                        if (element && data[type]) {
                            element.textContent = data[type].result;
                            if (timestampElement) {
                                timestampElement.textContent = `Updated: ${formatTimestamp(data[type].timestamp)}`;
                            }
                        }
                    }
                })
                .catch(error => console.error('Error fetching analysis:', error));
        }
        
        // Function to update stats
        function updateStats() {
            fetch('/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('efficiency').textContent = data.efficiency;
                    document.getElementById('totalPoints').textContent = data.total_points;
                    document.getElementById('playerCount').textContent = data.player_count;
                    
                    const teamStats = data.team_stats;
                    document.getElementById('kills').textContent = teamStats.kills;
                    document.getElementById('blocks').textContent = teamStats.blocks;
                    document.getElementById('aces').textContent = teamStats.aces;
                })
                .catch(error => console.error('Error fetching stats:', error));
        }
        
        // Update analysis and stats periodically
        setInterval(updateAnalysis, 1000);
        setInterval(updateStats, 1000);
        
        // Configuration modal
        const configModal = new bootstrap.Modal(document.getElementById('configModal'));
        
        document.getElementById('configBtn').addEventListener('click', () => {
            configModal.show();
        });
        
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            const videoSource = document.getElementById('videoSource').value;
            
            fetch('/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    video_source: videoSource
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Configuration updated:', data);
                configModal.hide();
                
                // Reload the video feed
                const videoFeed = document.getElementById('videoFeed');
                videoFeed.src = `/video_feed?t=${new Date().getTime()}`;
            })
            .catch(error => console.error('Error updating configuration:', error));
        });
    </script>
</body>
</html>
    """)

if __name__ == '__main__':
    import cv2
    
    # Start the analysis thread if running directly
    analysis_thread = threading.Thread(target=run_analysis_pipeline)
    analysis_thread.daemon = True
    analysis_thread.start()
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True) 