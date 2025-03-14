const OpenAI = require('openai');

class ManusAIService {
    constructor(config = {}) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.model = config.model || 'gpt-4';
        this.systemInstructions = config.systemInstructions || 'You are an AI assistant specializing in volleyball technique analysis and training.';
    }

    async generateResponse(prompt, context = {}) {
        try {
            const messages = [
                { role: 'system', content: this.systemInstructions },
                { role: 'user', content: prompt }
            ];

            if (context.previousMessages) {
                messages.splice(1, 0, ...context.previousMessages);
            }

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error generating AI response:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    async analyzeTechnique(videoContext, referenceData) {
        const prompt = `
            Analyze this volleyball technique based on the following context:
            Video Description: ${videoContext}
            
            Compare against these key points:
            ${referenceData.keyPoints.map(point => `- ${point}`).join('\n')}
            
            Expected Motions:
            ${referenceData.expectedMotions.map(motion => `- ${motion}`).join('\n')}
            
            Please provide:
            1. A score out of 10
            2. Key observations about the technique
            3. Specific recommendations for improvement
        `;

        const analysis = await this.generateResponse(prompt);
        return this.parseAnalysis(analysis);
    }

    parseAnalysis(analysisText) {
        // This is a simple implementation - you might want to make this more sophisticated
        return {
            formScore: this.extractScore(analysisText),
            observations: this.extractObservations(analysisText),
            recommendations: this.extractRecommendations(analysisText)
        };
    }

    extractScore(text) {
        // Simple score extraction - you might want to make this more sophisticated
        const scoreMatch = text.match(/\b([0-9]|10)(\s*\/\s*10)\b/);
        return scoreMatch ? parseInt(scoreMatch[1]) : 7;
    }

    extractObservations(text) {
        // Extract observations between "observations" and "recommendations"
        const observations = text.match(/observations:(.*?)recommendations:/is);
        if (observations && observations[1]) {
            return observations[1]
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim())
                .filter(obs => obs.length > 0);
        }
        return ['Good initial form', 'Room for improvement in technique'];
    }

    extractRecommendations(text) {
        // Extract recommendations from the end of the text
        const recommendations = text.match(/recommendations:(.*)/is);
        if (recommendations && recommendations[1]) {
            return recommendations[1]
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim())
                .filter(rec => rec.length > 0);
        }
        return ['Practice maintaining proper form', 'Focus on consistent technique'];
    }
}

module.exports = ManusAIService; 