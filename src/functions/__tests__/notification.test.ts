import { sendNotification, getUserDeviceInfo, sendFCMPushNotification, sendEmailNotification, updateUserNotificationTimestamp } from '../notification';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

// Mock Firebase Admin and SendGrid
jest.mock('firebase-admin');
jest.mock('@sendgrid/mail');

const mockAdmin = admin as jest.Mocked<typeof admin>;
const mockSgMail = sgMail as jest.Mocked<typeof sgMail>;

describe('Notification Service', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockFirestore: any;
  let mockMessaging: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      method: 'POST',
      body: {
        uid: 'user123',
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { key: 'value' },
        priority: 'normal'
      }
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn(),
      update: jest.fn()
    };

    // Setup mock Messaging
    mockMessaging = {
      send: jest.fn()
    };

    // Setup mock Firebase app
    mockAdmin.apps = [];
    mockAdmin.initializeApp = jest.fn();
    mockAdmin.app = jest.fn().mockReturnValue({
      firestore: () => mockFirestore,
      messaging: () => mockMessaging
    });

    // Setup mock SendGrid
    mockSgMail.setApiKey = jest.fn();
    mockSgMail.send = jest.fn();
  });

  describe('sendNotification', () => {
    it('should send FCM push notification successfully', async () => {
      // Mock user device info with FCM token
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({
          fcmToken: 'fcm-token-123',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe'
        })
      });

      // Mock FCM success
      mockMessaging.send.mockResolvedValue('fcm-message-id-123');

      // Mock Firestore update
      mockFirestore.update.mockResolvedValue(undefined);

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification sent successfully',
        fcmSent: true,
        fcmMessageId: 'fcm-message-id-123',
        emailSent: false
      });
    });

    it('should send email fallback when FCM fails', async () => {
      // Mock user device info with FCM token
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({
          fcmToken: 'fcm-token-123',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe'
        })
      });

      // Mock FCM failure
      mockMessaging.send.mockRejectedValue(new Error('FCM failed'));

      // Mock SendGrid success
      mockSgMail.send.mockResolvedValue([{
        headers: { 'x-message-id': 'email-message-id-123' }
      }]);

      // Mock Firestore update
      mockFirestore.update.mockResolvedValue(undefined);

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification sent successfully',
        fcmSent: false,
        emailSent: true,
        emailMessageId: 'email-message-id-123',
        error: 'FCM failed: FCM failed'
      });
    });

    it('should send email when no FCM token exists', async () => {
      // Mock user device info without FCM token
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe'
        })
      });

      // Mock SendGrid success
      mockSgMail.send.mockResolvedValue([{
        headers: { 'x-message-id': 'email-message-id-123' }
      }]);

      // Mock Firestore update
      mockFirestore.update.mockResolvedValue(undefined);

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification sent successfully',
        fcmSent: false,
        emailSent: true,
        emailMessageId: 'email-message-id-123'
      });
    });

    it('should return error for invalid request method', async () => {
      mockRequest.method = 'GET';

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(405);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Method not allowed. Use POST.',
        error: 'Method not allowed'
      });
    });

    it('should return error for missing required fields', async () => {
      mockRequest.body = { uid: 'user123' }; // Missing title and body

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields: uid, title, body',
        error: 'Missing required fields'
      });
    });

    it('should return error when user not found', async () => {
      mockFirestore.get.mockResolvedValue({
        exists: false
      });

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        error: 'User not found'
      });
    });

    it('should return error when both FCM and email fail', async () => {
      // Mock user device info
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({
          fcmToken: 'fcm-token-123',
          email: 'user@example.com'
        })
      });

      // Mock both FCM and email failure
      mockMessaging.send.mockRejectedValue(new Error('FCM failed'));
      mockSgMail.send.mockRejectedValue(new Error('Email failed'));

      await sendNotification(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to send notification via any method',
        fcmSent: false,
        emailSent: false,
        error: 'FCM failed: FCM failed; Email failed: Email failed'
      });
    });
  });

  describe('getUserDeviceInfo', () => {
    it('should return user device info successfully', async () => {
      const mockUserData = {
        fcmToken: 'fcm-token-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        lastSeen: { toDate: () => new Date('2024-01-01') }
      };

      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => mockUserData
      });

      const result = await getUserDeviceInfo('user123');

      expect(result).toEqual({
        uid: 'user123',
        fcmToken: 'fcm-token-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        lastSeen: new Date('2024-01-01')
      });
    });

    it('should return null when user does not exist', async () => {
      mockFirestore.get.mockResolvedValue({
        exists: false
      });

      const result = await getUserDeviceInfo('user123');

      expect(result).toBeNull();
    });

    it('should handle Firestore errors', async () => {
      mockFirestore.get.mockRejectedValue(new Error('Firestore error'));

      await expect(getUserDeviceInfo('user123')).rejects.toThrow('Failed to get user device info: Firestore error');
    });
  });

  describe('sendFCMPushNotification', () => {
    it('should send FCM notification successfully', async () => {
      mockMessaging.send.mockResolvedValue('fcm-message-id-123');

      const result = await sendFCMPushNotification(
        'fcm-token-123',
        'Test Title',
        'Test Body',
        { key: 'value' },
        'https://example.com/image.jpg',
        'high'
      );

      expect(result.messageId).toBe('fcm-message-id-123');
      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'fcm-token-123',
          notification: {
            title: 'Test Title',
            body: 'Test Body',
            imageUrl: 'https://example.com/image.jpg'
          },
          data: { key: 'value' },
          android: {
            priority: 'high',
            notification: {
              priority: 'high',
              defaultSound: true,
              defaultVibrateTimings: true
            }
          }
        })
      );
    });

    it('should handle FCM errors', async () => {
      mockMessaging.send.mockRejectedValue(new Error('FCM error'));

      await expect(sendFCMPushNotification(
        'fcm-token-123',
        'Test Title',
        'Test Body'
      )).rejects.toThrow('FCM notification failed: FCM error');
    });
  });

  describe('sendEmailNotification', () => {
    it('should send email notification successfully', async () => {
      mockSgMail.send.mockResolvedValue([{
        headers: { 'x-message-id': 'email-message-id-123' }
      }]);

      const result = await sendEmailNotification(
        'user@example.com',
        'John',
        'Test Title',
        'Test Body',
        { key: 'value' }
      );

      expect(result.messageId).toBe('email-message-id-123');
      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Title',
          dynamicTemplateData: {
            firstName: 'John',
            title: 'Test Title',
            body: 'Test Body',
            data: { key: 'value' },
            timestamp: expect.any(String)
          }
        })
      );
    });

    it('should handle SendGrid errors', async () => {
      mockSgMail.send.mockRejectedValue(new Error('SendGrid error'));

      await expect(sendEmailNotification(
        'user@example.com',
        'John',
        'Test Title',
        'Test Body'
      )).rejects.toThrow('Email notification failed: SendGrid error');
    });
  });

  describe('updateUserNotificationTimestamp', () => {
    it('should update timestamp successfully', async () => {
      mockFirestore.update.mockResolvedValue(undefined);

      await updateUserNotificationTimestamp('user123');

      expect(mockFirestore.update).toHaveBeenCalledWith({
        lastNotificationSent: expect.any(Object)
      });
    });

    it('should not throw error on failure', async () => {
      mockFirestore.update.mockRejectedValue(new Error('Update failed'));

      // Should not throw
      await expect(updateUserNotificationTimestamp('user123')).resolves.toBeUndefined();
    });
  });
});
