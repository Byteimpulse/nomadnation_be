#!/bin/bash

# A5 Notification Service - Deployment Script
# This script deploys the notification service to Google Cloud Functions

set -e

# Configuration
FUNCTION_NAME="sendNotification"
RUNTIME="nodejs20"
REGION="us-central1"
MEMORY="512MB"
TIMEOUT="60s"
ENTRY_POINT="sendNotification"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔔 Deploying A5 Notification Service...${NC}"

# Check if required tools are installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI (gcloud) is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Get current Google Cloud project
GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo -e "${RED}❌ No Google Cloud project is set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

# Check if .env file exists for SendGrid configuration
if [ -f .env ]; then
    echo -e "${GREEN}✅ Loading environment variables from .env${NC}"
    # Use set +e to prevent script from exiting on .env errors
    set +e
    source .env 2>/dev/null || echo -e "${YELLOW}⚠️  Warning: Some lines in .env file could not be processed${NC}"
    set -e
    
    if [ -z "$SENDGRID_API_KEY" ]; then
        echo -e "${YELLOW}⚠️  SENDGRID_API_KEY is not set. Email fallback will not work.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found. Email notifications will not work without SendGrid configuration.${NC}"
    echo -e "${BLUE}💡 To enable email notifications, create a .env file with:${NC}"
    echo "SENDGRID_API_KEY=your_api_key_here"
    echo "SENDGRID_FROM_EMAIL=your_verified_email@domain.com"
    echo "SENDGRID_FROM_NAME=Your App Name"
    
    # Set empty values to prevent deployment errors
    SENDGRID_API_KEY=""
    SENDGRID_FROM_EMAIL=""
    SENDGRID_FROM_NAME=""
fi

echo -e "${GREEN}✅ Configuration loaded${NC}"
echo -e "${YELLOW}📋 Project: ${GOOGLE_CLOUD_PROJECT}${NC}"
echo -e "${YELLOW}📋 Region: ${REGION}${NC}"

# Build the project
echo -e "${YELLOW}🔨 Building TypeScript project...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Deploy the function
echo -e "${YELLOW}🚀 Deploying Notification Cloud Function...${NC}"

gcloud functions deploy $FUNCTION_NAME \
    --runtime=$RUNTIME \
    --region=$REGION \
    --source=. \
    --entry-point=$ENTRY_POINT \
    --trigger-http \
    --memory=$MEMORY \
    --timeout=$TIMEOUT \
    --allow-unauthenticated \
    --update-env-vars=SENDGRID_API_KEY="$SENDGRID_API_KEY",SENDGRID_FROM_EMAIL="$SENDGRID_FROM_EMAIL",SENDGRID_FROM_NAME="$SENDGRID_FROM_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🎉 Your notification service is now live!${NC}"
    
    # Get function URL
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(url)")
    if [ ! -z "$FUNCTION_URL" ]; then
        echo -e "${GREEN}🌐 Function URL: ${FUNCTION_URL}${NC}"
        
        # Save URL to file for easy access
        echo $FUNCTION_URL > notification-function-url.txt
        echo -e "${BLUE}📝 Function URL saved to notification-function-url.txt${NC}"
    fi
    
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo "1. Test the function with a POST request:"
    echo "   curl -X POST ${FUNCTION_URL} \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"uid\":\"test-user\",\"title\":\"Test\",\"body\":\"Hello World\"}'"
    echo ""
    echo "2. Integrate with FlutterFlow using the custom action"
    echo "3. Test both FCM push and email fallback scenarios"
    echo "4. Monitor function logs for any issues"
    
    # Test the function
    echo -e "${BLUE}🧪 Testing the function...${NC}"
    if command -v curl &> /dev/null; then
        TEST_RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
            -H 'Content-Type: application/json' \
            -d '{"uid":"test-user","title":"Test","body":"Hello World"}' 2>/dev/null || echo "curl failed")
        
        if [[ $TEST_RESPONSE == *"User not found"* ]]; then
            echo -e "${YELLOW}⚠️  Function is working but test user not found (expected)${NC}"
        elif [[ $TEST_RESPONSE == *"error"* ]]; then
            echo -e "${YELLOW}⚠️  Function test returned an error: ${TEST_RESPONSE}${NC}"
        else
            echo -e "${GREEN}✅ Function test successful: ${TEST_RESPONSE}${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, skipping function test${NC}"
    fi
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✨ Notification service deployment completed!${NC}"
echo ""
echo -e "${BLUE}🔧 Additional setup required:${NC}"
echo "1. Enable Firebase Cloud Messaging (FCM) in your Firebase project"
echo "2. Download Firebase service account key and update .env"
echo "3. Configure SendGrid API key for email fallbacks"
echo "4. Set up user collection in Firestore with FCM tokens and emails"
echo ""
echo -e "${BLUE}📱 FlutterFlow Integration:${NC}"
echo "1. Copy the FlutterFlow custom action from flutterflow/notification_action.dart"
echo "2. Update the cloudFunctionUrl parameter with your function URL"
echo "3. Add the http package to your FlutterFlow project dependencies"
echo "4. Test with both push notifications and email fallbacks"
