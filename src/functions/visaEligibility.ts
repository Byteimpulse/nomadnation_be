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

interface VisaEligibilityRequest {
  countryCode: string;
  nationality: string;
}

interface VisaEligibilityResponse {
  success: boolean;
  data?: VisaOption[];
  message: string;
  cached?: boolean;
  error?: string;
}

interface VisaOption {
  id: string;
  name: string;
  type: 'iVisa' | 'KITAS';
  visaRequired: boolean;
  processingTime: string;
  processingTimeDays: number;
  cost: number;
  costCurrency: string;
  description: string;
  requirements: string[];
  validity: string;
  source: string;
  priority: number;
}

interface CachedVisaData {
  data: VisaOption[];
  timestamp: admin.firestore.Timestamp;
  hash: string;
}

// Static KITAS overrides for Indonesia
const KITAS_OVERRIDES: VisaOption[] = [
  {
    id: 'kitas-work',
    name: 'KITAS Work Permit',
    type: 'KITAS',
    visaRequired: true,
    processingTime: '15-30 business days',
    processingTimeDays: 22,
    cost: 2500000, // IDR
    costCurrency: 'IDR',
    description: 'Work permit for foreign nationals employed in Indonesia',
    requirements: [
      'Valid passport with minimum 18 months validity',
      'Employment contract from Indonesian company',
      'Educational certificates (minimum Bachelor degree)',
      'Health certificate',
      'Police clearance certificate',
      'Company sponsorship letter'
    ],
    validity: '1 year (renewable)',
    source: 'Indonesian Immigration',
    priority: 1
  },
  {
    id: 'kitas-investment',
    name: 'KITAS Investment',
    type: 'KITAS',
    visaRequired: true,
    processingTime: '20-35 business days',
    processingTimeDays: 27,
    cost: 5000000, // IDR
    costCurrency: 'IDR',
    description: 'Investment permit for foreign investors in Indonesia',
    requirements: [
      'Minimum investment of USD 1,000,000',
      'Business plan approved by BKPM',
      'Valid passport with minimum 18 months validity',
      'Health certificate',
      'Police clearance certificate',
      'Bank statement showing investment funds'
    ],
    validity: '2 years (renewable)',
    source: 'Indonesian Immigration',
    priority: 2
  },
  {
    id: 'kitas-family',
    name: 'KITAS Family Reunion',
    type: 'KITAS',
    visaRequired: true,
    processingTime: '10-20 business days',
    processingTimeDays: 15,
    cost: 1500000, // IDR
    costCurrency: 'IDR',
    description: 'Family reunion permit for spouses and children of KITAS holders',
    requirements: [
      'Marriage certificate (for spouses)',
      'Birth certificate (for children)',
      'Sponsor\'s KITAS',
      'Valid passport with minimum 18 months validity',
      'Health certificate',
      'Proof of relationship'
    ],
    validity: '1 year (renewable)',
    source: 'Indonesian Immigration',
    priority: 3
  },
  {
    id: 'kitas-student',
    name: 'KITAS Student',
    type: 'KITAS',
    visaRequired: true,
    processingTime: '12-25 business days',
    processingTimeDays: 18,
    cost: 2000000, // IDR
    costCurrency: 'IDR',
    description: 'Student permit for foreign students studying in Indonesia',
    requirements: [
      'Acceptance letter from Indonesian educational institution',
      'Valid passport with minimum 18 months validity',
      'Educational certificates',
      'Health certificate',
      'Financial guarantee letter',
      'Study plan'
    ],
    validity: '1 year (renewable)',
    source: 'Indonesian Immigration',
    priority: 4
  }
];

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
 * Fetch visa options from iVisa API with retry logic
 */
