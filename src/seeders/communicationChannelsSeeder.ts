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

interface CommunicationChannel {
  id: string;
  name: string;
  isActive: boolean;
}

const communicationChannelTemplates = [
{ name: 'WhatsApp', isActive: true },
{ name: 'Telegram', isActive: true },
{ name: 'Slack', isActive: true },
{ name: 'Discord', isActive: true },
{ name: 'Email', isActive: true },
{ name: 'In-app notifications (if available)', isActive: true },
{ name: 'Social media groups', isActive: true },
{ name: 'Other', isActive: true }
];

export async function seedCommunicationChannels(): Promise<void> {
  try {
    console.log('🌱 Starting communication channels seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing communication channels...');
    await clearCommunicationChannels();
    
    const batch = db.batch();
    const collectionRef = db.collection('communicationChannels');
    
    // Add each channel to the batch
    communicationChannelTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const channel: CommunicationChannel = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, channel);
      console.log(`📝 Added ${channel.name} (ID: ${channel.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded communication channels to Firebase!');
    
    // Log the seeded channels
    console.log('\n📊 Seeded Communication Channels:');
    communicationChannelTemplates.forEach((template) => {
      console.log(`  - ${template.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding communication channels:', error);
    throw error;
  }
}

export async function clearCommunicationChannels(): Promise<void> {
  try {
    console.log('🧹 Clearing communication channels collection...');
    
    const snapshot = await db.collection('communicationChannels').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} communication channel documents`);
    
  } catch (error) {
    console.error('❌ Error clearing communication channels:', error);
    throw error;
  }
}

export async function getCommunicationChannels(): Promise<CommunicationChannel[]> {
  try {
    const snapshot = await db.collection('communicationChannels').get();
    return snapshot.docs.map(doc => doc.data() as CommunicationChannel);
  } catch (error) {
    console.error('❌ Error fetching communication channels:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedCommunicationChannels()
    .then(() => {
      console.log('🎉 Communication channels seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Communication channels seeding failed:', error);
      process.exit(1);
    });
}
