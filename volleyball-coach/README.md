# Real-Time Volleyball Coaching System

A comprehensive real-time volleyball coaching and feedback system using Open Agent SDK and Google AI Studio. This system provides immediate insights during games or practice sessions.

## Architecture Overview

The system consists of three main components:

1. **Video Capture & Processing**: Uses Open Agent SDK to handle real-time video feeds
2. **Analysis Engine**: Leverages Google AI Studio for volleyball technique and tactics analysis
3. **Feedback Delivery**: Creates communication channels for immediate insights to coaches and players

## Features

- Real-time video analysis of volleyball techniques, positioning, and tactics
- Player identification and tracking
- Event detection (serves, spikes, blocks, digs, etc.)
- Statistical tracking for team and individual performance
- Web interface for coaches
- Mobile app for players

## Prerequisites

- Python 3.9+
- OpenCV
- LangChain
- Google AI Studio API key
- OpenAI API key
- Flutter SDK (for mobile app)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/tgaraouy/volleyball-agent.git
cd volleyball-agent/volleyball-coach
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
GOOGLE_API_KEY=your_google_ai_studio_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. For the mobile app, install Flutter dependencies:
```bash
cd src/mobile
flutter pub get
```

## Usage

### Running the Web Interface

1. Start the web server:
```bash
cd src/web
python app.py
```

2. Open a web browser and navigate to `http://localhost:5000`

### Running the Mobile App

1. Start the Flutter development server:
```bash
cd src/mobile
flutter run
```

## System Components

### AI Analysis Tools

The system uses a combination of Google AI Studio's vision capabilities and OpenAI's language models to analyze volleyball gameplay:

- `analyze_volleyball_frame`: Analyzes techniques, positioning, or tactics in a video frame
- `identify_players`: Identifies players and their positions on the court
- `detect_volleyball_events`: Detects specific volleyball events (serves, spikes, blocks, etc.)

### Video Processing Pipeline

The video processing pipeline handles:

- Real-time video capture from cameras or video files
- Frame extraction and analysis
- Overlay of analysis results on video feed
- Statistical tracking of volleyball events

### Web Interface

The web interface provides:

- Live video feed with analysis overlay
- Real-time analysis results for techniques, positioning, and tactics
- Team statistics dashboard
- Configuration options for video sources

### Mobile App

The mobile app allows players to:

- View the live video feed
- See personalized analysis and feedback
- Track their performance statistics
- Receive coaching recommendations

## Customization

- Modify the prompts in `analysis_tools.py` to customize the analysis
- Adjust the analysis interval in `pipeline.py` to balance performance and accuracy
- Customize the web interface in `app.py` to add additional features
- Extend the mobile app in `main.dart` to include player-specific features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google AI Studio for providing the vision analysis capabilities
- OpenAI for the language model integration
- The volleyball community for feedback and testing 