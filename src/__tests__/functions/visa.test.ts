import { jest } from '@jest/globals';
import { Request, Response } from '@google-cloud/functions-framework';
import axios from 'axios';
import { getVisaOptions } from '../../functions/visa';

// Mock modules
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('getVisaOptions', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockDoc: any;
  let mockCollection: any;
  let mockFirestore: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Firestore structure
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
    };

    mockFirestore = {
      collection: jest.fn(() => mockCollection),
    };

    // Mock request and response
    mockRequest = {
      method: 'POST',
      body: {
        countryCode: 'US',
        nationality: 'CA',
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };

    // Mock the firestore function to return our mock
    const admin = require('firebase-admin');
    admin.firestore = jest.fn(() => mockFirestore);
  });

  describe('Happy Path Tests', () => {
    it('should return visa options successfully for valid request', async () => {
      // Mock cache miss
      mockDoc.get.mockResolvedValue({ exists: false });

      // Mock successful API response
      const mockVisaData = {
        visaRequired: true,
        visaType: 'B1/B2',
        processingTime: '5-7 business days',
      };

      mockAxios.get.mockResolvedValue({
        data: mockVisaData,
        status: 200,
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockVisaData,
        message: 'Visa options retrieved successfully',
        cached: false,
      });

      expect(mockDoc.set).toHaveBeenCalledWith({
        data: mockVisaData,
        timestamp: expect.any(Object),
        hash: 'mocked-hash',
      });
    });

    it('should return cached data when valid cache exists', async () => {
      const mockCachedData = {
        data: { visaRequired: false, visaType: 'Visa Waiver' },
        timestamp: {
          toMillis: () => Date.now() - 1000 * 60 * 60, // 1 hour ago
        },
        hash: 'mocked-hash',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockCachedData,
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCachedData.data,
        message: 'Visa options retrieved from cache',
        cached: true,
      });

      // Should not call API or update cache
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cache is expired', async () => {
      const mockCachedData = {
        data: { visaRequired: false, visaType: 'Visa Waiver' },
        timestamp: {
          toMillis: () => Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        },
        hash: 'mocked-hash',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockCachedData,
      });

      const mockVisaData = {
        visaRequired: true,
        visaType: 'B1/B2',
        processingTime: '5-7 business days',
      };

      mockAxios.get.mockResolvedValue({
        data: mockVisaData,
        status: 200,
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockVisaData,
        message: 'Visa options retrieved successfully',
        cached: false,
      });

      expect(mockDoc.set).toHaveBeenCalledWith({
        data: mockVisaData,
        timestamp: expect.any(Object),
        hash: 'mocked-hash',
      });
    });
  });

  describe('Rate Limiting (429) Tests', () => {
    it('should retry and succeed after 429 response', async () => {
      // Mock cache miss
      mockDoc.get.mockResolvedValue({ exists: false });

      // Mock 429 then success
      mockAxios.get
        .mockRejectedValueOnce({
          response: { status: 429, statusText: 'Too Many Requests' },
        })
        .mockResolvedValueOnce({
          data: { visaRequired: true, visaType: 'B1/B2' },
          status: 200,
        });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { visaRequired: true, visaType: 'B1/B2' },
        message: 'Visa options retrieved successfully',
        cached: false,
      });
    });

    it('should fail after max retries for 429', async () => {
      // Mock cache miss
      mockDoc.get.mockResolvedValue({ exists: false });

      // Mock 429 responses for all retries
      mockAxios.get.mockRejectedValue({
        response: { status: 429, statusText: 'Too Many Requests' },
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockAxios.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get visa options',
        error: 'Max retries exceeded for rate limiting',
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should return 405 for non-POST requests', async () => {
      mockRequest.method = 'GET';

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(405);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Method not allowed. Use POST.',
        error: 'Method not allowed',
      });
    });

    it('should return 400 for missing countryCode', async () => {
      delete mockRequest.body.countryCode;

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields: countryCode, nationality',
        error: 'Missing required fields',
      });
    });

    it('should return 400 for missing nationality', async () => {
      delete mockRequest.body.nationality;

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields: countryCode, nationality',
        error: 'Missing required fields',
      });
    });

    it('should return 400 for invalid input types', async () => {
      mockRequest.body = {
        countryCode: 123,
        nationality: 'CA',
      };

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid input types. countryCode and nationality must be strings.',
        error: 'Invalid input types',
      });
    });

    it('should return 400 for invalid country code length', async () => {
      mockRequest.body = {
        countryCode: 'USA',
        nationality: 'CA',
      };

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'countryCode and nationality must be 2-character country codes.',
        error: 'Invalid country code format',
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock cache miss
      mockDoc.get.mockResolvedValue({ exists: false });

      // Mock API error
      mockAxios.get.mockRejectedValue({
        response: { status: 500, statusText: 'Internal Server Error' },
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get visa options',
        error: 'API Error: 500 - Internal Server Error',
      });
    });

    it('should handle network errors gracefully', async () => {
      // Mock cache miss
      mockDoc.get.mockResolvedValue({ exists: false });

      // Mock network error
      mockAxios.get.mockRejectedValue({
        request: {},
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get visa options',
        error: 'Network Error: No response received',
      });
    });

    it('should handle request errors gracefully', async () => {
      // Mock cache miss
      mockDoc.get.mockResolvedValue({ exists: false });

      // Mock request error
      mockAxios.get.mockRejectedValue({
        message: 'Request timeout',
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get visa options',
        error: 'Request Error: Request timeout',
      });
    });
  });

  describe('Input Validation Tests', () => {
    it('should accept valid 2-character country codes', async () => {
      const validCodes = ['US', 'CA', 'GB', 'FR', 'DE', 'JP', 'AU'];
      
      for (const countryCode of validCodes) {
        mockRequest.body = { countryCode, nationality: 'US' };
        
        // Mock cache miss and successful API response
        mockDoc.get.mockResolvedValue({ exists: false });
        mockAxios.get.mockResolvedValue({
          data: { visaRequired: false },
          status: 200,
        });

        await getVisaOptions(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: { visaRequired: false },
          message: 'Visa options retrieved successfully',
          cached: false,
        });
      }
    });

    it('should reject invalid country code formats', async () => {
      const invalidCodes = ['USA', 'CAN', 'United States', '123', 'A', ''];

      for (const countryCode of invalidCodes) {
        mockRequest.body = { countryCode, nationality: 'US' };

        await getVisaOptions(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'countryCode and nationality must be 2-character country codes.',
          error: 'Invalid country code format',
        });
      }
    });
  });

  describe('Cache Management Tests', () => {
    it('should use correct cache collection and document path', async () => {
      mockRequest.body = { countryCode: 'US', nationality: 'CA' };
      mockDoc.get.mockResolvedValue({ exists: false });
      mockAxios.get.mockResolvedValue({
        data: { visaRequired: true },
        status: 200,
      });

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockFirestore.collection).toHaveBeenCalledWith('visaCache');
      expect(mockCollection.doc).toHaveBeenCalledWith('mocked-hash');
    });

    it('should handle cache set errors gracefully', async () => {
      mockRequest.body = { countryCode: 'US', nationality: 'CA' };
      mockDoc.get.mockResolvedValue({ exists: false });
      mockAxios.get.mockResolvedValue({
        data: { visaRequired: true },
        status: 200,
      });

      // Mock cache set error
      mockDoc.set.mockRejectedValue(new Error('Cache write failed'));

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to get visa options',
        error: 'Cache write failed',
      });
    });
  });
});
