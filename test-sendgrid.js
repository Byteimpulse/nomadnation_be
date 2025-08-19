const sgMail = require('@sendgrid/mail');
const { config } = require('dotenv');

// Load environment variables
config();

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Your App Name';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

if (!SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY is not set in environment variables');
    process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Test SendGrid email sending functionality
 */
async function testSendGridEmail() {
    console.log('📧 Testing SendGrid Email Functionality...\n');

    const testCases = [
        {
            name: 'Simple Text Email',
            message: {
                to: TEST_EMAIL,
                from: {
                    email: FROM_EMAIL,
                    name: FROM_NAME
                },
                subject: 'Test Email - Simple Text',
                text: 'This is a simple text email sent via SendGrid for testing purposes.',
                html: '<p>This is a <strong>simple HTML email</strong> sent via SendGrid for testing purposes.</p>'
            }
        },
        {
            name: 'Rich HTML Email (Notification Style)',
            message: {
                to: TEST_EMAIL,
                from: {
                    email: FROM_EMAIL,
                    name: FROM_NAME
                },
                subject: 'Test Notification - Rich HTML',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Test Notification</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Notification Test Message</h2>
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                This is a test notification email sent through SendGrid. 
                It demonstrates the rich HTML formatting capabilities for notifications.
              </p>
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
                <h4 style="margin-top: 0; color: #1976d2;">📋 Test Details:</h4>
                <ul style="color: #666; margin-bottom: 0;">
                  <li><strong>Type:</strong> System Test</li>
                  <li><strong>Priority:</strong> Normal</li>
                  <li><strong>Category:</strong> Email Testing</li>
                  <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <a href="#" style="background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  ✓ Test Action Button
                </a>
              </div>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>This is a test email from your notification system</p>
              <p>Sent at ${new Date().toISOString()}</p>
            </div>
          </div>
        `
            }
        },
        {
            name: 'Email with Custom Headers',
            message: {
                to: TEST_EMAIL,
                from: {
                    email: FROM_EMAIL,
                    name: FROM_NAME
                },
                subject: 'Test Email - Custom Headers',
                text: 'This email includes custom headers for tracking and categorization.',
                html: '<p>This email includes <strong>custom headers</strong> for tracking and categorization.</p>',
                headers: {
                    'X-Test-Type': 'notification-test',
                    'X-Priority': 'normal',
                    'X-Category': 'testing'
                },
                categories: ['test', 'notification', 'sendgrid']
            }
        }
    ];

    for (const testCase of testCases) {
        await runEmailTest(testCase);
        console.log(''); // Empty line between tests
    }
}

/**
 * Run a single email test
 */
async function runEmailTest({ name, message }) {
    console.log(`📨 Testing: ${name}`);
    console.log(`📤 To: ${message.to}`);
    console.log(`📤 From: ${message.from.email} (${message.from.name})`);
    console.log(`📤 Subject: ${message.subject}`);

    try {
        const response = await sgMail.send(message);

        console.log('✅ Email sent successfully!');
        console.log(`📧 Message ID: ${response[0]?.headers['x-message-id'] || 'unknown'}`);
        console.log(`📊 Status Code: ${response[0]?.statusCode || 'unknown'}`);

        // Log additional response details if available
        if (response[0]?.headers) {
            const headers = response[0].headers;
            if (headers['x-message-id']) {
                console.log(`🔍 SendGrid Message ID: ${headers['x-message-id']}`);
            }
        }

    } catch (error) {
        console.log('❌ Email sending failed:');
        console.error('Error details:', error.response?.body || error.message);

        if (error.response?.body?.errors) {
            error.response.body.errors.forEach((err, index) => {
                console.log(`   Error ${index + 1}: ${err.message}`);
            });
        }
    }
}

/**
 * Test SendGrid API connectivity
 */
async function testSendGridConnection() {
    console.log('🔌 Testing SendGrid API Connection...\n');

    try {
        // This is a simple way to test if the API key is valid
        // We'll try to send to an invalid email to test connection without actually sending
        await sgMail.send({
            to: 'invalid-test@sendgrid-test.invalid',
            from: FROM_EMAIL,
            subject: 'Connection Test',
            text: 'This should fail but confirm API key works'
        });
    } catch (error) {
        if (error.code === 400 && error.response?.body?.errors) {
            const errors = error.response.body.errors;
            const hasInvalidEmailError = errors.some(err =>
                err.message.includes('invalid') || err.message.includes('does not contain a valid address')
            );

            if (hasInvalidEmailError) {
                console.log('✅ SendGrid API connection is working (invalid email error expected)');
                console.log('🔑 API Key is valid');
                return true;
            }
        }

        console.log('❌ SendGrid API connection failed:');
        console.error('Error:', error.response?.body || error.message);
        return false;
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🔧 SendGrid Testing Suite');
    console.log('=========================\n');

    // Environment check
    console.log('🔍 Environment Check:');
    console.log(`API Key: ${SENDGRID_API_KEY ? '✅ Set' : '❌ Not Set'}`);
    console.log(`From Email: ${FROM_EMAIL}`);
    console.log(`From Name: ${FROM_NAME}`);
    console.log(`Test Email: ${TEST_EMAIL}`);
    console.log('');

    // Test connection first
    const connectionOk = await testSendGridConnection();
    console.log('');

    if (connectionOk) {
        // Run email tests
        await testSendGridEmail();
    } else {
        console.log('❌ Skipping email tests due to connection issues');
    }

    console.log('🎉 SendGrid test suite completed!');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testSendGridEmail,
    testSendGridConnection,
    runEmailTest
};
