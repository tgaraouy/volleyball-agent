// src/middleware/security.js
const crypto = require('crypto');

// Rate limiting configuration
const rateLimits = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
};

// IP tracking for rate limiting
const requestCounts = new Map();

module.exports = {
  // CORS configuration with strict options
  corsOptions: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  
  // API key validation middleware
  validateApiKey: (req, res, next) => {
    // Skip API key validation in development mode
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(403).json({
        error: 'Unauthorized access'
      });
    }
    
    next();
  },
  
  // Rate limiting middleware
  rateLimit: (req, res, next) => {
    // Skip rate limiting in development mode
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const ip = req.ip;
    
    // Get current count for this IP
    const now = Date.now();
    const ipData = requestCounts.get(ip) || { count: 0, resetTime: now + rateLimits.windowMs };
    
    // Reset if window has passed
    if (now > ipData.resetTime) {
      ipData.count = 1;
      ipData.resetTime = now + rateLimits.windowMs;
    } else {
      ipData.count += 1;
    }
    
    requestCounts.set(ip, ipData);
    
    // Check if over limit
    if (ipData.count > rateLimits.max) {
      return res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
    
    next();
  },
  
  // Set security headers middleware
  securityHeaders: (req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Only set HSTS in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // More permissive CSP in development
    const csp = process.env.NODE_ENV === 'production'
      ? "default-src 'self'"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: *";
    
    res.setHeader('Content-Security-Policy', csp);
    
    next();
  },
  
  // Request validation middleware
  validateRequest: (schema) => {
    return (req, res, next) => {
      if (!schema) return next();
      
      const { error } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.details.map(d => d.message)
        });
      }
      
      next();
    };
  },
  
  // Generate secure random token
  generateToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  }
};