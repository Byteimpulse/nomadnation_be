import { CloudEvent } from '@google-cloud/functions-framework';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { PubSub } from '@google-cloud/pubsub';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Google Cloud clients
const vision = new ImageAnnotatorClient();
const firestore = new Firestore();
const storage = new Storage();
const pubsub = new PubSub();

// Environment variables
// const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const COLLECTION_NAME = process.env['FIRESTORE_COLLECTION_PASSPORTS'] || 'passports';
// const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME;
const TOPIC_NAME = process.env['PUBSUB_TOPIC_NAME'] || 'ocr-retry-topic';

interface StorageEvent {
  bucket: string;
  name: string;
  contentType: string;
  size: string;
  timeCreated: string;
  updated: string;
}

interface PassportMRZ {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  dateOfExpiry: string;
  personalNumber: string;
  checksum: string;
}

interface ProcessedResult {
  success: boolean;
  mrzData?: PassportMRZ;
  error?: string;
  timestamp: string;
}

/**
 * Cloud Function triggered by Storage finalize event
 * Processes passport images using Google Vision API and saves MRZ data to Firestore
 */
export const processPassportImage = async (
  cloudEvent: CloudEvent<StorageEvent>
) => {
  console.log('Received cloud event:', JSON.stringify(cloudEvent, null, 2));
  
  try {
    // Handle both 1st and 2nd gen Cloud Functions event structures
    let eventData: StorageEvent;
    
    if (cloudEvent.data) {
      eventData = cloudEvent.data;
    } else {
      // For 2nd gen, the event data might be at the root level
      eventData = cloudEvent as any;
    }
    
    if (!eventData || !eventData.bucket || !eventData.name) {
      throw new Error('Invalid storage event data');
    }
    
    const { bucket, name: fileName, contentType } = eventData;
    
    if (!fileName) {
      throw new Error('No file name in storage event');
    }
    
    console.log(`Processing passport image: ${fileName} from bucket: ${bucket}`);
    
    // Validate file type
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid file type: ${contentType}. Expected image file.`);
    }
    
    // Extract user ID and document ID from file path
    const pathParts = fileName.split('/');
    if (pathParts.length < 2) {
      throw new Error(`Invalid file path format: ${fileName}`);
    }
    
    const uid = pathParts[0];
    const docId = pathParts[1]?.replace(/\.[^/.]+$/, '') || ''; // Remove file extension
    
    if (!uid || !docId) {
      throw new Error(`Unable to extract user ID or document ID from path: ${fileName}`);
    }
    
    console.log(`User ID: ${uid}, Document ID: ${docId}`);
    
    // Download image from Storage
    const bucketObj = storage.bucket(bucket);
    const file = bucketObj.file(fileName);
    const [imageBuffer] = await file.download();
    
    // Process image with Vision API
    const mrzData = await extractMRZFromImage(imageBuffer);
    
    // Save to Firestore
    await saveToFirestore(uid, docId, mrzData);
    
    console.log(`Successfully processed passport image for user ${uid}, document ${docId}`);
    
    return {
      success: true,
      message: 'Passport image processed successfully',
      data: mrzData
    };
    
  } catch (error) {
    console.error('Error processing passport image:', error);
    
    // Send to retry queue via Pub/Sub
    const storageEventData = cloudEvent.data || (cloudEvent as any);
    if (storageEventData && storageEventData.bucket && storageEventData.name) {
      await sendToRetryQueue(storageEventData, error instanceof Error ? error : new Error(String(error)));
    }
    
    throw error;
  }
};

/**
 * Extracts MRZ data from passport image using Google Vision API
 */
async function extractMRZFromImage(imageBuffer: Buffer): Promise<PassportMRZ> {
  try {
    // Perform text detection
    const [result] = await vision.textDetection({
      image: { content: imageBuffer.toString('base64') }
    });
    
    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      throw new Error('No text detected in the image');
    }
    
    // Extract MRZ lines (typically last 2-3 lines of passport)
    const fullText = detections[0]?.description || '';
    const lines = fullText.split('\n').filter(line => line.trim().length > 0);
    
    // Find MRZ lines (typically contain 44 characters per line)
    const mrzLines = lines.filter(line => 
      line.length >= 40 && 
      /^[A-Z0-9<]+$/.test(line.replace(/\s/g, ''))
    );
    
    if (mrzLines.length < 2) {
      throw new Error('MRZ lines not found in passport image');
    }
    
    // Parse MRZ data
    const mrzData = parseMRZData(mrzLines);
    
    return mrzData;
    
  } catch (error) {
    console.error('Error extracting MRZ from image:', error);
    throw new Error(`Failed to extract MRZ: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parses MRZ data from detected text lines
 */
function parseMRZData(mrzLines: string[]): PassportMRZ {
  try {
    // Sort lines by length (longest first) and take the first two
    const sortedLines = mrzLines
      .sort((a, b) => b.length - a.length)
      .slice(0, 2);
    
    const line1 = sortedLines[0] || '';
    const line2 = sortedLines[1] || '';
    
    // Parse first line (Document type, country code, surname, given names)
    const documentType = line1.substring(0, 1);
    const countryCode = line1.substring(2, 5);
    const surname = line1.substring(5, line1.indexOf('<<', 5)).replace(/</g, ' ').trim();
    const givenNames = line1.substring(line1.indexOf('<<', 5) + 2).replace(/</g, ' ').trim();
    
    // Parse second line (Document number, nationality, date of birth, sex, expiry date, personal number, checksum)
    const documentNumber = line2.substring(0, 9);
    const nationality = line2.substring(10, 13);
    const dateOfBirth = line2.substring(13, 19);
    const sex = line2.substring(20, 21);
    const dateOfExpiry = line2.substring(21, 27);
    const personalNumber = line2.substring(28, 42);
    const checksum = line2.substring(42, 43);
    
    return {
      documentType,
      countryCode,
      surname,
      givenNames,
      documentNumber,
      nationality,
      dateOfBirth,
      sex,
      dateOfExpiry,
      personalNumber,
      checksum
    };
    
  } catch (error) {
    console.error('Error parsing MRZ data:', error);
    throw new Error(`Failed to parse MRZ data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Saves processed MRZ data to Firestore
 */
async function saveToFirestore(uid: string, docId: string, mrzData: PassportMRZ): Promise<void> {
  try {
    const docRef = firestore
      .collection(COLLECTION_NAME)
      .doc(uid)
      .collection('documents')
      .doc(docId);
    
    const result: ProcessedResult = {
      success: true,
      mrzData,
      timestamp: new Date().toISOString()
    };
    
    await docRef.set(result);
    
    console.log(`Saved MRZ data to Firestore: ${uid}/${docId}`);
    
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw new Error(`Failed to save to Firestore: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sends failed processing to retry queue via Pub/Sub
 */
async function sendToRetryQueue(storageEvent: StorageEvent, error: Error): Promise<void> {
  try {
    const message = {
      storageEvent,
      error: error.message,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await pubsub.topic(TOPIC_NAME).publish(messageBuffer);
    
    console.log(`Sent to retry queue with message ID: ${messageId}`);
    
  } catch (pubsubError) {
    console.error('Error sending to retry queue:', pubsubError);
    // Don't throw here to avoid double failure
  }
}

export { extractMRZFromImage, parseMRZData, saveToFirestore, sendToRetryQueue };
