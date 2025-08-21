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

interface Language {
  id: string;
  name: string;
  nameLocal: string;
  code: string;
  isActive: boolean;
}

const languageTemplates = [
  {
    name: 'English',
    nameLocal: 'English',
    code: 'en',
    isActive: true,
  },
  {
    name: 'Arabic',
    nameLocal: 'العربية',
    code: 'ar',
    isActive: true,
  },
  {
    name: 'French',
    nameLocal: 'Français',
    code: 'fr',
    isActive: true,
  },
  {
    name: 'German',
    nameLocal: 'Deutsch',
    code: 'de',
    isActive: true,
  },
  {
    name: 'Hindi',
    nameLocal: 'हिन्दी',
    code: 'hi',
    isActive: true,
  },
  {
    name: 'Japanese',
    nameLocal: '日本語',
    code: 'ja',
    isActive: true,
  },
  {
    name: 'Mandarin Chinese',
    nameLocal: '中文',
    code: 'zh',
    isActive: true,
  },
  {
    name: 'Portuguese',
    nameLocal: 'Português',
    code: 'pt',
    isActive: true,
  },
  {
    name: 'Russian',
    nameLocal: 'Русский',
    code: 'ru',
    isActive: true,
  },
  {
    name: 'Spanish',
    nameLocal: 'Español',
    code: 'es',
    isActive: true,
  },
  {
    name: 'Other',
    nameLocal: 'Other',
    code: 'other',
    isActive: true,
  },
]; 

export async function seedLanguages(): Promise<void> {
  try {
    console.log('🌱 Starting language seeding...');
    
    // First, clear existing data
    console.log('🧹 Clearing existing languages...');
    await clearLanguages();
    
    const batch = db.batch();
    const collectionRef = db.collection('languages');
    
    // Add each language to the batch
    languageTemplates.forEach((template) => {
      const docRef = collectionRef.doc(); // Firebase auto-generates ID
      const language: Language = {
        id: docRef.id, // Include the auto-generated ID in the document data
        ...template
      };
      batch.set(docRef, language);
      console.log(`📝 Added ${language.name} (ID: ${language.id}) to batch`);
    });
    
    // Commit the batch
    await batch.commit();
    console.log('✅ Successfully seeded languages to Firebase!');
    
    // Log the seeded languages
    console.log('\n📊 Seeded Languages:');
    languageTemplates.forEach((template) => {
      console.log(`  - ${template.name} (${template.code}) - ${template.nameLocal}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding languages:', error);
    throw error;
  }
}

export async function clearLanguages(): Promise<void> {
  try {
    console.log('🧹 Clearing languages collection...');
    
    const snapshot = await db.collection('languages').get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Cleared ${snapshot.docs.length} language documents`);
    
  } catch (error) {
    console.error('❌ Error clearing languages:', error);
    throw error;
  }
}

export async function getLanguages(): Promise<Language[]> {
  try {
    const snapshot = await db.collection('languages').get();
    return snapshot.docs.map(doc => doc.data() as Language);
  } catch (error) {
    console.error('❌ Error fetching languages:', error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedLanguages()
    .then(() => {
      console.log('🎉 Language seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Language seeding failed:', error);
      process.exit(1);
    });
}
