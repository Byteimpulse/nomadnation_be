# Nomad Nation - Backend

A comprehensive Node.js 18 Cloud Functions project that includes:

1. **OCR CloudFunction for Passports** - Processes passport images using Google Vision API and extracts MRZ data
2. **Notification Service** - Sends notifications via FCM push or SendGrid email fallback

## Features

### OCR Passport Function

- **Automatic Trigger**: Triggered by Google Cloud Storage finalize events
- **OCR Processing**: Uses Google Vision API for text detection
- **MRZ Parsing**: Extracts and parses passport MRZ data
- **Firestore Storage**: Saves processed data to Firestore with proper structure
- **Retry Mechanism**: Failed processing is sent to Pub/Sub retry queue
- **Error Handling**: Comprehensive error handling with logging

### Notification Service

- **FCM Integration**: Firebase Cloud Messaging for push notifications
- **Email Fallback**: SendGrid integration when FCM is unavailable
- **Smart Routing**: Automatically chooses best notification method
- **FlutterFlow Ready**: Custom action wrapper for easy FlutterFlow integration
- **Priority Support**: High and normal priority notifications
- **Rich Content**: Support for images and custom data payloads

## Architecture

```
Storage Upload → OCR Function → Vision API → MRZ Parsing → Firestore
                    ↓
                Error Handling → Pub/Sub Retry Queue

Notification Request → Cloud Function → FCM Push (or Email Fallback)
                           ↓
                    User Device/Email
```

## Setup

### Create Required Resources

#### Storage Bucket

```bash
gsutil mb gs://your-passport-images-bucket
```

#### Pub/Sub Topic

```bash
gcloud pubsub topics create ocr-retry-topic
```

## Development

### Local Development

```bash
# Start development server
npm run dev

# Build the project
npm run build
```

## Deployment

### Option 1: Deploy Both Functions

```bash
# Deploy OCR function
./deploy.sh

# Deploy notification function
./deploy-notification.sh
```

### Option 2: Manual Deployment

#### OCR Function

```bash
npm run build
gcloud functions deploy ocr-passport \
  --runtime nodejs18 \
  --region us-central1 \
  --source dist \
  --entry-point processPassportImage \
  --trigger-event google.storage.object.finalize \
  --trigger-resource your-passport-images-bucket \
  --memory 2GB \
  --timeout 540s
```

#### Notification Function

```bash
npm run build
gcloud functions deploy sendNotification \
  --runtime nodejs18 \
  --region us-central1 \
  --source dist \
  --entry-point sendNotification \
  --trigger-http \
  --memory 512MB \
  --timeout 60s \
  --allow-unauthenticated
```

## How to Get Function URLs

After deploying your Cloud Functions, you'll need their URLs to test and use them. Here are several ways to get your function URLs:

### Method 1: Using gcloud CLI (Fastest)

```bash
# Get URL for a specific function
gcloud functions describe FUNCTION_NAME --region=REGION --format="value(url)"

# Example: Get sendNotification function URL
gcloud functions describe sendNotification --region=us-central1 --format="value(url)"

# List all functions with their URLs
gcloud functions list --format="table(name,url)"

# List functions with more details
gcloud functions list --format="table(name,url,status,trigger.httpsTrigger.url)"
```

### Method 2: Google Cloud Console (GUI)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Functions**
3. Click on your function name
4. The URL will be displayed in the **Trigger** section

### Method 3: Full Function Details

```bash
# Get complete function information (includes URL)
gcloud functions describe FUNCTION_NAME --region=REGION

# Example output will include:
# url: https://us-central1-your-project.cloudfunctions.net/functionName
```

### Method 4: Environment-Specific URLs

```bash
# Production functions
gcloud functions list --regions=us-central1

# Development functions (if using different region)
gcloud functions list --regions=us-east1
```

### Expected URL Format

Your function URLs will follow this pattern:

```
https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME
```

Example:

```
https://us-central1-nomad-nation-62331.cloudfunctions.net/sendNotification
```

### Quick URL Retrieval Script

Add this to your `package.json` scripts for quick access:

