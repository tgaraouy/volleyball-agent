# Volleyball Agent System with OpenAI Agents SDK

This project integrates the OpenAI Agents SDK with a volleyball technique analysis application to provide advanced coaching and training recommendations.

## Overview

The Volleyball Agent System uses the OpenAI Agents SDK to create specialized agents for different aspects of volleyball coaching:

- **Technique Analysis Agent**: Analyzes volleyball techniques from video frames
- **Training Recommendation Agent**: Creates personalized training programs
- **Real-time Feedback Agent**: Provides immediate, actionable feedback
- **Team Analysis Agent**: Analyzes team performance trends
- **Triage Agent**: Coordinates the other agents

## Installation

1. Install the required Python packages:

```bash
pip install -r requirements.txt
```

2. Set up your environment variables in `.env`:

```
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o
PORT=3000
BASE_URL=http://localhost:3000
```

## Server Setup

The server is built with Flask and provides API endpoints for interacting with the volleyball agent system:

- `/api/volleyball-agent/analyze`: Analyze a volleyball video
- `/api/volleyball-agent/feedback`: Get real-time feedback for a video frame
- `/api/volleyball-agent/training`: Generate a personalized training program
- `/api/volleyball-agent/team-analysis`: Analyze team performance
- `/api/volleyball-agent/collaborative-analysis`: Perform collaborative analysis using multiple agents
- `/api/volleyball-agent/vector-search`: Analyze technique using vector search
- `/api/volleyball-agent/metrics`: Get agent metrics
- `/api/volleyball-agent/batch-process`: Process multiple videos in batch mode

To start the server:

```bash
python server/app.py
```

## Client Integration

The client-side integration is provided through the `VolleyballAgentClient` class, which can be used to interact with the server API:

```javascript
import VolleyballAgentClient from './volleyball_agent_client.js';

// Initialize the client
const client = new VolleyballAgentClient('http://localhost:5000');

// Analyze a video
async function analyzeVideo(videoFile, playerData) {
  const videoData = await client.fileToBase64(videoFile);
  const results = await client.analyzeVideo(videoData, playerData);
  return results;
}

// Get real-time feedback
async function getRealTimeFeedback(videoElement) {
  const frameData = client.captureVideoFrame(videoElement);
  const currentTime = videoElement.currentTime;
  const feedback = await client.getRealTimeFeedback(frameData, currentTime);
  return feedback;
}
```

## Agent System Architecture

The Volleyball Agent System is built around the following components:

1. **Base Classifier**: A TensorFlow model that classifies volleyball techniques from video frames
2. **Agent Tools**: Tools for accessing the volleyball database, searching the web, and controlling the UI
3. **Specialized Agents**: Agents for different aspects of volleyball coaching
4. **Trace Monitoring**: Monitoring and debugging of agent decisions

## Advanced Features

### Collaborative Analysis

The system can perform collaborative analysis using multiple agents:

```python
results = agent_system.collaborative_analysis(features_dict, player_id)
```

### Vector Search

The system can use vector search to find similar techniques in the database:

```python
results = agent_system.analyze_with_vector_search(features_dict, player_id)
```

### Agent Metrics

The system can provide metrics about agent usage and performance:

```python
metrics = agent_system.get_agent_metrics()
```

### Batch Processing

The system can process multiple videos in batch mode:

```python
results = agent_system.batch_process_videos(video_paths, player_ids)
```

## Development

### Adding New Agents

To add a new agent to the system:

1. Create a new method in the `VolleyballAgentSystem` class to create the agent:

```python
def _create_new_agent(self):
    return Agent(
        name="new_agent_name",
        instructions="""Detailed instructions for the agent...""",
        tools=[self.file_search_tool, self.web_search_tool]
    )
```

2. Initialize the agent in the `__init__` method:

```python
self.new_agent = self._create_new_agent()
```

3. Create methods to use the agent:

```python
def use_new_agent(self, input_data):
    message = f"Process this data: {input_data}"
    response = self.new_agent.run(message)
    return response
```

### Adding New API Endpoints

To add a new API endpoint:

1. Add a new route in `server/app.py`:

```python
@app.route('/api/volleyball-agent/new-endpoint', methods=['POST'])
def new_endpoint():
    # Implementation
    pass
```

2. Add the endpoint to the client:

```javascript
this.endpoints.newEndpoint = '/api/volleyball-agent/new-endpoint';

async newEndpointMethod(data) {
  return this._request(this.endpoints.newEndpoint, 'POST', data);
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OpenAI for the Agents SDK
- TensorFlow for the machine learning framework
- Flask for the web server framework 