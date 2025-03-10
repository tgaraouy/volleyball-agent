// src/concepts/PlayerDevelopmentConcept.js
const { sanitizeData, validateId } = require('../utils/security');

class PlayerDevelopmentConcept {
  constructor(databaseService) {
    this.db = databaseService;
  }

  async getPlayerMetrics(playerId) {
    // Validate input
    validateId(playerId, 'Player ID');
    
    return await this.db.getPlayerMetrics(playerId);
  }

  async recordMetric(playerId, metricId, value, recordedBy) {
    // Validate all inputs
    validateId(playerId, 'Player ID');
    validateId(metricId, 'Metric ID');
    
    if (isNaN(value) || typeof value !== 'number') {
      throw new Error('Metric value must be a valid number');
    }
    
    if (recordedBy) {
      validateId(recordedBy, 'Recorder ID');
    }
    
    const metric = {
      playerId,
      metricId,
      value,
      recordedAt: new Date(),
      recordedBy
    };
    
    // Store the metric
    await this.db.savePlayerMetric(metric);
    
    // Securely check if this change is significant
    const isSignificant = await this.checkForSignificantChange(playerId, metricId, value);
    
    if (isSignificant) {
      // Get metric name for the notification
      const metricDefinition = await this.db.getMetricDefinition(metricId);
      
      return { 
        isSignificant: true, 
        metric: {
          ...metric,
          metricName: metricDefinition ? metricDefinition.name : 'Unknown metric'
        } 
      };
    }
    
    return { isSignificant: false, metric };
  }

  async checkForSignificantChange(playerId, metricId, currentValue) {
    try {
      // Get historical values for this metric
      const history = await this.db.getMetricHistory(playerId, metricId);
      
      if (history.length === 0) return false;
      
      // Get previous record
      const previousRecord = history[0];
      
      // Calculate percentage change - protect against division by zero
      if (previousRecord.value === 0) return false;
      
      const percentChange = ((currentValue - previousRecord.value) / Math.abs(previousRecord.value)) * 100;
      
      // Consider significant if change is more than 10%
      return Math.abs(percentChange) >= 10;
    } catch (error) {
      console.error('Error checking for significant change:', error);
      return false; // Fail securely - don't indicate significance if there's an error
    }
  }

  async generateDevelopmentPlan(playerId) {
    // Validate input
    validateId(playerId, 'Player ID');
    
    try {
      // Get player data
      const player = await this.db.getPlayer(playerId);
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Get current metrics
      const currentMetrics = await this.getPlayerMetrics(playerId);
      
      // Get metric definitions to understand targets
      const metricDefinitions = await this.db.getMetricDefinitions();
      
      // Identify areas needing improvement
      const improvementAreas = this.identifyImprovementAreas(
        player, 
        currentMetrics, 
        metricDefinitions
      );
      
      // Get suitable drills for these areas
      const drills = await this.db.getDrillsForAreas(
        improvementAreas.map(area => area.metricId)
      );
      
      // Prioritize drills based on improvement needs
      const recommendedDrills = this.prioritizeDrills(drills, improvementAreas);
      
      // Create development timeline
      const timeline = this.createDevelopmentTimeline(
        improvementAreas,
        player.grade
      );
      
      // Create the plan - sanitize all data before storing
      const plan = sanitizeData({
        playerId: player.id,
        improvementAreas,
        recommendedDrills,
        timeline,
        createdAt: new Date(),
        status: 'active'
      });
      
      // Save to database
      await this.db.saveDevelopmentPlan(plan);
      
      return plan;
    } catch (error) {
      console.error('Error generating development plan:', error);
      throw new Error('Failed to generate development plan');
    }
  }

  // Additional methods as in our previous implementation, with added security...
}

module.exports = PlayerDevelopmentConcept;