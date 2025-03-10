// src/models/MetricModel.js
class MetricModel {
    constructor(data) {
      this.id = data.id || crypto.randomUUID();
      this.name = data.name;
      this.category = data.category; // technical, physical, game_performance
      this.description = data.description;
      this.unit = data.unit;
      this.targetDirection = data.targetDirection; // higher, lower
      this.gradeAdjustments = data.gradeAdjustments || {};
      this.createdAt = data.createdAt || new Date();
      this.updatedAt = new Date();
    }
  
    getTargetForGrade(grade) {
      return this.gradeAdjustments[grade] || null;
    }
  
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        category: this.category,
        description: this.description,
        unit: this.unit,
        targetDirection: this.targetDirection,
        gradeAdjustments: this.gradeAdjustments,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  }
  
  module.exports = MetricModel;