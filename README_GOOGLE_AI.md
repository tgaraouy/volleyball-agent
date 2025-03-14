# Volleyball Analysis with Google AI Studio

This project integrates Google AI Studio's Gemini Pro Vision model with a volleyball analysis application to provide advanced coaching and training recommendations.

## Overview

The Volleyball AI system uses Google's Gemini Pro Vision model to analyze volleyball techniques, positioning, and tactics from images and videos. The system provides:

- **Technique Analysis**: Detailed feedback on volleyball techniques with form assessment and improvement tips
- **Positioning Analysis**: Evaluation of court positioning, formation, and coverage
- **Tactical Analysis**: Insights on offensive and defensive strategies and potential adjustments

## Installation

1. Install the required Python packages:

```bash
pip install -r requirements.txt
```

2. Set up your environment variables in `.env`:

```
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

You can obtain a Google AI API key from the [Google AI Studio](https://ai.google.dev/) website.

## Server Setup

The server is built with Flask and provides API endpoints for interacting with the Google AI-powered volleyball analysis system:

- `/api/volleyball/analyze-image`: Analyze a volleyball image
- `/api/volleyball/analyze-video`: Analyze a volleyball video
- `/api/volleyball/analyze-frame`: Analyze a single video frame

To start the server:

```bash
python server/app.py
```

## Client Integration

The client-side integration is provided through the `VolleyballAIClient` class, which can be used to interact with the server API:

```javascript
import VolleyballAIClient from './volleyball_ai_client.js';

// Initialize the client
const client = new VolleyballAIClient('http://localhost:5000');

// Analyze an image
async function analyzeImage(imageFile) {
  const imageData = await client.fileToBase64(imageFile);
  const results = await client.analyzeImage(imageData, 'technique');
  return results;
}

// Analyze a video
async function analyzeVideo(videoFile) {
  const videoData = await client.fileToBase64(videoFile);
  const results = await client.analyzeVideo(videoData, 'technique', 2);
  return results;
}

// Set up real-time analysis
function setupRealTimeAnalysis(videoElement, resultElement) {
  const controller = client.setupRealTimeAnalysis(
    videoElement,
    resultElement,
    'technique',
    5000 // 5 seconds interval
  );
  
  return controller; // { start, stop, isRunning }
}
```

## Demo Application

A demo application is provided to showcase the capabilities of the system:

1. Open `volleyball_ai_demo.html` in your browser
2. Upload an image or video for analysis
3. Select the type of analysis (technique, positioning, or tactics)
4. Click the "Analyze" button to see the results

## Google AI Integration

The system uses Google's Gemini Pro Vision model to analyze volleyball images and videos. The integration is implemented in `google_ai_integration.py` and provides the following functions:

- `analyze_technique(image_path)`: Analyze volleyball technique in an image
- `analyze_positioning(image_path)`: Analyze volleyball court positioning in an image
- `analyze_tactics(image_path)`: Provide tactical analysis of a volleyball scenario
- `process_video_frames(video_path, analysis_type, interval_seconds)`: Process video frames at regular intervals and analyze them
- `setup_real_time_analysis(camera_index)`: Set up real-time analysis from a camera feed

## Advanced Features

### Video Frame Analysis

The system can analyze individual frames from a video at specified intervals:

```python
output_file = process_video_frames(
    video_path='match.mp4',
    analysis_type='technique',
    interval_seconds=2
)
```

### Real-time Analysis

The system can provide real-time analysis of a video stream:

```javascript
const controller = client.setupRealTimeAnalysis(
  videoElement,
  resultElement,
  'technique',
  5000 // 5 seconds interval
);

// Start analysis
controller.start();

// Stop analysis
controller.stop();
```

## Development

### Adding New Analysis Types

To add a new analysis type:

1. Create a new analysis function in `google_ai_integration.py`:

```python
def analyze_new_type(image_path):
    prompt = """
    Your custom prompt for the new analysis type.
    """
    return safe_analyze_image(image_path, prompt)
```

2. Update the server endpoints in `server/app.py` to support the new analysis type
3. Update the client to include the new analysis type

### Customizing Prompts

You can customize the prompts used for analysis by modifying the prompt strings in `google_ai_integration.py`. The prompts are designed to elicit specific types of analysis from the Gemini Pro Vision model.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Google for the Gemini Pro Vision model
- OpenCV for image and video processing
- Flask for the web server framework 