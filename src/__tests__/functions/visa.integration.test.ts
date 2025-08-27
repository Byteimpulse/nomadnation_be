import { jest } from '@jest/globals';
import { Request, Response } from '@google-cloud/functions-framework';
import { getVisaOptions } from '../../functions/visa';

describe('getVisaOptions Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

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
  });

  describe('Input Validation', () => {
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

    it('should accept valid 2-character country codes', async () => {
      const validCodes = ['US', 'CA', 'GB', 'FR', 'DE', 'JP', 'AU'];
      
      for (const countryCode of validCodes) {
        mockRequest.body = { countryCode, nationality: 'US' };

        await getVisaOptions(mockRequest as Request, mockResponse as Response);

        // Should not return validation errors for valid codes
        expect(mockResponse.status).not.toHaveBeenCalledWith(400);
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

  describe('Response Structure', () => {
    it('should return proper error response structure', async () => {
      mockRequest.method = 'GET';

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      const mockJson = mockResponse.json as jest.Mock;
      expect(mockJson).toHaveBeenCalled();
      
      // Verify that the function called json() with the expected structure
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
          error: expect.any(String)
        })
      );
    });

    it('should return proper validation error structure', async () => {
      delete mockRequest.body.countryCode;

      await getVisaOptions(mockRequest as Request, mockResponse as Response);

      const mockJson = mockResponse.json as jest.Mock;
      expect(mockJson).toHaveBeenCalled();
      
      // Verify that the function called json() with the expected structure
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Missing required fields'),
          error: 'Missing required fields'
        })
      );
    });
  });
});
