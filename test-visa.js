const axios = require('axios');

// Test the visa function locally
async function testVisaFunction() {
  try {
    console.log('Testing visa function...');
    
    // Replace with your actual function URL after deployment
    const functionUrl = process.env.VISA_FUNCTION_URL || 'http://localhost:8080/getVisaOptions';
    
    const testData = {
      countryCode: 'US',
      nationality: 'CA'
    };

    console.log('Sending request with data:', testData);
    
    const response = await axios.post(functionUrl, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing visa function:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testVisaFunction();
