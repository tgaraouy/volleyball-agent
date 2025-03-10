// src/models/PlayerModel.js
class PlayerModel {
    constructor(data) {
      this.id = data.id || crypto.randomUUID();
      this.firstName = data.firstName;
      this.lastName = data.lastName;
      this.grade = data.grade; // 6-12
      this.schoolLevel = data.grade <= 8 ? 'middle' : 'high';
      this.position = data.position;
      this.metrics = data.metrics || {};
      this.teamId = data.teamId;
      this.clubId = data.clubId;
      this.createdAt = data.createdAt || new Date();
      this.updatedAt = new Date();
    }
  
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  
    toJSON() {
      return {
        id: this.id,
        firstName: this.firstName,
        lastName: this.lastName,
        grade: this.grade,
        schoolLevel: this.schoolLevel,
        position: this.position,
        metrics: this.metrics,
        teamId: this.teamId,
        clubId: this.clubId,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  }
  
  module.exports = PlayerModel;