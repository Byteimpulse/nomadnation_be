const axios = require('axios');
const { config } = require('dotenv');

// Load environment variables
config();

// Configuration
const FUNCTION_URL = process.env.NOTIFICATION_FUNCTION_URL || 'https://us-central1-nomad-nation-62331.cloudfunctions.net/sendNotification'; // Local or deployed URL
const TEST_UID = process.env.TEST_UID || 'CjEO68HiW4WpCwksPH6ECdbuksE3';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

/**
 * Test the notification function with various scenarios
 */
async function runNotificationTests() {
    console.log('🚀 Starting Notification Tests...\n');

    const tests = [
        {
            name: 'Basic Notification Test',
            payload: {
                uid: TEST_UID,
                title: 'Test Notification',
                body: 'This is a basic test notification',
                priority: 'normal'
            }
        },
        {
            name: 'High Priority Notification with Data',
            payload: {
                uid: TEST_UID,
                title: 'Urgent: High Priority Test',
                body: 'This is a high priority notification with custom data',
                data: {
                    type: 'urgent',
                    category: 'system',
                    actionUrl: 'https://example.com/action'
                },
                priority: 'high'
            }
        },
        {
            name: 'Notification with Image',
            payload: {
                uid: TEST_UID,
                title: 'Image Notification Test',
                body: 'This notification includes an image',
                imageUrl: 'https://via.placeholder.com/300x200.png?text=Test+Image',
                data: {
                    hasImage: 'true'
                }
            }
        },
        {
            name: 'Invalid Request Test (Missing Required Fields)',
            payload: {
                uid: TEST_UID,
                title: 'Missing Body Test'
                // Missing 'body' field intentionally
            },
            expectError: true
        },
        {
            name: 'Non-existent User Test',
            payload: {
                uid: 'non-existent-user-999',
                title: 'Non-existent User Test',
                body: 'This should fail because user does not exist'
            },
            expectError: true
        }
    ];

    for (const test of tests) {
        await runSingleTest(test);
        console.log(''); // Empty line between tests
    }

    console.log('✅ All tests completed!\n');
}

/**
 * Run a single test case
 */
async function runSingleTest({ name, payload, expectError = false }) {
    console.log(`📋 Running: ${name}`);
    console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(FUNCTION_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (expectError) {
            console.log('❌ Expected error but got success:', response.data);
        } else {
            console.log('✅ Success:', response.data);

            // Log specific results
            if (response.data.fcmSent) {
                console.log(`📱 FCM Message ID: ${response.data.fcmMessageId}`);
            }
            if (response.data.emailSent) {
                console.log(`📧 Email Message ID: ${response.data.emailMessageId}`);
            }
        }

    } catch (error) {
        if (expectError) {
            console.log('✅ Expected error received:', error.response?.data || error.message);
        } else {
            console.log('❌ Unexpected error:', error.response?.data || error.message);

            if (error.code === 'ECONNREFUSED') {
                console.log('💡 Tip: Make sure your function is running locally or use the deployed URL');
            }
        }
    }
}

/**
 * Test SendGrid email directly (bypassing the full notification flow)
 */
async function testSendGridDirect() {
    console.log('📧 Testing SendGrid Direct Integration...\n');

    // This would require importing your SendGrid function
    // For now, we'll just show how to test it manually
    console.log('To test SendGrid directly:');
    console.log('1. Set SENDGRID_API_KEY in your environment');
    console.log('2. Set SENDGRID_FROM_EMAIL in your environment');
    console.log('3. Use the SendGrid API test endpoint:');
    console.log('   curl -X POST "https://api.sendgrid.com/v3/mail/send" \\');
    console.log('     -H "Authorization: Bearer YOUR_API_KEY" \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"from@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Hello!"}]}\'');
    console.log('');
}

/**
 * Main execution
 */
async function main() {
    console.log('🔧 Notification & SendGrid Test Suite');
    console.log('=====================================\n');

    // Check environment variables
    console.log('🔍 Environment Check:');
    console.log(`Function URL: ${FUNCTION_URL}`);
    console.log(`Test UID: ${TEST_UID}`);
    console.log(`Test Email: ${TEST_EMAIL}`);
    console.log(`SendGrid API Key: ${process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Not Set'}`);
    console.log(`SendGrid From Email: ${process.env.SENDGRID_FROM_EMAIL ? '✅ Set' : '❌ Not Set'}`);
    console.log('');

    // Run tests
    await runNotificationTests();
    await testSendGridDirect();

    console.log('🎉 Test suite completed!');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    runNotificationTests,
    runSingleTest,
    testSendGridDirect
};
