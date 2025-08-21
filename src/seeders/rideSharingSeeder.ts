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
    console.log(`✅ Firebase Admin initialized with project `);
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

interface RideSharingService {
  id: string;
  name: string;
  isActive: boolean;
}

const rideSharingServiceTemplates = [
{ name: 'Uber', isActive: true },
{ name: 'Lyft', isActive: true },
{ name: 'Bolt', isActive: true },
{ name: 'Grab', isActive: true },
{ name: 'DiDi', isActive: true },
{ name: 'Ola', isActive: true },
{ name: 'Careem', isActive: true },
{ name: 'Curb', isActive: true },
{ name: 'Cabify', isActive: true },
{ name: 'inDrive', isActive: true },
{ name: 'Other', isActive: true }
];

export async function seedRideSharingServices(): Promise<void> {
  try {
    console.log('🌱 Starting ride-sharing services seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing ride-sharing services...');
    await clearRideSharingServices();
    
    const batch = db.batch();
    const collectionRef = db.collection('rideSharingServices');
    
    // Add each service to the batch
    rideSharingServiceTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const service: RideSharingService = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, service);
      console.log(`📝 Added ${service.name} (ID: ${service.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded ride-sharing services to Firebase!');
    
    // Log the seeded services
    console.log('\n📊 Seeded Ride-Sharing Services:');
    rideSharingServiceTemplates.forEach((template) => {
      console.log(`  - ${template.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding ride-sharing services:', error);
    throw error;
  }
}

export async function clearRideSharingServices(): Promise<void> {
  try {
    console.log('🧹 Clearing ride-sharing services collection...');
    
    const snapshot = await db.collection('rideSharingServices').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} ride-sharing service documents`);
    
  } catch (error) {
    console.error('❌ Error clearing ride-sharing services:', error);
    throw error;
  }
}

export async function getRideSharingServices(): Promise<RideSharingService[]> {
  try {
    const snapshot = await db.collection('rideSharingServices').get();
    return snapshot.docs.map(doc => doc.data() as RideSharingService);
  } catch (error) {
    console.error('❌ Error fetching ride-sharing services:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedRideSharingServices()
    .then(() => {
      console.log('🎉 Ride-sharing services seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ride-sharing services seeding failed:', error);
      process.exit(1);
    });
}
