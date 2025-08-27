import { Request, Response } from '@google-cloud/functions-framework';
import * as admin from 'firebase-admin';
import axios, { AxiosResponse, AxiosError } from 'axios';
import { config } from 'dotenv';
import * as crypto from 'crypto';

// Load environment variables
config();

// Initialize Firebase Admin SDK
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  throw error;
}

const db = admin.firestore();

// Configuration
const CACHE_DURATION_HOURS = 24;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 10000;

interface VisaOptionsRequest {
  countryCode: string;
  nationality: string;
}

interface VisaOptionsResponse {
  success: boolean;
  data?: any;
  message: string;
  cached?: boolean;
  error?: string;
}

interface CachedVisaData {
  data: any;
  timestamp: admin.firestore.Timestamp;
  hash: string;
}

/**
 * Generate a hash for caching based on country code and nationality
 */
function generateCacheHash(countryCode: string, nationality: string): string {
  const data = `${countryCode.toLowerCase()}-${nationality.toLowerCase()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: admin.firestore.Timestamp): boolean {
  const now = admin.firestore.Timestamp.now();
  const cacheAge = now.toMillis() - timestamp.toMillis();
  const maxAgeMs = CACHE_DURATION_HOURS * 60 * 60 * 1000;
  return cacheAge < maxAgeMs;
}

/**
 * Get visa options from external API with retry logic
 */
async function fetchVisaOptions(
  countryCode: string, 
  nationality: string, 
  retryCount: number = 0
): Promise<any> {
  try {
    // This would be replaced with the actual visa API endpoint
    const apiUrl = process.env['VISA_API_URL'] || 'https://api.example.com/visa-options';
    const apiKey = process.env['VISA_API_KEY'];
    
    const response: AxiosResponse = await axios.get(apiUrl, {
      params: {
        countryCode,
        nationality,
        apiKey
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'VisaOptionsFunction/1.0',
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Handle rate limiting (429)
    if (axiosError.response?.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(
          BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
          MAX_RETRY_DELAY_MS
        );
        
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return fetchVisaOptions(countryCode, nationality, retryCount + 1);
      } else {
        throw new Error('Max retries exceeded for rate limiting');
      }
    }
    
    // Handle other errors
    if (axiosError.response) {
      throw new Error(`API Error: ${axiosError.response.status} - ${axiosError.response.statusText}`);
    } else if (axiosError.request) {
      throw new Error('Network Error: No response received');
    } else {
      throw new Error(`Request Error: ${axiosError.message}`);
    }
  }
}

/**
 * Get visa options with caching
 */
export const getVisaOptions = async (
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
    const { countryCode, nationality }: VisaOptionsRequest = req.body;

    if (!countryCode || !nationality) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: countryCode, nationality',
        error: 'Missing required fields'
      });
      return;
    }

    // Validate input format
    if (typeof countryCode !== 'string' || typeof nationality !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Invalid input types. countryCode and nationality must be strings.',
        error: 'Invalid input types'
      });
      return;
    }

    if (countryCode.length !== 2 || nationality.length !== 2) {
      res.status(400).json({
        success: false,
        message: 'countryCode and nationality must be 2-character country codes.',
        error: 'Invalid country code format'
      });
      return;
    }

    console.log(`Getting visa options for country: ${countryCode}, nationality: ${nationality}`);

    // Generate cache hash
    const cacheHash = generateCacheHash(countryCode, nationality);
    const cacheRef = db.collection('visaCache').doc(cacheHash);

    // Check cache first
    const cachedDoc = await cacheRef.get();
    if (cachedDoc.exists) {
      const cachedData = cachedDoc.data() as CachedVisaData;
      
      if (isCacheValid(cachedData.timestamp)) {
        console.log('Returning cached visa data');
        const response: VisaOptionsResponse = {
          success: true,
          data: cachedData.data,
          message: 'Visa options retrieved from cache',
          cached: true
        };
        res.status(200).json(response);
        return;
      } else {
        console.log('Cached data expired, fetching fresh data');
      }
    }

    // Fetch fresh data from API
    console.log('Fetching fresh visa data from API');
    const visaData = await fetchVisaOptions(countryCode, nationality);

    // Cache the result
    const cacheData: CachedVisaData = {
      data: visaData,
      timestamp: admin.firestore.Timestamp.now(),
      hash: cacheHash
    };

    await cacheRef.set(cacheData);

    // Return the response
    const response: VisaOptionsResponse = {
      success: true,
      data: visaData,
      message: 'Visa options retrieved successfully',
      cached: false
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error getting visa options:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const response: VisaOptionsResponse = {
      success: false,
      message: 'Failed to get visa options',
      error: errorMessage
    };

    res.status(500).json(response);
  }
};
