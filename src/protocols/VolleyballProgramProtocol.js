// src/protocols/VolleyballProgramProtocol.js
const security = require('../utils/security');
const { ProgramStateModel } = require('../models');

class VolleyballProgramProtocol {
  constructor(
    databaseService, 
    communicationService,
    playerDevelopment,
    programScheduling,
    parentEngagement,
    aiService
  ) {
    this.db = databaseService;
    this.comm = communicationService;
    
    // Concepts
    this.playerDevelopment = playerDevelopment;
    this.programScheduling = programScheduling;
    this.parentEngagement = parentEngagement;
    this.ai = aiService;
    this.programState = null;
    
    // Initialize program state
    this.initializeProgramState();
  }

  async initializeProgramState() {
    try {
      // Try to get existing program state
      const state = await this.db.getProgramState();
      
      // Create ProgramStateModel instance with the retrieved state
      this.programState = new ProgramStateModel({
        currentSeasonYear: state?.currentSeasonYear || new Date().getFullYear(),
        currentPhase: state?.currentPhase || 'off_season',
        nextImportantDate: state?.nextImportantDate,
        nextImportantEvent: state?.nextImportantEvent
      });
      
      // Update phase based on current date if no state exists
      if (!state) {
        this.updatePhaseBasedOnDate();
        await this.db.saveProgramState(this.programState);
      }
    } catch (error) {
      console.error('Error initializing program state:', error);
      // Create new program state if none exists
      this.programState = new ProgramStateModel({
        currentSeasonYear: new Date().getFullYear(),
        currentPhase: 'off_season',
        nextImportantDate: null,
        nextImportantEvent: null
      });
      this.updatePhaseBasedOnDate();
      await this.db.saveProgramState(this.programState);
    }
  }

  updatePhaseBasedOnDate() {
    const now = new Date();
    const month = now.getMonth(); // 0-11

    // Phase determination based on month using correct phase values from schema
    if (month >= 7 && month <= 9) { // August to October
      this.programState.currentPhase = 'competition';
    } else if (month === 10) { // November
      this.programState.currentPhase = 'post_season';
    } else if (month >= 5 && month <= 6) { // June and July
      this.programState.currentPhase = 'pre_season';
    } else { // December to May
      this.programState.currentPhase = 'off_season';
    }
  }

  /**
   * Initialize the program for a new season with security validation
   */
  async initializeSeason(year) {
    // Validate year
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year provided');
    }
    
    try {
      // Update program state
      this.programState.currentSeasonYear = year;
      this.updatePhaseBasedOnDate();
      await this.db.saveProgramState(this.programState);
      
      // Schedule pre-season events
      const preSeasonEvents = await this.programScheduling.schedulePreSeason(year);
      
      // Set next important event
      if (preSeasonEvents.length > 0) {
        this.programState.nextImportantDate = preSeasonEvents[0].startTime;
        this.programState.nextImportantEvent = preSeasonEvents[0].title;
        await this.db.saveProgramState(this.programState);
      }
      
      return {
        programState: security.sanitizeData(this.programState),
        preSeasonEvents: security.sanitizeData(preSeasonEvents)
      };
    } catch (error) {
      console.error('Error initializing season:', error);
      throw new Error('Failed to initialize season: ' + error.message);
    }
  }

  async generateDevelopmentPlan(playerId) {
    if (!this.ai) {
      throw new Error('AI service is not available. Please configure OpenAI API key.');
    }
    
    // Get player data
    const player = await this.db.getPlayer(playerId);
    
    // Get metrics
    const metrics = await this.playerDevelopment.getPlayerMetrics(playerId);
    
    // Use the AI to generate an optimized development plan
    const aiPlan = await this.ai.generateDevelopmentPlan(player, metrics);
    
    // Combine AI recommendations with standard development plan
    const enhancedPlan = await this.playerDevelopment.generateDevelopmentPlanWithAI(
      playerId, 
      aiPlan
    );
    
    return enhancedPlan;
  }

  async optimizeSchedule(events, constraints) {
    if (!this.ai) {
      throw new Error('AI service is not available. Please configure OpenAI API key.');
    }
    
    // Use AI to optimize the schedule
    const optimizedSchedule = await this.ai.optimizeSchedule(events, constraints);
    
    // Apply the optimized schedule
    for (const event of optimizedSchedule.events) {
      await this.programScheduling.updateEvent(event.id, event);
    }
    
    return optimizedSchedule;
  }

  async getFundraisingRecommendations(campaignId) {
    if (!this.ai) {
      throw new Error('AI service is not available. Please configure OpenAI API key.');
    }
    
    // Get campaign data
    const campaign = await this.db.getFundraisingCampaign(campaignId);
    
    // Get historical fundraising data
    const history = await this.db.getFundraisingHistory();
    
    // Get AI recommendations
    const recommendations = await this.ai.recommendFundraisingStrategy(
      campaign,
      history
    );
    
    return recommendations;
  }

  // Implement other methods with similar security...
}

module.exports = VolleyballProgramProtocol;