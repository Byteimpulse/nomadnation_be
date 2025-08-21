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

interface CommunicationApp {
  id: string;
  name: string;
  isActive: boolean;
}

const communicationAppTemplates = [
{ name: 'WhatsApp', isActive: true },
{ name: 'Telegram', isActive: true },
{ name: 'Signal', isActive: true },
{ name: 'iMessage', isActive: true },
{ name: 'Google Voice', isActive: true },
{ name: 'Skype', isActive: true },
{ name: 'Zoom', isActive: true },
{ name: 'Slack / Discord', isActive: true },
{ name: 'Facebook Messenger', isActive: true },
{ name: 'WeChat / LINE / KakaoTalk', isActive: true },
{ name: 'Other', isActive: true }
];

export async function seedCommunicationApps(): Promise<void> {
  try {
    console.log('🌱 Starting communication apps seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing communication apps...');
    await clearCommunicationApps();
    
    const batch = db.batch();
    const collectionRef = db.collection('communicationApps');
    
    // Add each app to the batch
    communicationAppTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const app: CommunicationApp = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, app);
      console.log(`📝 Added ${app.name} (ID: ${app.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded communication apps to Firebase!');
    
    // Log the seeded apps
    console.log('\n📊 Seeded Communication Apps:');
    communicationAppTemplates.forEach((template) => {
      console.log(`  - ${template.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding communication apps:', error);
    throw error;
  }
}

export async function clearCommunicationApps(): Promise<void> {
  try {
    console.log('🧹 Clearing communication apps collection...');
    
    const snapshot = await db.collection('communicationApps').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} communication app documents`);
    
  } catch (error) {
    console.error('❌ Error clearing communication apps:', error);
    throw error;
  }
}

export async function getCommunicationApps(): Promise<CommunicationApp[]> {
  try {
    const snapshot = await db.collection('communicationApps').get();
    return snapshot.docs.map(doc => doc.data() as CommunicationApp);
  } catch (error) {
    console.error('❌ Error fetching communication apps:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedCommunicationApps()
    .then(() => {
      console.log('🎉 Communication apps seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Communication apps seeding failed:', error);
      process.exit(1);
    });
}
