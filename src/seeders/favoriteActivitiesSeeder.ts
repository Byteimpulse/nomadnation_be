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

interface FavoriteActivity {
  id: string;
  name: string;
  isActive: boolean;
}

const favoriteActivityTemplates = [
{ name: 'Hiking', isActive: true },
{ name: 'Diving', isActive: true },
{ name: 'Wildlife or Safari Experiences', isActive: true },
{ name: 'Eco-Tourism & Nature Excursions', isActive: true },
{ name: 'Skiing', isActive: true },
{ name: 'Yoga', isActive: true },
{ name: 'Photography or Art Tours', isActive: true },
{ name: 'Meditation', isActive: true },
{ name: 'Boat Trips or Island Hopping', isActive: true },
{ name: 'Spa', isActive: true },
{ name: 'Museums', isActive: true },
{ name: 'Festivals', isActive: true },
{ name: 'Surfing or Watersports Adventures', isActive: true },
{ name: 'Cultural Workshops', isActive: true },
{ name: 'Food & Culinary Tours', isActive: true },
{ name: 'Wellness Retreats', isActive: true },
{ name: 'Local Artisan or Market Tours', isActive: true },
{ name: 'Historical or Archaeological Site Visits', isActive: true },
{ name: 'Volunteering Trips', isActive: true }
];

export async function seedFavoriteActivities(): Promise<void> {
  try {
    console.log('🌱 Starting favorite activities seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing favorite activities...');
    await clearFavoriteActivities();
    
    const batch = db.batch();
    const collectionRef = db.collection('favoriteActivities');
    
    // Add each activity to the batch
    favoriteActivityTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const activity: FavoriteActivity = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, activity);
      console.log(`📝 Added ${activity.name} (ID: ${activity.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded favorite activities to Firebase!');
    
    // Log the seeded activities
    console.log('\n📊 Seeded Favorite Activities:');
    favoriteActivityTemplates.forEach((template) => {
      console.log(`  - ${template.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding favorite activities:', error);
    throw error;
  }
}

export async function clearFavoriteActivities(): Promise<void> {
  try {
    console.log('🧹 Clearing favorite activities collection...');
    
    const snapshot = await db.collection('favoriteActivities').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} favorite activity documents`);
    
  } catch (error) {
    console.error('❌ Error clearing favorite activities:', error);
    throw error;
  }
}

export async function getFavoriteActivities(): Promise<FavoriteActivity[]> {
  try {
    const snapshot = await db.collection('favoriteActivities').get();
    return snapshot.docs.map(doc => doc.data() as FavoriteActivity);
  } catch (error) {
    console.error('❌ Error fetching favorite activities:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedFavoriteActivities()
    .then(() => {
      console.log('🎉 Favorite activities seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Favorite activities seeding failed:', error);
      process.exit(1);
    });
}
