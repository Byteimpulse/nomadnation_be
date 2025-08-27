# FlutterFlow Visa Options Page

A FlutterFlow project that displays visa eligibility options using the `visaEligibility` API endpoint.

## Features

- **FutureBuilder Implementation**: Uses FutureBuilder to fetch and display visa options
- **Card-based UI**: Beautiful list cards for each visa option
- **Sorting**: Options sorted by processing time then cost
- **KITAS Integration**: Includes static KITAS overrides for Indonesia
- **Responsive Design**: Works on both mobile and tablet devices

## Project Structure

```
flutterflow_visa_options/
├── README.md                           # This file
├── lib/
│   ├── main.dart                      # Main app entry point
│   ├── models/
│   │   └── visa_option.dart           # Visa option data model
│   ├── services/
│   │   └── visa_service.dart          # API service for visa eligibility
│   ├── screens/
│   │   └── visa_options_screen.dart   # Main visa options screen
│   └── widgets/
│       └── visa_option_card.dart      # Card widget for each visa option
├── pubspec.yaml                       # Dependencies
└── assets/                            # Images and other assets
```

## Setup Instructions

### 1. Prerequisites

- Flutter SDK installed
- FlutterFlow account (or Flutter development environment)
- Access to the deployed `visaEligibility` function

### 2. Environment Variables

Set the following environment variables:

```bash
VISA_ELIGIBILITY_FUNCTION_URL=https://your-function-url.com/visaEligibility
IVISA_API_URL=https://api.ivisa.com/visa-options
IVISA_API_KEY=your-ivisa-api-key
```

### 3. Installation

```bash
# Clone or download the project
cd flutterflow_visa_options

# Install dependencies
flutter pub get

# Run the app
flutter run
```

## API Integration

The app integrates with the `visaEligibility` function that:

1. **Fetches iVisa data** from the iVisa API
2. **Merges with KITAS overrides** for Indonesia destinations
3. **Sorts options** by processing time then cost
4. **Caches results** for 24 hours in Firestore

## Usage

### Sample Request

```json
POST /visaEligibility
{
  "countryCode": "ID",
  "nationality": "US"
}
```

### Sample Response

```json
{
  "success": true,
  "data": [
    {
      "id": "kitas-family",
      "name": "KITAS Family Reunion",
      "type": "KITAS",
      "visaRequired": true,
      "processingTime": "10-20 business days",
      "processingTimeDays": 15,
      "cost": 1500000,
      "costCurrency": "IDR",
      "description": "Family reunion permit for spouses and children of KITAS holders",
      "requirements": [
        "Marriage certificate (for spouses)",
        "Birth certificate (for children)",
        "Sponsor's KITAS"
      ],
      "validity": "1 year (renewable)",
      "source": "Indonesian Immigration",
      "priority": 3
    }
  ],
  "message": "Visa eligibility options retrieved successfully",
  "cached": false
}
```

## UI Components

### Visa Options Screen

- **AppBar**: Title and navigation
- **Country Selection**: Dropdown for destination country
- **Nationality Input**: Text field for nationality
- **Search Button**: Triggers API call
- **Loading State**: Shows while fetching data
- **Results List**: Scrollable list of visa option cards

### Visa Option Card

- **Header**: Visa name and type badge
- **Processing Time**: Prominently displayed
- **Cost**: Currency and amount
- **Description**: Brief overview
- **Requirements**: Expandable list
- **Validity**: Duration information
- **Source**: Data source indicator

## Customization

### Colors

```dart
// Primary colors
primaryColor: Color(0xFF1976D2)
secondaryColor: Color(0xFF42A5F5)
accentColor: Color(0xFFFFC107)

// Status colors
successColor: Color(0xFF4CAF50)
warningColor: Color(0xFFFF9800)
errorColor: Color(0xFFF44336)
```

### Typography

```dart
// Headings
headingStyle: TextStyle(
  fontSize: 24,
  fontWeight: FontWeight.bold,
  color: Colors.grey[800]
)

// Body text
bodyStyle: TextStyle(
  fontSize: 16,
  color: Colors.grey[600]
)
```

## Testing

### Manual Testing

1. **Valid Input**: Test with valid country codes (e.g., "ID", "US")
2. **Invalid Input**: Test with invalid formats
3. **API Errors**: Test network failures and API errors
4. **Caching**: Verify cache behavior

### Test Cases

- ✅ US citizen → Indonesia (includes KITAS)
- ✅ Canadian citizen → Indonesia (includes KITAS)
- ✅ Any nationality → US (no KITAS)
- ✅ Invalid country code format
- ✅ Missing nationality
- ✅ Network timeout
- ✅ API rate limiting

## Deployment

### FlutterFlow

1. Import the project into FlutterFlow
2. Configure the API endpoint
3. Set environment variables
4. Deploy to your preferred platform

### Flutter

1. Build the app: `flutter build apk` or `flutter build ios`
2. Deploy to app stores or distribute directly

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check function URL
   - Verify network connectivity
   - Check CORS settings

2. **No KITAS Options**
   - Ensure destination is Indonesia (ID)
   - Check API response structure
   - Verify KITAS_OVERRIDES constant

3. **Sorting Issues**
   - Check processingTimeDays calculation
   - Verify cost parsing
   - Check priority values

### Debug Mode

Enable debug logging:

```dart
// In visa_service.dart
const bool DEBUG = true;

if (DEBUG) {
  print('API Response: ${response.data}');
}
```

## Contributing

1. Follow Flutter/Dart coding standards
2. Add tests for new functionality
3. Update documentation
4. Ensure UI consistency

## License

MIT License - see LICENSE file for details