async function fetchIVisaOptions(
  countryCode: string, 
  nationality: string, 
  retryCount: number = 0
): Promise<VisaOption[]> {
  try {
    // This would be replaced with the actual iVisa API endpoint
    const apiUrl = process.env['IVISA_API_URL'] || 'https://api.ivisa.com/visa-options';
    const apiKey = process.env['IVISA_API_KEY'];
    
    const response: AxiosResponse = await axios.get(apiUrl, {
      params: {
        countryCode,
        nationality,
        apiKey
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'VisaEligibilityFunction/1.0',
        'Accept': 'application/json'
      }
    });

    // Transform iVisa API response to our VisaOption format
    const iVisaOptions = response.data.visaOptions || [];
    return iVisaOptions.map((option: any, index: number) => ({
      id: `ivisa-${option.id || index}`,
      name: option.visaType || option.name || 'iVisa Option',
      type: 'iVisa',
      visaRequired: option.visaRequired !== false,
      processingTime: option.processingTime || '5-7 business days',
      processingTimeDays: parseProcessingTime(option.processingTime || '5-7 business days'),
      cost: parseCost(option.cost || '0'),
      costCurrency: option.currency || 'USD',
      description: option.description || 'Visa option from iVisa',
      requirements: option.requirements || ['Valid passport', 'Completed application form'],
      validity: option.validity || '90 days',
      source: 'iVisa',
      priority: 100 + index // Lower priority than KITAS options
    }));

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
        
        return fetchIVisaOptions(countryCode, nationality, retryCount + 1);
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
 * Parse processing time string to number of days for sorting
 */
function parseProcessingTime(processingTime: string): number {
  const timeStr = processingTime.toLowerCase();
  
  // Extract numbers and convert to days
  if (timeStr.includes('hour')) {
    const hours = parseInt(timeStr.match(/(\d+)/)?.[1] || '0');
    return Math.ceil(hours / 24);
  } else if (timeStr.includes('day')) {
    const days = parseInt(timeStr.match(/(\d+)/)?.[1] || '0');
    return days;
  } else if (timeStr.includes('week')) {
    const weeks = parseInt(timeStr.match(/(\d+)/)?.[1] || '0');
    return weeks * 7;
  } else if (timeStr.includes('month')) {
    const months = parseInt(timeStr.match(/(\d+)/)?.[1] || '0');
    return months * 30;
  }
  
  return 7; // Default to 7 days if parsing fails
}

/**
 * Parse cost string to number for sorting
 */
function parseCost(cost: string | number): number {
  if (typeof cost === 'number') return cost;
  
  const costStr = cost.toString();
  const match = costStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  
  return 0;
}

/**
 * Merge iVisa options with KITAS overrides and sort by priority
 */
function mergeAndSortVisaOptions(
  iVisaOptions: VisaOption[], 
  countryCode: string
): VisaOption[] {
  let allOptions = [...iVisaOptions];
  
  // Add KITAS overrides if destination is Indonesia
  if (countryCode.toUpperCase() === 'ID') {
    allOptions = [...allOptions, ...KITAS_OVERRIDES];
  }
  
  // Sort by processing time (ascending), then by cost (ascending)
  return allOptions.sort((a, b) => {
    // First sort by processing time
    if (a.processingTimeDays !== b.processingTimeDays) {
      return a.processingTimeDays - b.processingTimeDays;
    }
    
    // Then sort by cost
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    
    // Finally sort by priority (lower number = higher priority)
    return a.priority - b.priority;
  });
}

/**
 * Get visa eligibility options with merged data and caching
 */
export const visaEligibility = async (
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
    const { countryCode, nationality }: VisaEligibilityRequest = req.body;

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

    console.log(`Getting visa eligibility for country: ${countryCode}, nationality: ${nationality}`);

    // Generate cache hash
    const cacheHash = generateCacheHash(countryCode, nationality);
    const cacheRef = db.collection('visaEligibilityCache').doc(cacheHash);

    // Check cache first
    const cachedDoc = await cacheRef.get();
    if (cachedDoc.exists) {
      const cachedData = cachedDoc.data() as CachedVisaData;
      
      if (isCacheValid(cachedData.timestamp)) {
        console.log('Returning cached visa eligibility data');
        const response: VisaEligibilityResponse = {
          success: true,
          data: cachedData.data,
          message: 'Visa eligibility options retrieved from cache',
          cached: true
        };
        res.status(200).json(response);
        return;
      } else {
        console.log('Cached data expired, fetching fresh data');
      }
    }

    // Fetch fresh data from iVisa API
    console.log('Fetching fresh visa eligibility data from iVisa API');
    const iVisaOptions = await fetchIVisaOptions(countryCode, nationality);

    // Merge with KITAS overrides and sort
    const mergedOptions = mergeAndSortVisaOptions(iVisaOptions, countryCode);

    // Cache the result
    const cacheData: CachedVisaData = {
      data: mergedOptions,
      timestamp: admin.firestore.Timestamp.now(),
      hash: cacheHash
    };

    await cacheRef.set(cacheData);

    // Return the response
    const response: VisaEligibilityResponse = {
      success: true,
      data: mergedOptions,
      message: 'Visa eligibility options retrieved successfully',
      cached: false
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error getting visa eligibility:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const response: VisaEligibilityResponse = {
      success: false,
      message: 'Failed to get visa eligibility options',
      error: errorMessage
    };

    res.status(500).json(response);
  }
};
