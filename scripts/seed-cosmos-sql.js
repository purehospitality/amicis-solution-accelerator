const { CosmosClient } = require('@azure/cosmos');

// Parse connection string format: AccountEndpoint=...;AccountKey=...;
function parseConnectionString(connStr) {
  const parts = connStr.split(';').filter(p => p);
  const config = {};
  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) {
      config[key] = value;
    }
  });
  return {
    endpoint: config.AccountEndpoint,
    key: config.AccountKey
  };
}

const connectionString = process.env.COSMOS_ENDPOINT || '';
const dbName = process.env.COSMOS_DATABASE || 'amicis';

const tenants = [
  {
    id: 'ikea',
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
    id: 'contoso',
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
    id: 'ikea-seattle',
    storeId: 'ikea-seattle',
    tenantId: 'ikea',
    name: 'IKEA Seattle',
    location: {
      address: '600 SW 43rd St',
      city: 'Renton',
      state: 'WA',
      zipCode: '98057',
      country: 'USA',
      coordinates: {
        latitude: 47.4797,
        longitude: -122.2176,
      },
    },
    routing: {
      apiEndpoint: 'https://api.ikea.com/us/seattle',
      priority: 1,
      enabled: true,
    },
  },
  {
    id: 'ikea-portland',
    storeId: 'ikea-portland',
    tenantId: 'ikea',
    name: 'IKEA Portland',
    location: {
      address: '10280 NE Cascades Pkwy',
      city: 'Portland',
      state: 'OR',
      zipCode: '97220',
      country: 'USA',
      coordinates: {
        latitude: 45.5428,
        longitude: -122.5689,
      },
    },
    routing: {
      apiEndpoint: 'https://api.ikea.com/us/portland',
      priority: 1,
      enabled: true,
    },
  },
  {
    id: 'ikea-nyc',
    storeId: 'ikea-nyc',
    tenantId: 'ikea',
    name: 'IKEA Brooklyn',
    location: {
      address: '1 Beard St',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11231',
      country: 'USA',
      coordinates: {
        latitude: 40.6745,
        longitude: -74.0113,
      },
    },
    routing: {
      apiEndpoint: 'https://api.ikea.com/us/nyc',
      priority: 1,
      enabled: true,
    },
  },
];

async function seed() {
  console.log('Connecting to Cosmos DB SQL API...');
  
  const { endpoint, key } = parseConnectionString(connectionString);
  const client = new CosmosClient({ endpoint, key });

  console.log('Creating database and containers...');
  const { database } = await client.databases.createIfNotExists({ id: dbName });
  
  // Create tenants container
  const { container: tenantsContainer } = await database.containers.createIfNotExists({
    id: 'tenants',
    partitionKey: { paths: ['/tenantId'] }
  });
  
  // Create stores container
  const { container: storesContainer } = await database.containers.createIfNotExists({
    id: 'stores',
    partitionKey: { paths: ['/tenantId'] }
  });

  console.log('Seeding tenants...');
  for (const tenant of tenants) {
    await tenantsContainer.items.upsert(tenant);
    console.log(`  ✓ Seeded tenant: ${tenant.name}`);
  }

  console.log('Seeding stores...');
  for (const store of stores) {
    await storesContainer.items.upsert(store);
    console.log(`  ✓ Seeded store: ${store.name}`);
  }

  console.log('\nDatabase seeding complete!');
  console.log(`  Tenants: ${tenants.length}`);
  console.log(`  Stores: ${stores.length}`);
}

seed()
  .then(() => {
    console.log('✅ Seeding successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
