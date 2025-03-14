from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
from langchain import tools
from langchain.tools.render import format_tool_to_openai_tool
import cv2
import google.generativeai as genai
import PIL.Image
import io
import numpy as np
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Google AI Gemini Pro Vision
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

genai.configure(api_key=GOOGLE_API_KEY)
vision_model = genai.GenerativeModel('gemini-pro-vision')

# Create a tool for volleyball analysis
@tools.tool
def analyze_volleyball_frame(frame_bytes, analysis_type):
    """
    Analyze a volleyball video frame using Google AI Studio.
    
    Args:
        frame_bytes: Bytes of the image frame
        analysis_type: Type of analysis to perform (technique, positioning, tactics)
        
    Returns:
        Analysis results as text
    """
    # Convert bytes to PIL Image
    image = PIL.Image.open(io.BytesIO(frame_bytes))
    
    # Create appropriate prompt based on analysis type
    prompts = {
        "technique": "Analyze the volleyball techniques being performed in this frame. Identify specific skills like setting, spiking, blocking, or serving. Provide brief feedback on form.",
        "positioning": "Analyze player positioning in this volleyball frame. Identify formation, court coverage, and any positioning issues.",
        "tactics": "Analyze the tactical situation in this volleyball frame. Identify offensive or defensive strategies and suggest adjustments."
    }
    
    prompt = prompts.get(analysis_type, "Analyze this volleyball frame and provide key insights.")
    
    # Generate analysis using Google AI Studio
    response = vision_model.generate_content([prompt, image])
    
    return response.text

# Create a tool for player identification
@tools.tool
def identify_players(frame_bytes, team_roster=None):
    """
    Identify players in a volleyball video frame.
    
    Args:
        frame_bytes: Bytes of the image frame
        team_roster: Optional list of player names and jersey numbers
        
    Returns:
        Dictionary mapping identified jersey numbers to positions on court
    """
    # Convert bytes to PIL Image
    image = PIL.Image.open(io.BytesIO(frame_bytes))
    
    prompt = "Identify volleyball players in this image. For each visible player, note their jersey number and current position on court."
    if team_roster:
        prompt += f" The team roster is: {team_roster}"
    
    # Generate analysis using Google AI Studio
    response = vision_model.generate_content([prompt, image])
    
    # In a real implementation, we would parse the response to extract structured data
    # For now, we'll return the raw text
    return response.text

# Create a tool for event detection
@tools.tool
def detect_volleyball_events(frame_bytes):
    """
    Detect volleyball events in a video frame.
    
    Args:
        frame_bytes: Bytes of the image frame
        
    Returns:
        Detected events (serve, spike, block, dig, etc.)
    """
    # Convert bytes to PIL Image
    image = PIL.Image.open(io.BytesIO(frame_bytes))
    
    prompt = "Analyze this volleyball frame and identify what specific volleyball action is happening (serve, spike, block, dig, set, pass). If multiple actions are visible, identify the main one."
    
    # Generate analysis using Google AI Studio
    response = vision_model.generate_content([prompt, image])
    
    return response.text

# Convert tools to OpenAI format
volleyball_tools = [
    format_tool_to_openai_tool(analyze_volleyball_frame),
    format_tool_to_openai_tool(identify_players),
    format_tool_to_openai_tool(detect_volleyball_events)
]

# Create an agent with the volleyball analysis tools
def create_volleyball_agent():
    agent = create_openai_tools_agent(
        llm=ChatOpenAI(model="gpt-4-turbo", api_key=OPENAI_API_KEY),
        tools=volleyball_tools,
        prompt="""You are a volleyball coach assistant that helps with real-time analysis of volleyball games.
        Use the tools available to analyze video frames and provide valuable insights.
        Keep your answers concise and actionable for coaches."""
    )
    return AgentExecutor(agent=agent, tools=volleyball_tools, verbose=True) 