// src/models/ProgramStateModel.js
class ProgramStateModel {
    constructor(data) {
      this.currentSeasonYear = data.currentSeasonYear;
      this.currentPhase = data.currentPhase; // off_season, pre_season, competition, post_season
      this.nextImportantDate = data.nextImportantDate;
      this.nextImportantEvent = data.nextImportantEvent;
      this.lastUpdated = new Date();
    }
  
    determinePhaseFromDate(date) {
      const month = date.getMonth();
      
      if (month === 7) return 'pre_season'; // August
      if (month >= 8 && month < 11) return 'competition'; // September - November
      return 'off_season'; // December - July
    }
  
    updatePhase() {
      this.currentPhase = this.determinePhaseFromDate(new Date());
      this.lastUpdated = new Date();
    }
  
    toJSON() {
      return {
        currentSeasonYear: this.currentSeasonYear,
        currentPhase: this.currentPhase,
        nextImportantDate: this.nextImportantDate,
        nextImportantEvent: this.nextImportantEvent,
        lastUpdated: this.lastUpdated
      };
    }
  }
  
  module.exports = ProgramStateModel;