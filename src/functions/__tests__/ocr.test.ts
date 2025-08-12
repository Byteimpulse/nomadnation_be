import { processPassportImage, extractMRZFromImage, parseMRZData, saveToFirestore, sendToRetryQueue } from '../ocr';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { PubSub } from '@google-cloud/pubsub';

// Mock Google Cloud clients
jest.mock('@google-cloud/vision');
jest.mock('@google-cloud/firestore');
jest.mock('@google-cloud/storage');
jest.mock('@google-cloud/pubsub');

const mockVision = ImageAnnotatorClient as jest.MockedClass<typeof ImageAnnotatorClient>;
const mockFirestore = Firestore as jest.MockedClass<typeof Firestore>;
const mockStorage = Storage as jest.MockedClass<typeof Storage>;
const mockPubSub = PubSub as jest.MockedClass<typeof PubSub>;

describe('OCR Passport Function', () => {
  let mockVisionInstance: any;
  let mockFirestoreInstance: any;
  let mockStorageInstance: any;
  let mockPubSubInstance: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockVisionInstance = {
      textDetection: jest.fn()
    };
    mockVision.mockImplementation(() => mockVisionInstance);

    mockFirestoreInstance = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn()
    };
    mockFirestore.mockImplementation(() => mockFirestoreInstance);

    mockStorageInstance = {
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockReturnValue({
          download: jest.fn()
        })
      })
    };
    mockStorage.mockImplementation(() => mockStorageInstance);

    mockPubSubInstance = {
      topic: jest.fn().mockReturnValue({
        publish: jest.fn()
      })
    };
    mockPubSub.mockImplementation(() => mockPubSubInstance);
  });

  describe('parseMRZData', () => {
    it('should correctly parse valid MRZ lines', () => {
      const mrzLines = [
        'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
        'L898902C<3UTO6908061F9406236ZE184226B<<<<<14'
      ];

      const result = parseMRZData(mrzLines);

      expect(result).toEqual({
        documentType: 'P',
        countryCode: 'UTO',
        surname: 'ERIKSSON',
        givenNames: 'ANNA MARIA',
        documentNumber: 'L898902C',
        nationality: 'UTO',
        dateOfBirth: '690806',
        sex: 'F',
        dateOfExpiry: '940623',
        personalNumber: '6ZE184226B<<<<<1',
        checksum: '4'
      });
    });

    it('should handle MRZ lines with different lengths', () => {
      const mrzLines = [
        'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
        'L898902C<3UTO6908061F9406236ZE184226B<<<<<14'
      ];

      const result = parseMRZData(mrzLines);

      expect(result.documentType).toBe('P');
      expect(result.countryCode).toBe('UTO');
      expect(result.surname).toBe('ERIKSSON');
    });

    it('should throw error for invalid MRZ lines', () => {
      const invalidLines = ['INVALID', 'FORMAT'];

      expect(() => parseMRZData(invalidLines)).toThrow('Failed to parse MRZ data');
    });
  });

  describe('extractMRZFromImage', () => {
    it('should extract MRZ data from image with valid text', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      const mockTextDetection = {
        textAnnotations: [
          {
            description: `Some header text
            P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
            L898902C<3UTO6908061F9406236ZE184226B<<<<<14
            Some footer text`
          }
        ]
      };

      mockVisionInstance.textDetection.mockResolvedValue([mockTextDetection]);

      const result = await extractMRZFromImage(mockImageBuffer);

      expect(result.documentType).toBe('P');
      expect(result.countryCode).toBe('UTO');
      expect(result.surname).toBe('ERIKSSON');
      expect(mockVisionInstance.textDetection).toHaveBeenCalledWith({
        image: { content: mockImageBuffer.toString('base64') }
      });
    });

    it('should throw error when no text is detected', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      const mockTextDetection = { textAnnotations: [] };

      mockVisionInstance.textDetection.mockResolvedValue([mockTextDetection]);

      await expect(extractMRZFromImage(mockImageBuffer)).rejects.toThrow('No text detected in the image');
    });

    it('should throw error when MRZ lines are not found', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      const mockTextDetection = {
        textAnnotations: [
          {
            description: 'Some random text without MRZ format'
          }
        ]
      };

      mockVisionInstance.textDetection.mockResolvedValue([mockTextDetection]);

      await expect(extractMRZFromImage(mockImageBuffer)).rejects.toThrow('MRZ lines not found in passport image');
    });
  });

  describe('saveToFirestore', () => {
    it('should save MRZ data to Firestore successfully', async () => {
      const uid = 'user123';
      const docId = 'passport456';
      const mrzData = {
        documentType: 'P',
        countryCode: 'UTO',
        surname: 'ERIKSSON',
        givenNames: 'ANNA MARIA',
        documentNumber: 'L898902C',
        nationality: 'UTO',
        dateOfBirth: '690806',
        sex: 'F',
        dateOfExpiry: '940623',
        personalNumber: '6ZE184226B<<<<<1',
        checksum: '4'
      };

      mockFirestoreInstance.set.mockResolvedValue(undefined);

      await saveToFirestore(uid, docId, mrzData);

      expect(mockFirestoreInstance.collection).toHaveBeenCalledWith('passports');
      expect(mockFirestoreInstance.doc).toHaveBeenCalledWith(uid);
      expect(mockFirestoreInstance.doc).toHaveBeenCalledWith('documents');
      expect(mockFirestoreInstance.doc).toHaveBeenCalledWith(docId);
      expect(mockFirestoreInstance.set).toHaveBeenCalledWith({
        success: true,
        mrzData,
        timestamp: expect.any(String)
      });
    });

    it('should throw error when Firestore save fails', async () => {
      const uid = 'user123';
      const docId = 'passport456';
      const mrzData = {
        documentType: 'P',
        countryCode: 'UTO',
        surname: 'ERIKSSON',
        givenNames: 'ANNA MARIA',
        documentNumber: 'L898902C',
        nationality: 'UTO',
        dateOfBirth: '690806',
        sex: 'F',
        dateOfExpiry: '940623',
        personalNumber: '6ZE184226B<<<<<1',
        checksum: '4'
      };

      mockFirestoreInstance.set.mockRejectedValue(new Error('Firestore error'));

      await expect(saveToFirestore(uid, docId, mrzData)).rejects.toThrow('Failed to save to Firestore: Firestore error');
    });
  });

  describe('sendToRetryQueue', () => {
    it('should send message to retry queue successfully', async () => {
      const storageEvent = {
        bucket: 'test-bucket',
        name: 'user123/passport456.jpg',
        contentType: 'image/jpeg',
        size: '1024',
        timeCreated: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      };
      const error = new Error('Processing failed');

      mockPubSubInstance.topic.mockReturnValue({
        publish: jest.fn().mockResolvedValue('message-id-123')
      });

      await sendToRetryQueue(storageEvent, error);

      expect(mockPubSubInstance.topic).toHaveBeenCalledWith('ocr-retry-topic');
      expect(mockPubSubInstance.topic().publish).toHaveBeenCalledWith(
        expect.any(Buffer)
      );
    });

    it('should not throw error when Pub/Sub fails', async () => {
      const storageEvent = {
        bucket: 'test-bucket',
        name: 'user123/passport456.jpg',
        contentType: 'image/jpeg',
        size: '1024',
        timeCreated: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      };
      const error = new Error('Processing failed');

      mockPubSubInstance.topic.mockReturnValue({
        publish: jest.fn().mockRejectedValue(new Error('Pub/Sub error'))
      });

      // Should not throw
      await expect(sendToRetryQueue(storageEvent, error)).resolves.toBeUndefined();
    });
  });

  describe('processPassportImage', () => {
    it('should process passport image successfully', async () => {
      const mockCloudEvent = {
        data: {
          bucket: 'test-bucket',
          name: 'user123/passport456.jpg',
          contentType: 'image/jpeg',
          size: '1024',
          timeCreated: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }
      };

      const mockImageBuffer = Buffer.from('mock-image-data');
      const mockTextDetection = {
        textAnnotations: [
          {
            description: `Some header text
            P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
            L898902C<3UTO6908061F9406236ZE184226B<<<<<14
            Some footer text`
          }
        ]
      };

      // Mock storage download
      mockStorageInstance.bucket().file().download.mockResolvedValue([mockImageBuffer]);

      // Mock vision API
      mockVisionInstance.textDetection.mockResolvedValue([mockTextDetection]);

      // Mock Firestore save
      mockFirestoreInstance.set.mockResolvedValue(undefined);

      const result = await processPassportImage(mockCloudEvent as any);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Passport image processed successfully');
      expect(result.data).toBeDefined();
      expect(result.data.documentType).toBe('P');
      expect(result.data.surname).toBe('ERIKSSON');
    });

    it('should handle invalid file type', async () => {
      const mockCloudEvent = {
        data: {
          bucket: 'test-bucket',
          name: 'user123/document.pdf',
          contentType: 'application/pdf',
          size: '1024',
          timeCreated: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }
      };

      await expect(processPassportImage(mockCloudEvent as any)).rejects.toThrow('Invalid file type: application/pdf. Expected image file.');
    });

    it('should handle invalid file path format', async () => {
      const mockCloudEvent = {
        data: {
          bucket: 'test-bucket',
          name: 'invalid-path',
          contentType: 'image/jpeg',
          size: '1024',
          timeCreated: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }
      };

      await expect(processPassportImage(mockCloudEvent as any)).rejects.toThrow('Invalid file path format: invalid-path');
    });

    it('should send to retry queue on processing error', async () => {
      const mockCloudEvent = {
        data: {
          bucket: 'test-bucket',
          name: 'user123/passport456.jpg',
          contentType: 'image/jpeg',
          size: '1024',
          timeCreated: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }
      };

      // Mock storage download to fail
      mockStorageInstance.bucket().file().download.mockRejectedValue(new Error('Download failed'));

      // Mock Pub/Sub
      mockPubSubInstance.topic.mockReturnValue({
        publish: jest.fn().mockResolvedValue('message-id-123')
      });

      await expect(processPassportImage(mockCloudEvent as any)).rejects.toThrow('Download failed');

      // Should have sent to retry queue
      expect(mockPubSubInstance.topic).toHaveBeenCalledWith('ocr-retry-topic');
    });
  });
});
