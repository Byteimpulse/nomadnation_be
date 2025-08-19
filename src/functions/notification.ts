import { Request, Response } from '@google-cloud/functions-framework';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

// Import Firebase service account key
const serviceAccount = require(path.join(__dirname, '../../firebase-adminsdk.json'));

// Initialize Firebase Admin SDK for FCM
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  throw error;
}

// Initialize SendGrid
sgMail.setApiKey(process.env['SENDGRID_API_KEY'] || '');

// Environment variables
const FROM_EMAIL = process.env['SENDGRID_FROM_EMAIL'] || 'noreply@yourdomain.com';
const FROM_NAME = process.env['SENDGRID_FROM_NAME'] || 'Your App Name';

interface NotificationRequest {
  uid: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  priority?: 'normal' | 'high';
}

interface NotificationResponse {
  success: boolean;
  message: string;
  fcmSent?: boolean;
  emailSent?: boolean;
  fcmMessageId?: string;
  emailMessageId?: string;
  error?: string;
}

interface UserDevice {
  uid: string;
  fcmToken?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  lastSeen?: Date;
}

/**
 * Cloud Function to send notifications via FCM push or SendGrid email fallback
 * Accepts {uid, title, body} and sends push notification (or email if no FCM token)
 */
export const sendNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        message: 'Method not allowed. Use POST.',
        error: 'Method not allowed'
      });
      return;
    }

    // Validate request body
    const { uid, title, body, data, imageUrl, priority }: NotificationRequest = req.body;

    if (!uid || !title || !body) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: uid, title, body',
        error: 'Missing required fields'
      });
      return;
    }

    console.log(`Sending notification to user ${uid}: ${title} - ${body}`);

    // Get user device information from Firestore
    const userDevice = await getUserDeviceInfo(uid);
    
    if (!userDevice) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User not found'
      });
      return;
    }

    const response: NotificationResponse = {
      success: true,
      message: 'Notification sent successfully'
    };

    // Try to send FCM push notification if token exists
    if (userDevice.fcmToken) {
      try {
        const fcmResult = await sendFCMPushNotification(
          userDevice.fcmToken,
          title,
          body,
          data,
          imageUrl,
          priority
        );
        
        response.fcmSent = true;
        response.fcmMessageId = fcmResult.messageId;
        console.log(`FCM push notification sent successfully: ${fcmResult.messageId}`);
        
      } catch (fcmError) {
        console.error('FCM push notification failed:', fcmError);
        response.fcmSent = false;
        response.error = `FCM failed: ${(fcmError as Error).message}`;
      }
    } else {
      response.fcmSent = false;
      console.log(`No FCM token found for user ${uid}, skipping push notification`);
    }

    // Send email fallback if FCM failed or no token
    if (!response.fcmSent && userDevice.email) {
      try {
        const emailResult = await sendEmailNotification(
          userDevice.email,
          userDevice.firstName || userDevice.uid,
          title,
          body,
          data
        );
        
        response.emailSent = true;
        response.emailMessageId = emailResult.messageId;
        console.log(`Email notification sent successfully: ${emailResult.messageId}`);
        
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        response.emailSent = false;
        response.error = response.error 
          ? `${response.error}; Email failed: ${(emailError as Error).message}`
          : `Email failed: ${(emailError as Error).message}`;
      }
    }

    // Check if at least one notification method succeeded
    if (!response.fcmSent && !response.emailSent) {
      response.success = false;
      response.message = 'Failed to send notification via any method';
      res.status(500).json(response);
      return;
    }

    // Update user's last notification timestamp
    await updateUserNotificationTimestamp(uid);

    res.status(200).json(response);

  } catch (error) {
    console.error('Error sending notification:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message
    });
  }
};

/**
 * Get user device information from Firestore
 */
async function getUserDeviceInfo(uid: string): Promise<UserDevice | null> {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    return {
      uid,
      fcmToken: userData?.['fcmToken'],
      email: userData?.['email'],
      firstName: userData?.['firstName'],
      lastName: userData?.['lastName'],
      lastSeen: userData?.['lastSeen']?.toDate()
    };
    
  } catch (error) {
    console.error('Error getting user device info:', error);
    throw new Error(`Failed to get user device info: ${(error as Error).message}`);
  }
}

/**
 * Send FCM push notification
 */
async function sendFCMPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string,
  priority: 'normal' | 'high' = 'normal'
): Promise<{ messageId: string }> {
  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl })
      },
      ...(data && { data }),
      android: {
        priority: priority === 'high' ? 'high' : 'normal',
        notification: {
          priority: priority === 'high' ? 'high' : 'default',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        },
        headers: {
          'apns-priority': priority === 'high' ? '10' : '5'
        }
      },
      webpush: {
        notification: {
          icon: '/icon.png',
          badge: '/badge.png',
          vibrate: [100, 50, 100],
          ...(data && { data })
        }
      }
    };

    const response = await admin.messaging().send(message);
    
    return { messageId: response };
    
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    throw new Error(`FCM notification failed: ${(error as Error).message}`);
  }
}

/**
 * Send email notification via SendGrid
 */
async function sendEmailNotification(
  email: string,
  firstName: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ messageId: string }> {
  try {
    const msg = {
      to: email,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: title,
      templateId: 'd-your-template-id', // Optional: Use SendGrid template
      dynamicTemplateData: {
        firstName,
        title,
        body,
        data: data || {},
        timestamp: new Date().toISOString()
      },
      // Fallback to simple HTML if no template
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${body}</p>
          ${data ? `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h4 style="margin-top: 0;">Additional Information:</h4>
              ${Object.entries(data).map(([key, value]) => 
                `<p><strong>${key}:</strong> ${value}</p>`
              ).join('')}
            </div>
          ` : ''}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            Sent at ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    const response = await sgMail.send(msg);
    
    return { messageId: response[0]?.headers['x-message-id'] || 'unknown' };
    
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw new Error(`Email notification failed: ${(error as Error).message}`);
  }
}

/**
 * Update user's last notification timestamp
 */
async function updateUserNotificationTimestamp(uid: string): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({
      lastNotificationSent: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating notification timestamp:', error);
    // Don't throw error as this is not critical
  }
}

export { 
  getUserDeviceInfo, 
  sendFCMPushNotification, 
  sendEmailNotification, 
  updateUserNotificationTimestamp 
};
