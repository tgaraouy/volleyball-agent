// src/concepts/ParentEngagementConcept.js
const { validateId, validateDate, sanitizeData } = require('../utils/security');

class ParentEngagementConcept {
  constructor(databaseService, communicationService) {
    this.db = databaseService;
    this.comm = communicationService;
  }

  async initializeFundraisingCampaign(campaignData) {
    // Validate input
    if (!campaignData || !campaignData.name || !campaignData.goalAmount) {
      throw new Error('Campaign requires a name and goal amount');
    }
    
    if (isNaN(campaignData.goalAmount) || campaignData.goalAmount <= 0) {
      throw new Error('Goal amount must be a positive number');
    }
    
    // Convert dates if they're not already Date objects
    const startDate = campaignData.startDate instanceof Date ? 
      campaignData.startDate : new Date(campaignData.startDate);
    const endDate = campaignData.endDate instanceof Date ? 
      campaignData.endDate : new Date(campaignData.endDate);
    
    validateDate(startDate, 'Start date');
    validateDate(endDate, 'End date');
    
    if (startDate >= endDate) {
      throw new Error('End date must be after start date');
    }
    
    if (campaignData.coordinatorId) {
      validateId(campaignData.coordinatorId, 'Coordinator ID');
    }
    
    try {
      // Create campaign record with data sanitization
      const campaign = {
        name: campaignData.name,
        description: campaignData.description,
        goal_amount: campaignData.goalAmount,
        current_amount: 0,
        start_date: startDate,
        end_date: endDate,
        status: 'planning',
        coordinator_id: campaignData.coordinatorId
      };
      
      // Save to database
      const savedCampaign = await this.db.createFundraisingCampaign(campaign);
      
      // Notify parent committee members securely
      await this.notifyFundraisingCommittee(savedCampaign);
      
      return savedCampaign;
    } catch (error) {
      console.error('Error initializing fundraising campaign:', error);
      throw new Error('Failed to initialize fundraising campaign');
    }
  }

  async notifyFundraisingCommittee(campaign) {
    // Implementation for notifying committee members
    // This will be implemented when the notification system is ready
  }
}

module.exports = ParentEngagementConcept;