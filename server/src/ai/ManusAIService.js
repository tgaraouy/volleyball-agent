const { Configuration, OpenAIApi } = require('openai');

class ManusAIService {
    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.openai = new OpenAIApi(configuration);
    }

    async generateDevelopmentPlan(playerData) {
        try {
            const response = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional volleyball coach specializing in player development."
                    },
                    {
                        role: "user",
                        content: `Create a development plan for a player with the following attributes: ${JSON.stringify(playerData)}`
                    }
                ]
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating development plan:', error);
            throw new Error('Failed to generate development plan');
        }
    }

    async optimizeSchedule(scheduleData) {
        try {
            const response = await this.openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a scheduling expert for volleyball programs."
                    },
                    {
                        role: "user",
                        content: `Optimize this volleyball schedule: ${JSON.stringify(scheduleData)}`
                    }
                ]
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error optimizing schedule:', error);
            throw new Error('Failed to optimize schedule');
        }
    }
}

module.exports = { ManusAIService }; 