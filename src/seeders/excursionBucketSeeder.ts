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

interface ExcursionBucket {
  id: string;
  region: string;
  excursions: string[];
  isActive: boolean;
}

const excursionBucketTemplates = [
  {
    region: 'Africa',
    excursions: [
      'Safari in the Serengeti (Tanzania/Kenya)',
      'Climb Mount Kilimanjaro (Tanzania)',
      'Road Trip along the Garden Route (South Africa)',
      'Camel Trek & Camp in the Sahara Desert (Morocco)'
    ],
    isActive: true
  },
  {
    region: 'North America',
    excursions: [
      'Swim in a Cenote in Yucatán (Mexico)'
    ],
    isActive: true
  },
  {
    region: 'South America',
    excursions: [
      'Trek to Machu Picchu (Peru)',
      'Hike Torres del Paine National Park (Chile)',
      'See the Moai Statues of Easter Island (Chile)',
      'Explore the Amazon Rainforest (Brazil/Peru/Ecuador)',
      'Visit the Galápagos Islands (Ecuador)'
    ],
    isActive: true
  },
  {
    region: 'Asia',
    excursions: [
      'Hot Air Balloon Ride over Cappadocia (Turkey)',
      'Visit the Temples of Angkor Wat (Cambodia)',
      'Experience the Holi Festival (India)',
      'Take a Thai Cooking Class in Chiang Mai (Thailand)',
      'Island Hopping in the Philippines'
    ],
    isActive: true
  },
  {
    region: 'Europe',
    excursions: [
      'Walk the Camino de Santiago (Spain)',
      'Liveaboard Sailing in Croatia or Greece',
      'Ride the Trans-Siberian Railway (Russia to China)'
    ],
    isActive: true
  },
  {
    region: 'Oceania',
    excursions: [
      'Scuba Dive the Great Barrier Reef (Australia)'
    ],
    isActive: true
  },
  {
    region: 'Polar/Natural Phenomena',
    excursions: [
      'Northern Lights Viewing in Iceland or Norway'
    ],
    isActive: true
  }
];

export async function seedExcursionBuckets(): Promise<void> {
  try {
    console.log('🌱 Starting excursion bucket seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing excursion buckets...');
    await clearExcursionBuckets();
    
    const batch = db.batch();
    const collectionRef = db.collection('excursionBuckets');
    
    // Add each excursion bucket to the batch
    excursionBucketTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const excursionBucket: ExcursionBucket = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, excursionBucket);
      console.log(`📝 Added ${excursionBucket.region} (ID: ${excursionBucket.id}) with ${excursionBucket.excursions.length} excursions to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded excursion buckets to Firebase!');
    
    // Log the seeded buckets
    console.log('\n📊 Seeded Excursion Buckets:');
    excursionBucketTemplates.forEach((template) => {
      console.log(`  - ${template.region}: ${template.excursions.length} excursions`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding excursion buckets:', error);
    throw error;
  }
}

export async function clearExcursionBuckets(): Promise<void> {
  try {
    console.log('🧹 Clearing excursion buckets collection...');
    
    const snapshot = await db.collection('excursionBuckets').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} excursion bucket documents`);
    
  } catch (error) {
    console.error('❌ Error clearing excursion buckets:', error);
    throw error;
  }
}

export async function getExcursionBuckets(): Promise<ExcursionBucket[]> {
  try {
    const snapshot = await db.collection('excursionBuckets').get();
    return snapshot.docs.map(doc => doc.data() as ExcursionBucket);
  } catch (error) {
    console.error('❌ Error fetching excursion buckets:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedExcursionBuckets()
    .then(() => {
      console.log('🎉 Excursion bucket seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Excursion bucket seeding failed:', error);
      process.exit(1);
    });
}
