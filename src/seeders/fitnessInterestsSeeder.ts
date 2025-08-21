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

interface FitnessInterest {
  id: string;
  name: string;
  isActive: boolean;
}

const fitnessInterestTemplates = [
{ name: 'Gym Workouts', isActive: true },
{ name: 'Running/Jogging', isActive: true },
{ name: 'Cycling', isActive: true },
{ name: 'Group Fitness Classes (e.g., HIIT, Zumba)', isActive: true },
{ name: 'Swimming', isActive: true },
{ name: 'Martial Arts or Boxing', isActive: true },
{ name: 'Dance', isActive: true },
{ name: 'Hiking/Nature', isActive: true },
{ name: 'CrossFit or Functional', isActive: true }
];

export async function seedFitnessInterests(): Promise<void> {
  try {
    console.log('🌱 Starting fitness interests seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing fitness interests...');
    await clearFitnessInterests();
    
    const batch = db.batch();
    const collectionRef = db.collection('fitnessInterests');
    
    // Add each interest to the batch
    fitnessInterestTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const interest: FitnessInterest = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, interest);
      console.log(`📝 Added ${interest.name} (ID: ${interest.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded fitness interests to Firebase!');
    
    // Log the seeded interests
    console.log('\n📊 Seeded Fitness Interests:');
    fitnessInterestTemplates.forEach((template) => {
      console.log(`  - ${template.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding fitness interests:', error);
    throw error;
  }
}

export async function clearFitnessInterests(): Promise<void> {
  try {
    console.log('🧹 Clearing fitness interests collection...');
    
    const snapshot = await db.collection('fitnessInterests').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} fitness interest documents`);
    
  } catch (error) {
    console.error('❌ Error clearing fitness interests:', error);
    throw error;
  }
}

export async function getFitnessInterests(): Promise<FitnessInterest[]> {
  try {
    const snapshot = await db.collection('fitnessInterests').get();
    return snapshot.docs.map(doc => doc.data() as FitnessInterest);
  } catch (error) {
    console.error('❌ Error fetching fitness interests:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedFitnessInterests()
    .then(() => {
      console.log('🎉 Fitness interests seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fitness interests seeding failed:', error);
      process.exit(1);
    });
}
