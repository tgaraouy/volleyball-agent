const ort = require('onnxruntime-node');
const { spawn } = require('child_process');
const path = require('path');

class LocalLLMService {
    constructor() {
        this.modelPath = path.join(__dirname, '../models/volleyball_analysis.onnx');
        this.session = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.session = await ort.InferenceSession.create(this.modelPath);
            this.isInitialized = true;
            console.log('Local LLM model loaded successfully');
        } catch (error) {
            console.error('Error initializing local LLM:', error);
            throw error;
        }
    }

    async analyzeFrames(frames) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Process frames and extract key points
            const keyPoints = await this.extractKeyPoints(frames);
            
            // Analyze technique using the local model
            const analysis = await this.analyzeTechnique(keyPoints);
            
            return {
                formScore: analysis.score,
                observations: analysis.observations,
                recommendations: analysis.recommendations
            };
        } catch (error) {
            console.error('Error analyzing frames:', error);
            throw error;
        }
    }

    async extractKeyPoints(frames) {
        // Use MediaPipe or similar for pose estimation
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                path.join(__dirname, '../python/extract_keypoints.py')
            ]);

            let keyPoints = '';

            pythonProcess.stdout.on('data', (data) => {
                keyPoints += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Error: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}`));
                    return;
                }
                resolve(JSON.parse(keyPoints));
            });
        });
    }

    async analyzeTechnique(keyPoints) {
        // Prepare input tensor
        const inputTensor = new ort.Tensor('float32', keyPoints, [1, keyPoints.length]);
        
        // Run inference
        const outputs = await this.session.run({
            input: inputTensor
        });

        // Process model outputs
        const scores = outputs.scores.data;
        const features = outputs.features.data;

        // Generate feedback based on model outputs
        return this.generateFeedback(scores, features);
    }

    generateFeedback(scores, features) {
        // Map model outputs to human-readable feedback
        const score = Math.round(scores[0] * 10);
        const observations = [];
        const recommendations = [];

        // Example feedback generation logic
        if (features[0] < 0.5) {
            observations.push('Arm platform not level during pass');
            recommendations.push('Focus on creating a flat platform with your arms');
        }

        if (features[1] < 0.5) {
            observations.push('Limited knee bend in ready position');
            recommendations.push('Maintain a lower athletic stance');
        }

        return {
            score,
            observations,
            recommendations
        };
    }
}

module.exports = LocalLLMService; 