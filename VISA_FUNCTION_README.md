# Visa Options Function

A Cloud Function that retrieves visa options for travelers based on destination country and nationality, with intelligent caching and retry logic.

## Features

- **HTTP Callable Function**: `getVisaOptions(countryCode, nationality)`
- **Firestore Caching**: Results cached for 24 hours with MD5 hash-based keys
- **Rate Limiting Handling**: Automatic retry with exponential backoff for 429 responses
- **Comprehensive Error Handling**: Graceful handling of API errors, network issues, and validation failures
- **Input Validation**: Strict validation of country codes and request parameters
- **Jest Unit Tests**: Complete test coverage for all scenarios

## API Endpoint

```
POST /getVisaOptions
```

### Request Body

```json
{
  "countryCode": "US",
  "nationality": "CA"
}
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "visaRequired": true,
    "visaType": "B1/B2",
    "processingTime": "5-7 business days"
  },
  "message": "Visa options retrieved successfully",
  "cached": false
}
```

**Cached Response:**
```json
{
  "success": true,
  "data": {
    "visaRequired": false,
    "visaType": "Visa Waiver"
  },
  "message": "Visa options retrieved from cache",
  "cached": true
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to get visa options",
  "error": "API Error: 500 - Internal Server Error"
}
```

## Configuration

### Environment Variables

- `VISA_API_URL`: External visa API endpoint (default: `https://api.example.com/visa-options`)
- `VISA_API_KEY`: API key for external visa service

### Cache Configuration

- **Duration**: 24 hours
- **Collection**: `visaCache`
- **Key Format**: MD5 hash of `{countryCode}-{nationality}`

### Retry Configuration

- **Max Retries**: 3
- **Base Delay**: 1 second
- **Max Delay**: 10 seconds
- **Backoff Strategy**: Exponential with jitter

## Input Validation

- **countryCode**: Must be 2-character ISO country code (e.g., "US", "CA", "GB")
- **nationality**: Must be 2-character ISO country code
- **Request Method**: Only POST requests accepted
- **Content Type**: JSON

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (validation errors)
- `405`: Method Not Allowed
- `500`: Internal Server Error

### Error Scenarios Handled

- Missing required fields
- Invalid input types
- Invalid country code format
- API rate limiting (429)
- API errors (4xx, 5xx)
- Network timeouts
- Cache write failures

## Caching Strategy

1. **Cache Key Generation**: MD5 hash of lowercase country codes
2. **Cache Validation**: Timestamp-based expiration check
3. **Cache Update**: Automatic refresh on expiration
4. **Cache Collection**: Firestore `visaCache` collection

## Rate Limiting & Retries

### 429 Response Handling

1. **Exponential Backoff**: Delay increases with each retry
2. **Jitter**: Random delay variation to prevent thundering herd
3. **Max Retries**: 3 attempts before failing
4. **Logging**: Detailed retry attempt logging

### Retry Delays

- Attempt 1: 1 second
- Attempt 2: 2 seconds  
- Attempt 3: 4 seconds
- Maximum: 10 seconds

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- **Happy Path**: Successful API calls, caching, cache expiration
- **Rate Limiting**: 429 responses, retry logic, max retry failures
- **Error Handling**: API errors, network errors, validation errors
- **Input Validation**: Valid/invalid country codes, missing fields
- **Cache Management**: Cache hits, misses, expiration, write errors

### Test Structure

```
src/__tests__/functions/visa.test.ts
├── Happy Path Tests
├── Rate Limiting (429) Tests  
├── Error Handling Tests
├── Input Validation Tests
└── Cache Management Tests
```

## Deployment

### Firebase Functions

```bash
# Deploy to Firebase
npm run deploy:visa

# Or manually
firebase deploy --only functions:getVisaOptions
```

### Google Cloud Functions

```bash
# Deploy to Google Cloud
gcloud functions deploy getVisaOptions \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point getVisaOptions \
  --source .
```

## Local Development

### Prerequisites

- Node.js 18+
- Firebase CLI
- Google Cloud CLI (optional)

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   ```bash
   # .env file
   VISA_API_URL=https://your-visa-api.com/endpoint
   VISA_API_KEY=your-api-key
   ```

3. **Local Testing**
   ```bash
   # Test function locally
   npm run test:local
   
   # Test visa function specifically
   node test-visa.js
   ```

## Monitoring & Logging

### Log Levels

- **Info**: Function calls, cache hits/misses, API calls
- **Warning**: Retry attempts, cache expiration
- **Error**: API failures, validation errors, cache write failures

### Key Metrics

- Cache hit rate
- API response times
- Retry frequency
- Error rates by type

## Security Considerations

- Input validation and sanitization
- Rate limiting protection
- API key management
- Request timeout limits
- Error message sanitization

## Performance Optimization

- **Caching**: 24-hour cache reduces API calls
- **Connection Pooling**: Axios connection reuse
- **Timeout Management**: 10-second request timeout
- **Efficient Hashing**: MD5 for cache keys

## Troubleshooting

### Common Issues

1. **Cache Not Working**: Check Firestore permissions and collection name
2. **API Timeouts**: Verify external API endpoint and network connectivity
3. **Rate Limiting**: Check retry configuration and external API limits
4. **Validation Errors**: Ensure country codes are 2-character ISO codes

### Debug Mode

Enable detailed logging by setting environment variable:
```bash
DEBUG=visa-function:*
```

## Contributing

1. Follow existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure all tests pass before submitting

## License

MIT License - see package.json for details
