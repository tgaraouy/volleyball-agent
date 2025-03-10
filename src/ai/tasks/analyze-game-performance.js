async function analyzeGamePerformance(aiService, gameStats, playerProfiles) {
  return await aiService.analyze('analyze_game_performance', {
    gameStats,
    playerProfiles,
    analysisRequirements: {
      individualPerformance: true,
      teamDynamics: true,
      improvementAreas: true,
      strategyRecommendations: true
    }
  });
}

module.exports = {
  analyzeGamePerformance
}; 