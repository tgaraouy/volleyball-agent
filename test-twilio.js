// test-twilio.js
require('dotenv').config();
const TwilioService = require('./src/integrations/TwilioService');

async function testTwilio() {
  try {
    const twilioService = new TwilioService();
    // Replace this with the actual recipient phone number in E.164 format
    const recipientNumber = '+12063833606'; // Example format: +1XXXXXXXXXX
    
    const result = await twilioService.sendSMS(
      recipientNumber,
      'Test message from Volleyball Program Agent'
    );
    console.log('SMS Result:', result);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
}

// Only run if this file is being run directly
if (require.main === module) {
  testTwilio();
}