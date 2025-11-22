const { MongoClient } = require('mongodb');

const endpoint = process.env.COSMOS_ENDPOINT || 'mongodb://admin:devpassword@localhost:27017';
const dbName = process.env.COSMOS_DATABASE || 'amicis';

const tenants = [
  {
    tenantId: 'ikea',
    name: 'IKEA',
    authConfig: {
      tokenEndpoint: 'https://api.ikea.com/oauth/token',
      clientId: 'ikea-mobile-app',
      scope: 'order:read product:read',
    },
    branding: {
      primaryColor: '#0051BA',
      logoUrl: 'https://www.ikea.com/global/assets/logos/ikea-logo.svg',
    },
  },
  {
    tenantId: 'contoso',
    name: 'Contoso Retail',
    authConfig: {
      tokenEndpoint: 'https://auth.contoso.com/token',
      clientId: 'contoso-app',
    },
    branding: {
      primaryColor: '#FF6B35',
    },
  },
];

const stores = [
  {
    storeId: 'ikea-seattle',
    tenantId: 'ikea',
    name: 'IKEA Seattle',
    backendUrl: 'https://api-seattle.ikea.com',
    backendContext: {
      region: 'US-West',
      storeNumber: '001',
    },
    location: {
      lat: 47.6062,
      lon: -122.3321,
    },
  },
  {
    storeId: 'ikea-portland',
    tenantId: 'ikea',
    name: 'IKEA Portland',
    backendUrl: 'https://api-portland.ikea.com',
    backendContext: {
      region: 'US-West',
      storeNumber: '002',
    },
    location: {
      lat: 45.5152,
      lon: -122.6784,
    },
  },
  {
    storeId: 'ikea-nyc',
    tenantId: 'ikea',
    name: 'IKEA Brooklyn',
    backendUrl: 'https://api-nyc.ikea.com',
    backendContext: {
      region: 'US-East',
      storeNumber: '010',
    },
    location: {
      lat: 40.6782,
      lon: -73.9442,
    },
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(endpoint);

  try {
    await client.connect();
    console.log('Connected successfully');

    const db = client.db(dbName);

    // Clear existing data
    console.log('Clearing existing data...');
    await db.collection('tenants').deleteMany({});
    await db.collection('stores').deleteMany({});

    // Insert tenants
    console.log('Inserting tenants...');
    const tenantResult = await db.collection('tenants').insertMany(tenants);
    console.log(`Inserted ${tenantResult.insertedCount} tenants`);

    // Insert stores
    console.log('Inserting stores...');
    const storeResult = await db.collection('stores').insertMany(stores);
    console.log(`Inserted ${storeResult.insertedCount} stores`);

    console.log('\nSeed data summary:');
    console.log(`- ${tenants.length} tenants: ${tenants.map(t => t.name).join(', ')}`);
    console.log(`- ${stores.length} stores: ${stores.map(s => s.name).join(', ')}`);

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

seed();
