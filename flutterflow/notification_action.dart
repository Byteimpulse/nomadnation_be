import 'dart:convert';
import 'package:http/http.dart' as http;

/// FlutterFlow Custom Action: Send Notification
/// 
/// This action sends notifications via FCM push or SendGrid email fallback.
/// It calls the Cloud Function `sendNotification` endpoint.
/// 
/// Parameters:
/// - uid: User ID to send notification to
/// - title: Notification title
/// - body: Notification body text
/// - data: Optional additional data (Map<String, String>)
/// - imageUrl: Optional image URL for rich notifications
/// - priority: Notification priority ('normal' or 'high')
/// - cloudFunctionUrl: URL of the deployed Cloud Function
/// 
/// Returns:
/// - success: Boolean indicating if notification was sent
/// - message: Response message
/// - fcmSent: Boolean indicating if FCM push was sent
/// - emailSent: Boolean indicating if email was sent
/// - fcmMessageId: FCM message ID if sent
/// - emailMessageId: Email message ID if sent
/// - error: Error message if any

class NotificationResult {
  final bool success;
  final String message;
  final bool? fcmSent;
  final bool? emailSent;
  final String? fcmMessageId;
  final String? emailMessageId;
  final String? error;

  NotificationResult({
    required this.success,
    required this.message,
    this.fcmSent,
    this.emailSent,
    this.fcmMessageId,
    this.emailMessageId,
    this.error,
  });

  factory NotificationResult.fromJson(Map<String, dynamic> json) {
    return NotificationResult(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      fcmSent: json['fcmSent'],
      emailSent: json['emailSent'],
      fcmMessageId: json['fcmMessageId'],
      emailMessageId: json['emailMessageId'],
      error: json['error'],
    );
  }

  factory NotificationResult.error(String errorMessage) {
    return NotificationResult(
      success: false,
      message: 'Failed to send notification',
      error: errorMessage,
    );
  }
}

/// Main function to send notification
/// 
/// Usage in FlutterFlow:
/// 1. Create a custom action
/// 2. Add parameters: uid (String), title (String), body (String)
/// 3. Call this function
/// 4. Handle the result in your app logic
Future<NotificationResult> sendNotification({
  required String uid,
  required String title,
  required String body,
  Map<String, String>? data,
  String? imageUrl,
  String priority = 'normal',
  required String cloudFunctionUrl,
}) async {
  try {
    // Validate required parameters
    if (uid.isEmpty || title.isEmpty || body.isEmpty) {
      return NotificationResult.error('Missing required parameters: uid, title, body');
    }

    // Prepare request payload
    final Map<String, dynamic> payload = {
      'uid': uid,
      'title': title,
      'body': body,
      'priority': priority,
    };

    if (data != null) {
      payload['data'] = data;
    }

    if (imageUrl != null && imageUrl.isNotEmpty) {
      payload['imageUrl'] = imageUrl;
    }

    // Make HTTP request to Cloud Function
    final response = await http.post(
      Uri.parse(cloudFunctionUrl),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );

    // Parse response
    if (response.statusCode == 200) {
      final Map<String, dynamic> responseData = jsonDecode(response.body);
      return NotificationResult.fromJson(responseData);
    } else {
      // Handle HTTP errors
      String errorMessage = 'HTTP Error: ${response.statusCode}';
      try {
        final errorData = jsonDecode(response.body);
        errorMessage = errorData['error'] ?? errorData['message'] ?? errorMessage;
      } catch (e) {
        // If response body is not valid JSON, use status text
        errorMessage = 'HTTP Error: ${response.statusCode} - ${response.reasonPhrase}';
      }
      return NotificationResult.error(errorMessage);
    }

  } catch (e) {
    // Handle network or parsing errors
    return NotificationResult.error('Network error: ${e.toString()}');
  }
}

/// Convenience function for simple notifications
/// 
/// Usage in FlutterFlow:
/// await sendSimpleNotification(
///   uid: 'user123',
///   title: 'Hello!',
///   body: 'This is a test notification',
///   cloudFunctionUrl: 'https://your-function-url.com/sendNotification'
/// );
Future<NotificationResult> sendSimpleNotification({
  required String uid,
  required String title,
  required String body,
  required String cloudFunctionUrl,
}) async {
  return sendNotification(
    uid: uid,
    title: title,
    body: body,
    cloudFunctionUrl: cloudFunctionUrl,
  );
}

/// Function to send high priority notifications
/// 
/// Usage in FlutterFlow:
/// await sendHighPriorityNotification(
///   uid: 'user123',
///   title: 'Urgent!',
///   body: 'Important message',
///   cloudFunctionUrl: 'https://your-function-url.com/sendNotification'
/// );
Future<NotificationResult> sendHighPriorityNotification({
  required String uid,
  required String title,
  required String body,
  Map<String, String>? data,
  String? imageUrl,
  required String cloudFunctionUrl,
}) async {
  return sendNotification(
    uid: uid,
    title: title,
    body: body,
    data: data,
    imageUrl: imageUrl,
    priority: 'high',
    cloudFunctionUrl: cloudFunctionUrl,
  );
}

/// Function to send notifications with custom data
/// 
/// Usage in FlutterFlow:
/// await sendNotificationWithData(
///   uid: 'user123',
///   title: 'New Message',
///   body: 'You have a new message',
///   data: {'messageId': 'msg123', 'sender': 'John'},
///   cloudFunctionUrl: 'https://your-function-url.com/sendNotification'
/// );
Future<NotificationResult> sendNotificationWithData({
  required String uid,
  required String title,
  required String body,
  required Map<String, String> data,
  String? imageUrl,
  String priority = 'normal',
  required String cloudFunctionUrl,
}) async {
  return sendNotification(
    uid: uid,
    title: title,
    body: body,
    data: data,
    imageUrl: imageUrl,
    priority: priority,
    cloudFunctionUrl: cloudFunctionUrl,
  );
}

/// Example usage in FlutterFlow:
/// 
/// 1. Create a custom action in FlutterFlow
/// 2. Add the following code:
/// 
/// ```dart
/// // Send notification when button is pressed
/// final result = await sendSimpleNotification(
///   uid: currentUserUid,
///   title: 'Welcome!',
///   body: 'Thanks for using our app!',
///   cloudFunctionUrl: 'https://your-region-your-project.cloudfunctions.net/sendNotification'
/// );
/// 
/// if (result.success) {
///   // Show success message
///   ScaffoldMessenger.of(context).showSnackBar(
///     SnackBar(content: Text('Notification sent successfully!')),
///   );
/// } else {
///   // Show error message
///   ScaffoldMessenger.of(context).showSnackBar(
///     SnackBar(content: Text('Failed to send notification: ${result.error}')),
///   );
/// }
/// ```
/// 
/// 3. Make sure to add the http package to your pubspec.yaml:
/// ```yaml
/// dependencies:
///   http: ^1.1.0
/// ```
/// 
/// 4. Deploy your Cloud Function and update the cloudFunctionUrl parameter
/// 
/// 5. Test with both FCM tokens and email fallbacks to ensure both work correctly
