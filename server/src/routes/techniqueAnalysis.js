const express = require('express');
const multer = require('multer');
const router = express.Router();
const ManusAIService = require('../ai/ManusAIService');
const path = require('path');
const LocalLLMService = require('../services/LocalLLMService');

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Not a video file'));
        }
    }
});

const llmService = new LocalLLMService();

// Initialize LLM service
llmService.initialize().catch(console.error);

// Analyze a single frame
router.post('/analyze-frame', upload.single('frame'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No frame provided' });
        }

        const frameBuffer = req.file.buffer;
        const drillId = req.body.drillId;

        // Analyze the frame using local LLM
        const analysis = await llmService.analyzeFrames([frameBuffer]);

        res.json(analysis);
    } catch (error) {
        console.error('Error analyzing frame:', error);
        res.status(500).json({ error: 'Frame analysis failed' });
    }
});

// Analyze complete technique video
router.post('/analyze-technique', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video provided' });
        }

        const videoBuffer = req.file.buffer;
        const drillId = req.body.drillId;

        // Extract frames from video
        const frames = await extractFrames(videoBuffer);

        // Analyze frames using local LLM
        const analysis = await llmService.analyzeFrames(frames);

        res.json(analysis);
    } catch (error) {
        console.error('Error analyzing technique:', error);
        res.status(500).json({ error: 'Technique analysis failed' });
    }
});

// Helper function to extract frames from video
async function extractFrames(videoBuffer) {
    // Use ffmpeg or similar to extract frames
    // This is a placeholder implementation
    return [videoBuffer];
}

// Helper function to get reference data
async function getReferenceData(drillId) {
    // This would typically fetch from a database
    // For now, return mock reference data
    return {
        keyPoints: [
            'Proper body alignment',
            'Correct arm position',
            'Follow through',
            'Balance and control'
        ],
        expectedMotions: [
            'Smooth approach',
            'Controlled movement',
            'Proper timing'
        ]
    };
}

// Function to analyze video using AI
async function analyzeVideoTechnique(videoPath, reference) {
    try {
        // Generate analysis prompt
        const prompt = `Analyze this volleyball technique video and compare it to these key points: ${JSON.stringify(reference.keyPoints)}. 
                       Focus on form, technique, and areas for improvement.`;

        // Get AI analysis
        const aiResponse = await ManusAIService.generateResponse(prompt);

        // Process AI response into structured feedback
        return {
            formScore: calculateFormScore(aiResponse),
            observations: extractObservations(aiResponse),
            recommendations: generateRecommendations(aiResponse)
        };
    } catch (error) {
        console.error('Error in AI analysis:', error);
        throw error;
    }
}

// Helper function to calculate form score
function calculateFormScore(aiResponse) {
    // Implement scoring logic based on AI response
    // This is a placeholder implementation
    return Math.floor(Math.random() * 3) + 7; // Returns 7, 8, or 9
}

// Helper function to extract observations
function extractObservations(aiResponse) {
    // Implement logic to extract key observations
    // This is a placeholder implementation
    return [
        'Good initial positioning',
        'Consistent follow-through',
        'Room for improvement in timing'
    ];
}

// Helper function to generate recommendations
function generateRecommendations(aiResponse) {
    // Implement logic to generate specific recommendations
    // This is a placeholder implementation
    return [
        'Focus on maintaining balance throughout the motion',
        'Practice the approach timing',
        'Work on arm positioning during contact'
    ];
}

module.exports = router; 