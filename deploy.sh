#!/bin/bash

# A4 OCR CloudFunction for Passports - Deployment Script
# This script deploys the OCR function to Google Cloud Functions

set -e

# Configuration
FUNCTION_NAME="ocr-passport"
RUNTIME="nodejs18"
REGION="us-central1"
MEMORY="2GB"
TIMEOUT="540s"
ENTRY_POINT="processPassportImage"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying A4 OCR CloudFunction for Passports...${NC}"

# Check if required tools are installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI (gcloud) is not installed. Please install it first.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Please create one from env.example${NC}"
    echo "cp env.example .env"
    echo "Then update it with your Google Cloud credentials."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo -e "${RED}❌ GOOGLE_CLOUD_PROJECT is not set in .env file${NC}"
    exit 1
fi

if [ -z "$STORAGE_BUCKET_NAME" ]; then
    echo -e "${RED}❌ STORAGE_BUCKET_NAME is not set in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo -e "${YELLOW}📋 Project: ${GOOGLE_CLOUD_PROJECT}${NC}"
echo -e "${YELLOW}📋 Bucket: ${STORAGE_BUCKET_NAME}${NC}"
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
echo -e "${YELLOW}🚀 Deploying Cloud Function...${NC}"

gcloud functions deploy $FUNCTION_NAME \
    --runtime=$RUNTIME \
    --region=$REGION \
    --source=. \
    --entry-point=$ENTRY_POINT \
    --trigger-event=google.storage.object.finalize \
    --trigger-resource=$STORAGE_BUCKET_NAME \
    --memory=$MEMORY \
    --timeout=$TIMEOUT \
    --set-env-vars=GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,FIRESTORE_COLLECTION_PASSPORTS=passports,PUBSUB_TOPIC_NAME=ocr-retry-topic \
    --allow-unauthenticated

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🎉 Your OCR function is now live and will process passport images automatically.${NC}"
    
    # Get function URL
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(httpsTrigger.url)")
    if [ ! -z "$FUNCTION_URL" ]; then
        echo -e "${GREEN}🌐 Function URL: ${FUNCTION_URL}${NC}"
    fi
    
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo "1. Upload a passport image to gs://${STORAGE_BUCKET_NAME}/{uid}/{docId}.jpg"
    echo "2. Check Cloud Function logs for processing results"
    echo "3. Verify data is saved in Firestore at /passports/{uid}/documents/{docId}"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✨ Deployment script completed!${NC}"
