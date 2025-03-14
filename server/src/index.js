const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const ManusAIService = require('./ai/ManusAIService');
const { VolleyballProgramProtocol } = require('./protocols/VolleyballProgramProtocol');
const path = require('path');
const techniqueAnalysisRoutes = require('./routes/techniqueAnalysis');

// Load environment variables from root directory
config({ path: path.join(__dirname, '../../.env') });

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize services
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

console.log('Current directory:', __dirname);
console.log('Environment variables:');
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
console.log('PORT:', process.env.PORT || 3000);

// Initialize AI service if OpenAI key is available
let aiService = null;
if (process.env.OPENAI_API_KEY) {
  console.log('Initializing AI service...');
  console.log('Initializing OpenAI with API key length:', process.env.OPENAI_API_KEY.length);
  aiService = new ManusAIService({
    model: process.env.AI_MODEL || 'gpt-4',
    systemInstructions: process.env.AI_INSTRUCTIONS
  });
} else {
  console.warn('OpenAI API key not found. AI features will be disabled.');
}

// Initialize the volleyball program protocol
const protocol = new VolleyballProgramProtocol(supabase, aiService);

// Routes
app.post('/api/initialize-season', async (req, res) => {
  try {
    const result = await protocol.initializeSeason();
    res.json(result);
  } catch (error) {
    console.error('Error initializing season:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interest', async (req, res) => {
  try {
    const result = await protocol.submitInterestForm(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error submitting interest form:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tryouts/evaluations', async (req, res) => {
  try {
    const result = await protocol.submitTryoutEvaluation(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error submitting tryout evaluation:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered endpoints
app.post('/api/ai/player/:playerId/development-plan', async (req, res) => {
  try {
    if (!aiService) {
      throw new Error('AI service is not available');
    }
    const plan = await protocol.generateDevelopmentPlan(req.params.playerId);
    res.json(plan);
  } catch (error) {
    console.error('Error generating development plan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/schedule/optimize', async (req, res) => {
  try {
    if (!aiService) {
      throw new Error('AI service is not available');
    }
    const schedule = await protocol.optimizeSchedule(req.body.events, req.body.constraints);
    res.json(schedule);
  } catch (error) {
    console.error('Error optimizing schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/fundraising/:campaignId/recommendations', async (req, res) => {
  try {
    if (!aiService) {
      throw new Error('AI service is not available');
    }
    const recommendations = await protocol.getFundraisingRecommendations(req.params.campaignId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting fundraising recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api', techniqueAnalysisRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Volleyball program agent server running on port ${PORT}`);
  if (!process.env.HTTPS) {
    console.warn('Warning: Running in development mode without HTTPS');
  }
}); 