const { createServer } = require('http');
const { sendNotification } = require('./dist/functions/notification');

/**
 * Simple local server to test the notification function
 * Run this after building your TypeScript code
 */
const PORT = process.env.PORT || 8080;

const server = createServer(async (req, res) => {
    // Enable CORS for testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const requestBody = JSON.parse(body);

                // Mock request and response objects for the function
                const mockReq = {
                    method: 'POST',
                    body: requestBody,
                    headers: req.headers
                };

                let responseData = null;
                let statusCode = 200;

                const mockRes = {
                    status: (code) => {
                        statusCode = code;
                        return {
                            json: (data) => {
                                responseData = data;
                            }
                        };
                    },
                    json: (data) => {
                        responseData = data;
                    }
                };

                await sendNotification(mockReq, mockRes);

                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responseData));

            } catch (error) {
                console.error('Error processing request:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Internal server error',
                    error: error.message
                }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Local test server running on http://localhost:${PORT}`);
    console.log('📝 Send POST requests to test your notification function');
    console.log('🛑 Press Ctrl+C to stop');
});

module.exports = server;
