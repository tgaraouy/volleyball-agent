async function predictPlayerPotential(aiService, playerData, developmentHistory) {
  return await aiService.analyze('predict_player_potential', {
    player: playerData,
    history: developmentHistory,
    predictionFactors: {
      physicalMetrics: true,
      skillProgression: true,
      learningRate: true,
      coachFeedback: true,
      competitivePerformance: true
    }
  });
}

module.exports = {
  predictPlayerPotential
}; 