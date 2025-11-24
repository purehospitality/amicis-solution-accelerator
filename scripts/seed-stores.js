/**
 * Seed IKEA store data to Cosmos DB MongoDB API
 * Usage: node seed-stores.js
 */

const { MongoClient } = require('mongodb');

const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING || 
  'mongodb://localhost:27017/?directConnection=true';

const storesData = [
  {
    tenantId: 'ikea',
    storeId: 'ikea-atlanta',
    name: 'IKEA Atlanta',
    status: 'busy', // busy, normal, closingSoon
    closingTime: new Date('2024-01-01T20:00:00Z'), // 8:00 PM
    address: '441 16th St NW',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30363',
    country: 'US',
    coordinates: {
      lat: 33.7820,
      lon: -84.3902
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenantId: 'ikea',
    storeId: 'ikea-seattle',
    name: 'IKEA Seattle',
    status: 'normal',
    closingTime: new Date('2024-01-01T21:00:00Z'), // 9:00 PM
    address: '600 SW 43rd St',
    city: 'Renton',
    state: 'WA',
    zipCode: '98057',
    country: 'US',
    coordinates: {
      lat: 47.4629,
      lon: -122.2170
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tenantId: 'ikea',
    storeId: 'ikea-chicago',
    name: 'IKEA Schaumburg',
    status: 'normal',
    closingTime: new Date('2024-01-01T21:00:00Z'), // 9:00 PM
    address: '1800 E McConnor Pkwy',
    city: 'Schaumburg',
    state: 'IL',
    zipCode: '60173',
    country: 'US',
    coordinates: {
      lat: 42.0325,
      lon: -88.0431
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedStores() {
  const client = new MongoClient(cosmosConnectionString);

  try {
    console.log('🔌 Connecting to Cosmos DB...');
    await client.connect();
    console.log('✅ Connected to Cosmos DB');

    const db = client.db('amicis');
    const storesCollection = db.collection('stores');

    // Delete existing stores for fresh seed
    console.log('🗑️  Clearing existing stores...');
    await storesCollection.deleteMany({ tenantId: 'ikea' });

    // Insert store data
    console.log(`📦 Inserting ${storesData.length} IKEA stores...`);
    const result = await storesCollection.insertMany(storesData);
    console.log(`✅ Inserted ${result.insertedCount} stores`);

    // Create indexes (try/catch because index might already exist)
    console.log('🔧 Creating indexes...');
    try {
      await storesCollection.createIndex({ tenantId: 1, storeId: 1 }, { unique: true });
      await storesCollection.createIndex({ tenantId: 1, city: 1 });
      console.log('✅ Indexes created');
    } catch (indexErr) {
      console.log('⚠️  Index creation skipped (may already exist):', indexErr.message);
    }

    // Verify
    const count = await storesCollection.countDocuments({ tenantId: 'ikea' });
    console.log(`\n📊 Total IKEA stores in database: ${count}`);

    // List stores
    const stores = await storesCollection.find({ tenantId: 'ikea' }).toArray();
    console.log('\n📍 Stores:');
    stores.forEach(store => {
      console.log(`  - ${store.name} (${store.city}, ${store.state}) - ${store.status}`);
    });

    console.log('\n✅ Store seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding stores:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

seedStores();