```json
{
  "scripts": {
    "get-urls": "gcloud functions list --format='table(name,url)' --filter='name:(sendNotification OR addFcmToken)'"
  }
}
```

Then run:

```bash
npm run get-urls
```

## Usage

### OCR Passport Function

#### File Upload Structure

Upload passport images to your Storage bucket using this path structure:

```
gs://your-bucket/{uid}/{docId}.{extension}
```

Example:

```
gs://passport-bucket/user123/passport456.jpg
```

#### Expected Output

The function will extract MRZ data and save it to Firestore at:

```
/passports/{uid}/documents/{docId}
```

### Notification Service

#### API Endpoint

```
POST /sendNotification
```

#### Request Body

```json
{
  "uid": "user123",
  "title": "Hello!",
  "body": "This is a test notification",
  "data": { "key": "value" },
  "priority": "normal"
}
```

#### Response

```json
{
  "success": true,
  "message": "Notification sent successfully",
  "fcmSent": true,
  "emailSent": false,
  "fcmMessageId": "fcm-msg-123"
}
```

## Error Handling

### OCR Function

- **Retry Mechanism**: Failed processing attempts are automatically sent to a Pub/Sub retry queue
- **Common Errors**: Invalid file types, no text detected, MRZ not found

### Notification Service

- **Smart Fallback**: Automatically falls back to email if FCM fails
- **Error Tracking**: Comprehensive error logging and response codes
- **User Validation**: Checks user existence and device information

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in your environment variables.

## Testing Both Services

### Test OCR Function

1. Upload a passport image to your Storage bucket
2. Check Cloud Function logs for processing results
3. Verify data is saved in Firestore

### Test Notification Service

1. Send a test notification via HTTP POST
2. Verify FCM push notification is received
3. Test email fallback by temporarily disabling FCM
4. Check both success and error scenarios

## Monitoring & Logs

### Check Function Logs

#### Real-time Function Execution Logs

```bash
# Watch recent function execution logs (last 10 minutes)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ocr-passport" --limit=10 --format="table(timestamp,severity,textPayload)" --freshness=10m

# Watch notification function logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sendNotification" --limit=10 --format="table(timestamp,severity,textPayload)" --freshness=10m
```

#### Error Logs Only

```bash
# Check for OCR function errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ocr-passport AND severity>=ERROR" --limit=5 --freshness=1h

# Check for notification function errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sendNotification AND severity>=ERROR" --limit=5 --freshness=1h
```

#### Deployment & Configuration Logs

```bash
# Check function deployment logs
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=ocr-passport" --limit=10

# Check function configuration changes
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=sendNotification" --limit=10
```

#### Advanced Log Filtering

```bash
# Filter logs by specific execution ID
gcloud logging read "resource.type=cloud_run_revision AND labels.execution_id=EXECUTION_ID" --limit=20

# Filter logs by specific time range
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ocr-passport" --limit=20 --format="table(timestamp,severity,textPayload)" --freshness=2h

# Get detailed JSON logs for debugging
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ocr-passport" --limit=5 --format=json
```

#### Function Status & Info

```bash
# Check function configuration
gcloud functions describe ocr-passport --region=us-central1
gcloud functions describe sendNotification --region=us-central1

# Check which bucket the OCR function is listening to
gcloud functions describe ocr-passport --region=us-central1 --format="value(eventTrigger.eventFilters.value)"

# List all deployed functions
gcloud functions list --regions=us-central1
```

#### Storage & File Monitoring

```bash
# List files in the passport bucket
gcloud storage ls gs://nomad-nation-passport-bucket/ --recursive

# Check bucket configuration
gcloud storage buckets describe gs://nomad-nation-passport-bucket
```

#### Common Log Patterns to Look For

- **Successful processing**: `"Successfully processed passport image"`
- **MRZ extraction errors**: `"MRZ lines not found"`
- **Permission errors**: `"Permission denied"`
- **Retry queue errors**: `"Resource not found (resource=ocr-retry-topic)"`
- **Notification success**: `"Notification sent successfully"`
- **FCM failures**: `"FCM notification failed"`
