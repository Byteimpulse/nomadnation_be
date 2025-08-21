import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Get project ID from environment variable or use default
    const projectId = process.env['FIREBASE_PROJECT_ID'] || 'nomad-nation-62331';
    
    // Try to initialize with project ID
    admin.initializeApp({
      projectId: projectId
    });
    console.log(`✅ Firebase Admin initialized with project ID: ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to initialize Firebase Admin:', errorMessage);
    console.log('💡 Make sure you have:');
    console.log('   1. Firebase CLI installed and logged in: firebase login');
    console.log('   2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.log('   3. Or run: gcloud auth application-default login');
    console.log('   4. Or set FIREBASE_PROJECT_ID environment variable');
    throw error;
  }
}

const db = admin.firestore();

interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  type: 'fiat' | 'crypto' | 'other';
  isActive: boolean;
  description?: string;
}

const currencyTemplates = [
  {
    name: 'USD',
    code: 'USD',
    symbol: '$',
    type: 'fiat' as const,
    isActive: true,
    description: 'US Dollar'
  },
  {
    name: 'EUR',
    code: 'EUR',
    symbol: '€',
    type: 'fiat' as const,
    isActive: true,
    description: 'Euro'
  },
  {
    name: 'GBP',
    code: 'GBP',
    symbol: '£',
    type: 'fiat' as const,
    isActive: true,
    description: 'British Pound'
  },
  {
    name: 'Local Currency of Destination',
    code: 'LOCAL',
    symbol: '?',
    type: 'other' as const,
    isActive: true,
    description: 'Local currency of the travel destination'
  },
  {
    name: 'JPN',
    code: 'JPY',
    symbol: '¥',
    type: 'fiat' as const,
    isActive: true,
    description: 'Japanese Yen'
  },
  {
    name: 'Cryptocurrency',
    code: 'CRYPTO',
    symbol: '₿',
    type: 'crypto' as const,
    isActive: true,
    description: 'Various cryptocurrencies (Bitcoin, Ethereum, etc.)'
  },
  {
    name: 'Other',
    code: 'OTHER',
    symbol: '?',
    type: 'other' as const,
    isActive: true,
    description: 'Other currency options'
  }
];

export async function seedCurrencies(): Promise<void> {
  try {
    console.log('🌱 Starting currency seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing currencies...');
    await clearCurrencies();
    
    const batch = db.batch();
    const collectionRef = db.collection('currencies');
    
    // Add each currency to the batch
    currencyTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const currency: Currency = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, currency);
      console.log(`📝 Added ${currency.name} (ID: ${currency.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded currencies to Firebase!');
    
    // Log the seeded currencies
    console.log(`\n📊 Seeded Currencies:`);
    currencyTemplates.forEach((template) => {
      console.log(`  - ${template.name} (${template.code}) - ${template.symbol} - ${template.type}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding currencies:', error);
    throw error;
  }
} 

export async function clearCurrencies(): Promise<void> {
  try {
    console.log('🧹 Clearing currencies collection...');
    
    const snapshot = await db.collection('currencies').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} currency documents`);
    
  } catch (error) {
    console.error('❌ Error clearing currencies:', error);
    throw error;
  }
}

export async function getCurrencies(): Promise<Currency[]> {
  try {
    const snapshot = await db.collection('currencies').get();
    return snapshot.docs.map(doc => doc.data() as Currency);
  } catch (error) {
    console.error('❌ Error fetching currencies:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedCurrencies()
    .then(() => {
      console.log('🎉 Currency seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Currency seeding failed:', error);
      process.exit(1);
    });
}
