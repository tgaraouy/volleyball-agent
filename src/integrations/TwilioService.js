// src/integrations/TwilioService.js
const twilio = require('twilio');

class TwilioService {
  constructor() {
    // Get credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !this.fromNumber) {
      throw new Error('Twilio credentials are missing from environment variables');
    }
    
    // Initialize Twilio client
    this.client = twilio(accountSid, authToken);
    
    // Rate limiting state to prevent abuse
    this.rateLimits = {
      sms: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50, // Maximum 50 SMS per hour per recipient
        recipients: new Map() // Map to track recipient message counts
      }
    };
  }
  
  async sendSMS(to, message, options = {}) {
    // Validate phone number format
    if (!this.isValidPhoneNumber(to)) {
      throw new Error('Invalid phone number format');
    }
    
    // Check rate limits to prevent abuse
    if (this.isRateLimited('sms', to)) {
      throw new Error('Rate limit exceeded for this recipient');
    }
    
    // Validate and sanitize message content
    const sanitizedMessage = this.sanitizeMessage(message);
    
    try {
      // Send the message via Twilio
      const result = await this.client.messages.create({
        body: sanitizedMessage,
        from: this.fromNumber,
        to: to
      });
      
      // Track this message for rate limiting
      this.trackMessageSent('sms', to);
      
      return {
        success: true,
        messageId: result.sid,
        to,
        sent: true
      };
    } catch (error) {
      this.logError('sendSMS', error, { to });
      
      return {
        success: false,
        error: this.sanitizeErrorMessage(error.message),
        to,
        sent: false
      };
    }
  }
  
  async sendBulkSMS(recipients, messageTemplate) {
    // Validate recipients array to prevent abuse
    if (!Array.isArray(recipients) || recipients.length > 100) {
      throw new Error('Invalid recipients format or exceeds maximum allowed');
    }
    
    const results = [];
    
    for (const recipient of recipients) {
      // Skip invalid entries
      if (!recipient.phone || !this.isValidPhoneNumber(recipient.phone)) {
        results.push({
          success: false,
          error: 'Invalid phone number',
          to: recipient.phone || 'unknown',
          sent: false
        });
        continue;
      }
      
      let personalizedMessage = messageTemplate;
      
      // Replace template variables with recipient-specific values
      Object.entries(recipient).forEach(([key, value]) => {
        if (key !== 'phone' && typeof value === 'string') {
          // Sanitize the replacement values
          const sanitizedValue = this.sanitizeString(value);
          personalizedMessage = personalizedMessage.replace(
            new RegExp(`{{${key}}}`, 'g'),
            sanitizedValue
          );
        }
      });
      
      const result = await this.sendSMS(recipient.phone, personalizedMessage, {
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId
      });
      
      results.push(result);
    }
    
    return results;
  }
  
  // Security utility methods
  
  isValidPhoneNumber(phone) {
    // Basic validation for E.164 format
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }
  
  sanitizeMessage(message) {
    // Sanitize message content to prevent injection
    return message.replace(/[<>]/g, '');
  }
  
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '');
  }
  
  sanitizeErrorMessage(message) {
    // Ensure error messages don't leak sensitive information
    return message.replace(/(auth|sid|token)=\S+/gi, '$1=REDACTED');
  }
  
  isRateLimited(channel, recipient) {
    const limits = this.rateLimits[channel];
    if (!limits) return false;
    
    const now = Date.now();
    
    // Get recipient's message history
    if (!limits.recipients.has(recipient)) {
      limits.recipients.set(recipient, []);
      return false;
    }
    
    // Get messages sent within the time window
    const recentMessages = limits.recipients.get(recipient)
      .filter(timestamp => now - timestamp < limits.windowMs);
    
    // Update the history
    limits.recipients.set(recipient, recentMessages);
    
    // Check if limit exceeded
    return recentMessages.length >= limits.maxRequests;
  }
  
  trackMessageSent(channel, recipient) {
    const limits = this.rateLimits[channel];
    if (!limits) return;
    
    const now = Date.now();
    
    if (!limits.recipients.has(recipient)) {
      limits.recipients.set(recipient, [now]);
    } else {
      const history = limits.recipients.get(recipient);
      history.push(now);
      limits.recipients.set(recipient, history);
    }
  }
  
  logError(method, error, context = {}) {
    console.error({
      timestamp: new Date().toISOString(),
      service: 'TwilioService',
      method,
      errorType: error.code || 'UNKNOWN',
      message: this.sanitizeErrorMessage(error.message),
      context: this.sanitizeString(JSON.stringify(context))
    });
  }
}

module.exports = TwilioService;