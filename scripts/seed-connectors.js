// Script to seed the connectors collection in MongoDB
// Run with: node scripts/seed-connectors.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'amicis';

const connectors = [
  {
    storeId: 'ikea-seattle',
    tenantId: 'ikea',
    domain: 'retail',
    url: 'https://commerce.ikea.com/api',
    adapter: 'D365CommerceAdapter',
    version: 'v1',
    config: {
      demoMode: true, // Set to false for production
      apiKey: process.env.D365_API_KEY || '',
      timeout: 10000,
    },
    enabled: true,
    timeout: 10000,
    priority: 1,
  },
  {
    storeId: 'ikea-seattle',
    tenantId: 'ikea',
    domain: 'wishlist',
    url: 'https://wishlist.ikea.com/api',
    adapter: 'D365WishlistAdapter',
    version: 'v1',
    config: {
      demoMode: true,
      apiKey: process.env.WISHLIST_API_KEY || '',
      timeout: 5000,
    },
    enabled: true,
    timeout: 5000,
    priority: 1,
  },
  {
    storeId: 'ikea-portland',
    tenantId: 'ikea',
    domain: 'retail',
    url: 'https://commerce.ikea.com/api',
    adapter: 'D365CommerceAdapter',
    version: 'v1',
    config: {
      demoMode: true,
      apiKey: process.env.D365_API_KEY || '',
      timeout: 10000,
    },
    enabled: true,
    timeout: 10000,
    priority: 1,
  },
  {
    storeId: 'ikea-nyc',
    tenantId: 'ikea',
    domain: 'retail',
    url: 'https://commerce.ikea.com/api',
    adapter: 'D365CommerceAdapter',
    version: 'v1',
    config: {
      demoMode: true,
      apiKey: process.env.D365_API_KEY || '',
      timeout: 10000,
    },
    enabled: true,
    timeout: 10000,
    priority: 1,
  },
];

async function seedConnectors() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const connectorsCollection = db.collection('connectors');

    // Create indexes
    await connectorsCollection.createIndex(
      { tenantId: 1, storeId: 1, domain: 1 },
      { unique: true }
    );
    console.log('✅ Created unique index on (tenantId, storeId, domain)');

    // Clear existing connectors (optional - comment out to preserve data)
    // await connectorsCollection.deleteMany({});
    // console.log('✅ Cleared existing connectors');

    // Insert connectors with upsert
    for (const connector of connectors) {
      const filter = {
        tenantId: connector.tenantId,
        storeId: connector.storeId,
        domain: connector.domain,
      };

      const result = await connectorsCollection.updateOne(
        filter,
        { $set: connector },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        console.log(
          `✅ Inserted connector: ${connector.tenantId}/${connector.storeId}/${connector.domain}`
        );
      } else {
        console.log(
          `✅ Updated connector: ${connector.tenantId}/${connector.storeId}/${connector.domain}`
        );
      }
    }

    console.log(`\n✅ Successfully seeded ${connectors.length} connectors`);

    // Verify
    const count = await connectorsCollection.countDocuments({});
    console.log(`📊 Total connectors in database: ${count}`);

    // Show sample
    const samples = await connectorsCollection
      .find({ tenantId: 'ikea' })
      .limit(3)
      .toArray();
    console.log('\n📋 Sample connectors:');
    samples.forEach((c) => {
      console.log(
        `   - ${c.storeId} / ${c.domain} / ${c.adapter} (${
          c.enabled ? 'enabled' : 'disabled'
        })`
      );
    });
  } catch (error) {
    console.error('❌ Error seeding connectors:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

seedConnectors();
