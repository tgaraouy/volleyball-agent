// src/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const helmet = require('helmet');
const { nanoid } = require('nanoid');

// Debug environment variables
console.log('Current directory:', __dirname);
console.log('Environment variables loaded from:', path.resolve(__dirname, '../.env'));
console.log('Environment variables:');
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
console.log('PORT:', process.env.PORT);

// Import our security middleware
const { 
  corsOptions, 
  validateApiKey, 
  rateLimit,
  securityHeaders,
  validateRequest
} = require('./middleware/security');

// Import our services and protocol
const SupabaseService = require('./integrations/SupabaseService');
const TwilioService = require('./integrations/TwilioService');
const PlayerDevelopmentConcept = require('./concepts/PlayerDevelopmentConcept');
const ProgramSchedulingConcept = require('./concepts/ProgramSchedulingConcept');
const ParentEngagementConcept = require('./concepts/ParentEngagementConcept');
const VolleyballProgramProtocol = require('./protocols/VolleyballProgramProtocol');
const ManusAIService = require('./ai/ManusAIService');

// Initialize the app
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Set up request ID middleware
app.use((req, res, next) => {
  req.id = nanoid();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "http:", "https:", "*"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' })); // Limit payload size
app.use(securityHeaders);
app.use(rateLimit);

// Set up services
const dbService = new SupabaseService();
const commService = new TwilioService();

// Set up concepts
const playerDevelopment = new PlayerDevelopmentConcept(dbService);
const programScheduling = new ProgramSchedulingConcept(dbService);
const parentEngagement = new ParentEngagementConcept(dbService, commService);

// Initialize the AI service if OpenAI key is available
let aiService = null;
if (process.env.OPENAI_API_KEY) {
  console.log('Initializing AI service...');
  aiService = new ManusAIService({
    model: process.env.AI_MODEL || 'gpt-4',
    systemInstructions: process.env.AI_INSTRUCTIONS
  });
} else {
  console.warn('OpenAI API key not found. AI features will be disabled.');
}

// Initialize the protocol
const volleyballProgram = new VolleyballProgramProtocol(
  dbService,
  commService,
  playerDevelopment,
  programScheduling,
  parentEngagement,
  aiService
);

// Set up error handling middleware
app.use((err, req, res, next) => {
  console.error('Detailed error:', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    originalError: err
  });
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred processing your request',
    requestId: req.id,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Apply API validation to api routes
app.use('/api', validateApiKey);

// Set up routes
app.post('/api/initialize-season', async (req, res, next) => {
  try {
    const { year } = req.body;
    
    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }
    
    const result = await volleyballProgram.initializeSeason(year);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Initialize fundraising campaign endpoint
app.post('/api/fundraising/initialize', async (req, res, next) => {
  try {
    const { year } = req.body;
    
    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }

    const startDate = new Date(year, 7, 15); // August 15th
    const endDate = new Date(year, 10, 15); // November 15th
    
    const campaign = await volleyballProgram.parentEngagement.initializeFundraisingCampaign({
      name: `${year} Volleyball Season Support`,
      description: `Annual fundraising campaign to support the ${year} volleyball season`,
      goalAmount: 5000,
      startDate,
      endDate,
      coordinatorId: null
    });

    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Player registration route
app.post('/api/players', async (req, res, next) => {
  try {
    const { firstName, lastName, grade, position, parentInfo } = req.body;
    
    // Validate inputs
    if (!firstName || !lastName || !grade) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the player
    const newPlayer = {
      firstName,
      lastName, 
      grade,
      position: position || null,
      schoolLevel: grade <= 8 ? 'middle' : 'high'
    };
    
    // Save to database
    const playerId = await dbService.createPlayer(newPlayer);
    
    // If parent info is provided, associate with player
    if (parentInfo) {
      await dbService.addParentToPlayer(playerId, parentInfo);
    }
    
    res.status(201).json({
      id: playerId,
      ...newPlayer
    });
  } catch (error) {
    next(error);
  }
});

// Player metrics routes
app.post('/api/players/:playerId/metrics', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { metrics, recordedBy } = req.body;
    
    if (!metrics || Object.keys(metrics).length === 0) {
      return res.status(400).json({ error: 'No metrics provided' });
    }
    
    const results = [];
    
    // Record each metric
    for (const [metricId, value] of Object.entries(metrics)) {
      const result = await dbService.recordPlayerMetric(
        playerId,
        metricId,
        value,
        recordedBy
      );
      results.push(result);
    }
    
    res.json({
      message: 'Metrics recorded successfully',
      count: results.length,
      metrics: results
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/players/:playerId/metrics', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { startDate, endDate, category } = req.query;
    
    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    if (category) options.category = category;
    
    const metrics = await dbService.getPlayerMetrics(playerId, options);
    
    res.json({
      playerId,
      metrics,
      count: metrics.length
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/metrics', async (req, res, next) => {
  try {
    const { category } = req.query;
    const metrics = await dbService.getMetricDefinitions(category);
    
    res.json({
      metrics,
      count: metrics.length
    });
  } catch (error) {
    next(error);
  }
});

// Program scheduling routes
app.post('/api/events', async (req, res, next) => {
  try {
    const {
      title,
      type,
      startTime,
      endTime,
      location,
      description,
      teamLevel,
      maxParticipants,
      requiresRsvp
    } = req.body;

    // Validate required fields
    if (!title || !type || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const event = await dbService.createEvent({
      title,
      type,
      startTime: start,
      endTime: end,
      location,
      description,
      teamLevel,
      maxParticipants,
      requiresRsvp,
      createdBy: req.user?.id // Assuming user info is attached by auth middleware
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

app.put('/api/events/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    // Convert date strings to Date objects if present
    if (updates.startTime) updates.startTime = new Date(updates.startTime);
    if (updates.endTime) updates.endTime = new Date(updates.endTime);

    const event = await dbService.updateEvent(eventId, updates);
    res.json(event);
  } catch (error) {
    next(error);
  }
});

app.get('/api/events/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await dbService.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    next(error);
  }
});

app.get('/api/events', async (req, res, next) => {
  try {
    console.log('Fetching events with query params:', req.query);
    
    const { teamLevel, type, daysAhead } = req.query;
    
    const options = {
      teamLevel,
      type,
      daysAhead: daysAhead ? parseInt(daysAhead, 10) : undefined
    };

    console.log('Calling getUpcomingEvents with options:', options);
    const events = await dbService.getUpcomingEvents(options);
    console.log('Retrieved events:', events);
    
    res.json({
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Error in /api/events:', error);
    next(error);
  }
});

app.post('/api/events/:eventId/attendance', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { playerId, status, notes } = req.body;

    if (!playerId || !status) {
      return res.status(400).json({ error: 'Player ID and status are required' });
    }

    const attendance = await dbService.recordEventAttendance(
      eventId,
      playerId,
      status,
      notes
    );

    res.json(attendance);
  } catch (error) {
    next(error);
  }
});

app.get('/api/players/:playerId/attendance', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { startDate, endDate, eventType } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType
    };

    const attendance = await dbService.getPlayerAttendance(playerId, options);
    res.json({
      playerId,
      attendance,
      count: attendance.length
    });
  } catch (error) {
    next(error);
  }
});

// Configure Twilio webhook for incoming messages
app.post('/api/sms-webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    // Verify the request is from Twilio
    const twilioSignature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const url = `${process.env.BASE_URL}/api/sms-webhook`;
    
    const twilio = require('twilio');
    const requestIsValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      req.body
    );
    
    if (!requestIsValid) {
      console.error('Invalid Twilio signature');
      return res.status(403).send('<Response></Response>');
    }
    
    const { From, Body } = req.body;
    console.log(`Received SMS from ${From}: ${Body}`);
    
    // Process the message - we'll implement this later
    
    // Send a response
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  }
});

// Set up cron jobs
cron.schedule('0 8 * * *', async () => {
  try {
    console.log('Running daily event reminder check...');
    
    // Get events for the next 2 days
    const events = await volleyballProgram.getUpcomingEvents(2);
    
    // Process each event to send appropriate reminders
    for (const event of events) {
      // Implementation details...
    }
  } catch (error) {
    console.error('Error in daily reminder task:', error);
  }
});

// AI-powered endpoints
app.post('/api/ai/player/:playerId/development-plan', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const aiPlan = await volleyballProgram.generateDevelopmentPlan(playerId);
    res.json(aiPlan);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/schedule/optimize', async (req, res, next) => {
  try {
    const { events, constraints } = req.body;
    const optimizedSchedule = await volleyballProgram.optimizeSchedule(events, constraints);
    res.json(optimizedSchedule);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/fundraising/:campaignId/recommendations', async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const recommendations = await volleyballProgram.getFundraisingRecommendations(campaignId);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
});

// Pre-season communication endpoints
app.post('/api/communications/preseason', async (req, res, next) => {
  try {
    const { title, message, targetGroup, scheduledDate } = req.body;
    
    if (!title || !message || !targetGroup) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save communication to database and schedule delivery
    const communication = await volleyballProgram.parentEngagement.schedulePreSeasonCommunication({
      title,
      message,
      targetGroup, // 'all', 'middle_school', 'high_school'
      scheduledDate: scheduledDate || new Date(),
      status: 'scheduled'
    });

    res.status(201).json(communication);
  } catch (error) {
    next(error);
  }
});

app.get('/api/communications/preseason', async (req, res, next) => {
  try {
    const communications = await volleyballProgram.parentEngagement.getPreSeasonCommunications();
    res.json(communications);
  } catch (error) {
    next(error);
  }
});

// Budget and resource planning endpoints
app.post('/api/planning/budget', async (req, res, next) => {
  try {
    const { 
      year,
      equipmentBudget,
      facilityBudget,
      uniformBudget,
      travelBudget,
      miscBudget,
      notes
    } = req.body;
    
    if (!year || !equipmentBudget || !facilityBudget) {
      return res.status(400).json({ error: 'Missing required budget fields' });
    }

    const budget = await volleyballProgram.createSeasonBudget({
      year,
      equipment_budget: equipmentBudget,
      facility_budget: facilityBudget,
      uniform_budget: uniformBudget,
      travel_budget: travelBudget,
      misc_budget: miscBudget,
      notes,
      status: 'draft'
    });

    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
});

app.get('/api/planning/budget/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    const budget = await volleyballProgram.getSeasonBudget(year);
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

// Player interest form endpoints
app.post('/api/interest-forms', async (req, res, next) => {
  try {
    const {
      studentName,
      grade,
      schoolName,
      previousExperience,
      preferredPosition,
      parentName,
      parentEmail,
      parentPhone,
      questions,
      clubExperience
    } = req.body;

    // Validate required fields
    if (!studentName || !grade || !parentName || !parentEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const interestForm = await dbService.createInterestForm({
      student_name: studentName,
      grade,
      school_name: schoolName,
      previous_experience: previousExperience,
      preferred_position: preferredPosition,
      parent_name: parentName,
      parent_email: parentEmail,
      parent_phone: parentPhone,
      questions,
      club_experience: clubExperience,
      submission_date: new Date(),
      status: 'pending',
      school_level: grade <= 8 ? 'middle' : 'high'
    });

    // Automatically subscribe to newsletter
    await volleyballProgram.parentEngagement.addNewsletterSubscriber({
      email: parentEmail,
      name: parentName,
      studentGrade: grade,
      subscriptionType: 'interest_form'
    });

    // Send confirmation email
    await commService.sendEmail({
      to: parentEmail,
      subject: 'Volleyball Program Interest Form Received',
      template: 'interest_form_confirmation',
      data: {
        parentName,
        studentName
      }
    });

    res.status(201).json(interestForm);
  } catch (error) {
    next(error);
  }
});

app.get('/api/interest-forms', async (req, res, next) => {
  try {
    const { status, schoolLevel } = req.query;
    const forms = await dbService.getInterestForms({ status, schoolLevel });
    res.json(forms);
  } catch (error) {
    next(error);
  }
});

// Newsletter subscription endpoints
app.post('/api/newsletter/subscribe', async (req, res, next) => {
  try {
    const { email, name, preferences, studentGrade } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const subscription = await volleyballProgram.parentEngagement.addNewsletterSubscriber({
      email,
      name,
      preferences,
      studentGrade,
      subscriptionType: 'direct'
    });

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

app.post('/api/newsletter/unsubscribe', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await volleyballProgram.parentEngagement.removeNewsletterSubscriber(email);
    res.json({ message: 'Successfully unsubscribed' });
  } catch (error) {
    next(error);
  }
});

// Tryout evaluation endpoints
app.post('/api/tryouts/evaluation-criteria', async (req, res, next) => {
  try {
    const {
      schoolLevel,
      categories,
      year
    } = req.body;

    if (!schoolLevel || !categories || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const criteria = await dbService.createTryoutEvaluationCriteria({
      school_level: schoolLevel,
      year,
      categories: categories.map(cat => ({
        name: cat.name,
        weight: cat.weight,
        metrics: cat.metrics.map(metric => ({
          name: metric.name,
          description: metric.description,
          min_score: metric.minScore || 1,
          max_score: metric.maxScore || 5
        }))
      })),
      status: 'active'
    });

    res.status(201).json(criteria);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tryouts/evaluations', async (req, res, next) => {
  try {
    const {
      playerId,
      evaluatorId,
      scores,
      notes,
      recommendedTeam
    } = req.body;

    if (!playerId || !evaluatorId || !scores) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const evaluation = await dbService.createTryoutEvaluation({
      player_id: playerId,
      evaluator_id: evaluatorId,
      scores,
      notes,
      recommended_team: recommendedTeam,
      evaluation_date: new Date()
    });

    res.status(201).json(evaluation);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tryouts/evaluations/:playerId', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const evaluations = await dbService.getPlayerTryoutEvaluations(playerId);
    res.json(evaluations);
  } catch (error) {
    next(error);
  }
});

// Start the server with HTTPS in production
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  const fs = require('fs');
  
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };
  
  https.createServer(options, app).listen(PORT, () => {
    console.log(`Secure volleyball program agent server running on port ${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Volleyball program agent server running on port ${PORT}`);
    console.log('Warning: Running in development mode without HTTPS');
  });
}