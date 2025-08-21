import * as admin from 'firebase-admin';
import { seedLanguages } from './languageSeeder';
import { seedCurrencies } from './currencySeeder';
import { seedRideSharingServices } from './rideSharingSeeder';
import { seedFavoriteActivities } from './favoriteActivitiesSeeder';
import { seedFitnessInterests } from './fitnessInterestsSeeder';
import { seedCommunicationApps } from './communicationAppsSeeder';
import { seedCommunicationChannels } from './communicationChannelsSeeder';
import { seedExcursionBuckets } from './excursionBucketSeeder';

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
    throw error;
  }
}

export async function seedAll(): Promise<void> {
  try {
    console.log('🚀 Starting master seeder - populating all collections...\n');
    
    // Run all seeders in sequence
    await seedLanguages();
    console.log('');
    
    await seedCurrencies();
    console.log('');
    
    await seedRideSharingServices();
    console.log('');
    
    await seedFavoriteActivities();
    console.log('');
    
    await seedFitnessInterests();
    console.log('');
    
    await seedCommunicationApps();
    console.log('');
    
    await seedCommunicationChannels();
    console.log('');
    
    await seedExcursionBuckets();
    console.log('');
    
    console.log('🎉 All seeders completed successfully!');
    console.log('📊 Your Firebase Firestore now contains:');
    console.log('   • Languages collection');
    console.log('   • Currencies collection');
    console.log('   • Ride-sharing services collection');
    console.log('   • Favorite activities collection');
    console.log('   • Fitness interests collection');
    console.log('   • Communication apps collection');
    console.log('   • Communication channels collection');
    console.log('   • Excursion buckets collection');
    
  } catch (error) {
    console.error('💥 Master seeder failed:', error);
    throw error;
  }
}

// Run master seeder if this file is executed directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('\n🎯 Master seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Master seeding failed:', error);
      process.exit(1);
    });
}
