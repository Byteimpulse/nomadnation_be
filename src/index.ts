import { config } from 'dotenv';

// Load environment variables
config();

interface AppConfig {
  port: number;
  environment: string;
}

const appConfig: AppConfig = {
  port: parseInt(process.env['PORT'] || '31000', 10),
  environment: process.env['NODE_ENV'] || 'development',
};

function startApp(): void {
  console.log('🚀 Starting SendGrid TypeScript Project...');
  console.log(`📍 Environment: ${appConfig.environment}`);
  console.log(`🔌 Port: ${appConfig.port}`);
  console.log('✅ Application started successfully!');
}

// Start the application
startApp();

export { startApp, appConfig };
