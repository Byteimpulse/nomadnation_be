const axios = require('axios');

// Test the visa eligibility function
async function testVisaEligibility() {
  try {
    console.log('Testing visa eligibility function...');
    
    // Replace with your actual function URL after deployment
    const functionUrl = process.env.VISA_ELIGIBILITY_FUNCTION_URL || 'http://localhost:8080/visaEligibility';
    
    // Test case 1: US citizen going to Indonesia (should include KITAS overrides)
    const testData1 = {
      countryCode: 'ID',
      nationality: 'US'
    };

    console.log('\n=== Test Case 1: US → Indonesia ===');
    console.log('Request data:', testData1);
    
    const response1 = await axios.post(functionUrl, testData1, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('Response status:', response1.status);
    console.log('Response data:', JSON.stringify(response1.data, null, 2));
    
    // Verify the response structure
    if (response1.data.success && response1.data.data) {
      const options = response1.data.data;
      console.log(`\n✅ Received ${options.length} visa options`);
      
      // Check if KITAS options are included
      const kitasOptions = options.filter(opt => opt.type === 'KITAS');
      console.log(`📋 KITAS options: ${kitasOptions.length}`);
      
      // Check if options are sorted by processing time
      let isSorted = true;
      for (let i = 1; i < options.length; i++) {
        if (options[i].processingTimeDays < options[i-1].processingTimeDays) {
          isSorted = false;
          break;
        }
      }
      console.log(`🔄 Sorted by processing time: ${isSorted ? '✅' : '❌'}`);
      
      // Display first few options
      console.log('\n📋 First 3 visa options:');
      options.slice(0, 3).forEach((option, index) => {
        console.log(`${index + 1}. ${option.name} (${option.type})`);
        console.log(`   Processing: ${option.processingTime} (${option.processingTimeDays} days)`);
        console.log(`   Cost: ${option.cost} ${option.costCurrency}`);
        console.log(`   Source: ${option.source}`);
        console.log('');
      });
    }

    // Test case 2: Different nationality to Indonesia
    const testData2 = {
      countryCode: 'ID',
      nationality: 'CA'
    };

    console.log('\n=== Test Case 2: Canadian → Indonesia ===');
    console.log('Request data:', testData2);
    
    const response2 = await axios.post(functionUrl, testData2, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('Response status:', response2.status);
    if (response2.data.success && response2.data.data) {
      console.log(`✅ Received ${response2.data.data.length} visa options`);
    }

    // Test case 3: Non-Indonesia destination (should not include KITAS)
    const testData3 = {
      countryCode: 'US',
      nationality: 'CA'
    };

    console.log('\n=== Test Case 3: Canadian → US (No KITAS) ===');
    console.log('Request data:', testData3);
    
    const response3 = await axios.post(functionUrl, testData3, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('Response status:', response3.status);
    if (response3.data.success && response3.data.data) {
      const options = response3.data.data;
      const kitasOptions = options.filter(opt => opt.type === 'KITAS');
      console.log(`✅ Received ${options.length} visa options`);
      console.log(`📋 KITAS options: ${kitasOptions.length} (should be 0 for non-Indonesia)`);
    }
    
  } catch (error) {
    console.error('Error testing visa eligibility function:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testVisaEligibility();
