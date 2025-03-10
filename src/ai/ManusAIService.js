const { OpenAI } = require('openai');

class ManusAIService {
  constructor(config = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured in environment variables');
    }

    console.log('Initializing OpenAI with API key length:', apiKey.length);
    
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    this.model = config.model || 'gpt-4';
    this.systemInstructions = config.systemInstructions || this.getDefaultInstructions();
  }
  
  getDefaultInstructions() {
    return `
    You are Manus AI, an intelligent assistant for a volleyball program.
    Your responsibilities include:
    1. Analyzing player metrics to generate personalized development plans
    2. Optimizing practice and game schedules
    3. Recommending fundraising strategies
    4. Providing communication suggestions for coaches and parents
    
    Base your decisions on volleyball best practices, developmental psychology, 
    and effective sports program management principles.
    `;
  }
  
  async analyze(task, data) {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemInstructions },
          { role: 'user', content: JSON.stringify({ task, data }) }
        ],
        response_format: { type: 'json_object' }
      });
      
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Manus AI analysis failed:', error);
      throw new Error('Failed to analyze with Manus AI');
    }
  }
  
  async generateDevelopmentPlan(playerData, metrics) {
    return await this.analyze('generate_development_plan', { player: playerData, metrics });
  }
  
  async optimizeSchedule(events, constraints) {
    return await this.analyze('optimize_schedule', { events, constraints });
  }
  
  async recommendFundraisingStrategy(campaignData, historicalData) {
    return await this.analyze('recommend_fundraising', { campaign: campaignData, history: historicalData });
  }
  
  async generateCommunicationContent(purpose, audience, context) {
    return await this.analyze('generate_communication', { purpose, audience, context });
  }
}

module.exports = ManusAIService; 