# A4 OCR CloudFunction for Passports & A5 Notification Service

A comprehensive Node.js 18 Cloud Functions project that includes:

1. **A4 OCR CloudFunction for Passports** - Processes passport images using Google Vision API and extracts MRZ data
2. **A5 Notification Service** - Sends notifications via FCM push or SendGrid email fallback

## Features

### A4 OCR Passport Function
- **Automatic Trigger**: Triggered by Google Cloud Storage finalize events
- **OCR Processing**: Uses Google Vision API for text detection
- **MRZ Parsing**: Extracts and parses passport MRZ data
- **Firestore Storage**: Saves processed data to Firestore with proper structure
- **Retry Mechanism**: Failed processing is sent to Pub/Sub retry queue
- **Error Handling**: Comprehensive error handling with logging
- **Unit Tests**: Full test coverage for all functions

### A5 Notification Service
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

## Prerequisites

- Google Cloud Platform account
- Firebase project with FCM enabled
- Node.js 18+
- Google Cloud CLI (`gcloud`)
- Service account with appropriate permissions

## Required Google Cloud APIs

Enable the following APIs in your Google Cloud project:
- Cloud Functions API
- Cloud Vision API
- Firestore API
- Cloud Storage API
- Pub/Sub API
- Firebase Admin SDK

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd SendGrid
npm install
```

### 2. Environment Configuration

Copy the environment file and configure your settings:

```bash
cp env.example .env
```

Update `.env` with your credentials:

```bash
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1

# Firebase Configuration (for FCM)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Your App Name

# Storage Configuration
STORAGE_BUCKET_NAME=your-passport-images-bucket

# Firestore Configuration
FIRESTORE_COLLECTION_PASSPORTS=passports

# Pub/Sub Configuration
PUBSUB_TOPIC_NAME=ocr-retry-topic
PUBSUB_SUBSCRIPTION_NAME=ocr-retry-subscription
```

### 3. Service Account Setup

Create a service account with the following roles:
- Cloud Functions Developer
- Cloud Vision API User
- Firestore User
- Storage Object Viewer
- Pub/Sub Publisher
- Firebase Admin

Download the JSON key file and update `GOOGLE_APPLICATION_CREDENTIALS` in your `.env` file.

### 4. Create Required Resources

#### Storage Bucket
```bash
gsutil mb gs://your-passport-images-bucket
```

#### Pub/Sub Topic
```bash
gcloud pubsub topics create ocr-retry-topic
```

#### Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Cloud Messaging
4. Download service account key

## Development

### Local Development

```bash
# Start development server
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Testing

The project includes comprehensive unit tests:

```bash
npm test
```

Tests cover:
- OCR passport processing
- MRZ data parsing
- FCM push notifications
- SendGrid email fallbacks
- Error handling scenarios

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

## Usage

### A4 OCR Passport Function

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

### A5 Notification Service

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
  "data": {"key": "value"},
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

## FlutterFlow Integration

### 1. Copy Custom Action
Copy the code from `flutterflow/notification_action.dart` into your FlutterFlow project.

### 2. Add Dependencies
Add the http package to your `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.1.0
```

### 3. Update Function URL
Update the `cloudFunctionUrl` parameter with your deployed function URL.

### 4. Usage Example
```dart
final result = await sendSimpleNotification(
  uid: currentUserUid,
  title: 'Welcome!',
  body: 'Thanks for using our app!',
  cloudFunctionUrl: 'https://your-function-url.com/sendNotification'
);

if (result.success) {
  // Show success message
} else {
  // Handle error
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

## Monitoring and Logging

### Cloud Logging
All function executions are logged to Cloud Logging with structured data.

### Metrics
Monitor function performance using Cloud Monitoring:
- Execution time
- Memory usage
- Error rates
- Invocation counts

## Security Considerations

- **PII Redaction**: Sensitive data is redacted in logs
- **Authentication**: Service account-based authentication
- **IAM**: Minimal required permissions
- **Network**: Functions run in Google's secure environment

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check service account roles
2. **API Not Enabled**: Ensure all required APIs are enabled
3. **FCM Not Working**: Verify Firebase service account configuration
4. **SendGrid Errors**: Check API key and email configuration

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review Cloud Function logs
- Open an issue in the repository
# SendGridOCR
