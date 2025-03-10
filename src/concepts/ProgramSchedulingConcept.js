// src/concepts/ProgramSchedulingConcept.js
const { validateDate, sanitizeData } = require('../utils/security');

class ProgramSchedulingConcept {
  constructor(databaseService) {
    this.db = databaseService;
  }

  async schedulePreSeason(year) {
    // Validate year
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Invalid year provided');
    }
    
    try {
      const events = [];
      const startDate = new Date(year, 7, 24); // August 24th of the given year
      
      // Schedule tryouts for both middle and high school
      events.push({
        title: 'Middle School Team Selection Practice',
        type: 'practice',
        start_time: new Date(startDate.getTime()),
        end_time: new Date(startDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        location: 'Main Gym',
        description: 'Initial tryouts for all middle school players',
        notes: 'This is a special practice session for team selection. All middle school students interested in joining the volleyball program must attend.',
        status: 'scheduled'
      });

      // Add high school tryouts the next day
      const highSchoolDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Next day
      events.push({
        title: 'High School Team Selection Practice',
        type: 'practice',
        start_time: new Date(highSchoolDate.getTime()),
        end_time: new Date(highSchoolDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        location: 'Main Gym',
        description: 'Initial tryouts for all high school players',
        notes: 'This is a special practice session for team selection. All high school students interested in joining the volleyball program must attend.',
        status: 'scheduled'
      });
      
      // Save all events to database
      const savedEvents = [];
      for (const event of events) {
        const savedEvent = await this.db.createEvent(event);
        savedEvents.push(savedEvent);
      }
      
      return savedEvents;
    } catch (error) {
      console.error('Error scheduling pre-season:', error);
      throw new Error('Failed to schedule pre-season events');
    }
  }

  async scheduleRegularSeason(teams, startDate, endDate) {
    // Validate inputs
    if (!Array.isArray(teams) || teams.length === 0) {
      throw new Error('Valid teams array is required');
    }
    
    validateDate(startDate, 'Start date');
    validateDate(endDate, 'End date');
    
    if (startDate >= endDate) {
      throw new Error('End date must be after start date');
    }
    
    try {
      // Generate practice schedule
      const practices = this.generatePracticeSchedule(teams, startDate, endDate);
      
      // Generate game schedule
      const games = await this.generateGameSchedule(teams, startDate, endDate);
      
      // Combine and check for conflicts
      const allEvents = [...practices, ...games];
      
      // Resolve any scheduling conflicts
      const conflictFreeEvents = this.resolveSchedulingConflicts(allEvents);
      
      // Save to database
      const savedEvents = [];
      for (const event of conflictFreeEvents) {
        const savedEvent = await this.db.createEvent({
          title: event.title,
          type: event.type || 'practice', // Default to practice if not specified
          start_time: event.startTime,
          end_time: event.endTime,
          location: event.location,
          description: event.description,
          notes: event.notes,
          status: 'scheduled'
        });
        savedEvents.push(savedEvent);
      }
      
      return savedEvents;
    } catch (error) {
      console.error('Error scheduling regular season:', error);
      throw new Error('Failed to schedule regular season events');
    }
  }

  // Additional methods as in our previous implementation, with added security...
}

module.exports = ProgramSchedulingConcept;