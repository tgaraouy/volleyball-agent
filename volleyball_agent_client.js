/**
 * Volleyball Agent Client
 * 
 * This module provides client-side integration with the volleyball agent system.
 * It includes functions for analyzing videos, getting real-time feedback,
 * generating training programs, and more.
 */

class VolleyballAgentClient {
  /**
   * Initialize the volleyball agent client
   * 
   * @param {string} baseUrl - The base URL of the API (default: http://localhost:5000)
   */
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.endpoints = {
      analyze: '/api/volleyball-agent/analyze',
      feedback: '/api/volleyball-agent/feedback',
      training: '/api/volleyball-agent/training',
      teamAnalysis: '/api/volleyball-agent/team-analysis',
      collaborativeAnalysis: '/api/volleyball-agent/collaborative-analysis',
      vectorSearch: '/api/volleyball-agent/vector-search',
      metrics: '/api/volleyball-agent/metrics',
      batchProcess: '/api/volleyball-agent/batch-process'
    };
  }

  /**
   * Make an API request
   * 
   * @param {string} endpoint - The API endpoint
   * @param {string} method - The HTTP method (GET, POST, etc.)
   * @param {object} data - The request data (for POST requests)
   * @returns {Promise} - The API response
   */
  async _request(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Analyze a volleyball video
   * 
   * @param {string} videoData - Base64 encoded video data
   * @param {object} playerData - Player information
   * @returns {Promise} - Analysis results
   */
  async analyzeVideo(videoData, playerData = {}) {
    return this._request(this.endpoints.analyze, 'POST', {
      video_data: videoData,
      player_data: playerData
    });
  }

  /**
   * Get real-time feedback for a video frame
   * 
   * @param {string} frameData - Base64 encoded image data
   * @param {number} currentTime - Current time in the video
   * @returns {Promise} - Feedback results
   */
  async getRealTimeFeedback(frameData, currentTime = 0) {
    return this._request(this.endpoints.feedback, 'POST', {
      frame_data: frameData,
      current_time: currentTime
    });
  }

  /**
   * Generate a training program
   * 
   * @param {string} playerId - Player ID
   * @param {string} techniqueFocus - Technique to focus on
   * @returns {Promise} - Training program
   */
  async generateTrainingProgram(playerId, techniqueFocus = null) {
    return this._request(this.endpoints.training, 'POST', {
      player_id: playerId,
      technique_focus: techniqueFocus
    });
  }

  /**
   * Analyze team performance
   * 
   * @param {string} teamId - Team ID
   * @param {object} gameData - Game data
   * @returns {Promise} - Team analysis
   */
  async analyzeTeamPerformance(teamId, gameData = null) {
    return this._request(this.endpoints.teamAnalysis, 'POST', {
      team_id: teamId,
      game_data: gameData
    });
  }

  /**
   * Perform collaborative analysis using multiple agents
   * 
   * @param {string} frameData - Base64 encoded image data
   * @param {string} playerId - Player ID
   * @returns {Promise} - Collaborative analysis results
   */
  async performCollaborativeAnalysis(frameData, playerId = null) {
    return this._request(this.endpoints.collaborativeAnalysis, 'POST', {
      frame_data: frameData,
      player_id: playerId
    });
  }

  /**
   * Analyze technique using vector search
   * 
   * @param {string} frameData - Base64 encoded image data
   * @param {string} playerId - Player ID
   * @returns {Promise} - Vector search results
   */
  async analyzeWithVectorSearch(frameData, playerId = null) {
    return this._request(this.endpoints.vectorSearch, 'POST', {
      frame_data: frameData,
      player_id: playerId
    });
  }

  /**
   * Get agent metrics
   * 
   * @returns {Promise} - Agent metrics
   */
  async getAgentMetrics() {
    return this._request(this.endpoints.metrics, 'GET');
  }

  /**
   * Process multiple videos in batch mode
   * 
   * @param {Array<string>} videoPaths - Paths to videos
   * @param {Array<string>} playerIds - Player IDs
   * @returns {Promise} - Batch processing results
   */
  async batchProcessVideos(videoPaths, playerIds = null) {
    return this._request(this.endpoints.batchProcess, 'POST', {
      video_paths: videoPaths,
      player_ids: playerIds
    });
  }

  /**
   * Convert a file to base64
   * 
   * @param {File} file - The file to convert
   * @returns {Promise<string>} - Base64 encoded file data
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Capture a video frame and convert to base64
   * 
   * @param {HTMLVideoElement} videoElement - The video element
   * @returns {string} - Base64 encoded frame data
   */
  captureVideoFrame(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg');
  }
}

// Export the client for use in other modules
export default VolleyballAgentClient; 