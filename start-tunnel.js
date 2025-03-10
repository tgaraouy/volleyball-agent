const ngrok = require('ngrok');
require('dotenv').config();

(async function() {
  try {
    // First connect to ngrok
    await ngrok.authtoken(process.env.NGROK_AUTH_TOKEN);
    
    const url = await ngrok.connect({
      proto: 'http',
      addr: process.env.PORT || 3000,
    });
    console.log('Ngrok tunnel is running:');
    console.log(url);
    console.log('\nCopy this URL and update your BASE_URL in .env file');
    console.log('Also update your Twilio webhook URL to:', url + '/api/sms-webhook');
  } catch (err) {
    console.error('Error starting ngrok:', err);
    if (err.code === 'ECONNREFUSED') {
      console.log('\nMake sure to:');
      console.log('1. Sign up at https://dashboard.ngrok.com/signup');
      console.log('2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('3. Add NGROK_AUTH_TOKEN=your_token to your .env file');
    }
  }
})(); 