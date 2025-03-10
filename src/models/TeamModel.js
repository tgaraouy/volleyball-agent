// src/models/TeamModel.js
class TeamModel {
    constructor(data) {
      this.id = data.id || crypto.randomUUID();
      this.name = data.name;
      this.level = data.level; // junior_development, intermediate, advanced, freshman, junior_varsity, varsity
      this.schoolLevel = data.schoolLevel; // middle, high
      this.seasonYear = data.seasonYear;
      this.headCoachId = data.headCoachId;
      this.playerIds = data.playerIds || [];
      this.createdAt = data.createdAt || new Date();
      this.updatedAt = new Date();
    }
  
    addPlayer(playerId) {
      if (!this.playerIds.includes(playerId)) {
        this.playerIds.push(playerId);
        this.updatedAt = new Date();
      }
    }
  
    removePlayer(playerId) {
      this.playerIds = this.playerIds.filter(id => id !== playerId);
      this.updatedAt = new Date();
    }
  
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        level: this.level,
        schoolLevel: this.schoolLevel,
        seasonYear: this.seasonYear,
        headCoachId: this.headCoachId,
        playerIds: this.playerIds,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  }
  
  module.exports = TeamModel;