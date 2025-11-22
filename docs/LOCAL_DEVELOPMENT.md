# Amicis Solution Accelerator - Local Development

This guide covers running the Amicis Solution Accelerator locally using Docker Compose.

## Prerequisites

- Docker Desktop (with WSL2 backend on Windows)
- Docker Compose V2
- Git

## Quick Start

### 1. Clone and Setup

```powershell
cd amicis-solution-accelerator

# Copy environment template
Copy-Item .env.example .env

# Review and update .env if needed
notepad .env
```

### 2. Start All Services

```powershell
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This starts:
- **Redis** (port 6379): Caching layer
- **MongoDB** (port 27017): Local database (Cosmos DB alternative)
- **Go Routing Service** (port 8080): Store routing API
- **NestJS Auth Service** (port 3000): Authentication broker

### 3. Verify Services

```powershell
# Check service health
docker-compose ps

# Test Go Routing Service
Invoke-RestMethod -Uri http://localhost:8080/health

# Test NestJS Auth Service
Invoke-RestMethod -Uri http://localhost:3000/auth/exchange -Method POST -Body (@{userToken="test"} | ConvertTo-Json) -ContentType "application/json"
```

### 4. View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f go-routing-service
docker-compose logs -f node-auth-service
```

## Development Workflow

### Running Services Locally (without Docker)

If you prefer to run services directly for faster development:

#### Terminal 1 - Redis & MongoDB
```powershell
docker-compose up redis mongodb
```

#### Terminal 2 - Go Service
```powershell
cd backend/go-routing-service
$env:PORT="8080"
$env:REDIS_HOST="localhost"
$env:REDIS_PASSWORD="devpassword"
go run main.go
```

#### Terminal 3 - NestJS Service
```powershell
cd backend/node-auth-service
$env:PORT="3000"
$env:REDIS_HOST="localhost"
$env:REDIS_PASSWORD="devpassword"
npm run start:dev
```

### Seed Sample Data

```powershell
# Seed tenant and store configuration
docker-compose exec mongodb mongosh amicis -u admin -p devpassword --eval "
  db.tenants.insertOne({
    tenantId: 'ikea',
    name: 'IKEA Retail',
    authConfig: {
      tokenEndpoint: 'https://ikea-backend.com/oauth/token',
      clientId: 'demo-client'
    }
  });

  db.stores.insertOne({
    storeId: '123',
    tenantId: 'ikea',
    name: 'IKEA Brooklyn',
    backendUrl: 'https://ikea-brooklyn-api.com',
    backendContext: { channelId: 'BKN001' }
  });
"
```

## API Endpoints

### Go Routing Service (Port 8080)

**Health Check**
```
GET http://localhost:8080/health
```

**Get Route**
```
GET http://localhost:8080/api/v1/route?storeId=123
```

### NestJS Auth Service (Port 3000)

**Token Exchange**
```
POST http://localhost:3000/auth/exchange
Content-Type: application/json

{
  "userToken": "user-jwt-token"
}
```

## Database Access

### MongoDB (Local Cosmos DB Alternative)

```powershell
# Connect via MongoDB shell
docker-compose exec mongodb mongosh -u admin -p devpassword

# View databases
show dbs

# Use amicis database
use amicis

# View collections
show collections

# Query tenants
db.tenants.find().pretty()

# Query stores
db.stores.find().pretty()
```

### Redis

```powershell
# Connect via Redis CLI
docker-compose exec redis redis-cli -a devpassword

# View all keys
KEYS *

# Get a value
GET store:123:route

# Set a test value
SET test:key "test-value" EX 60
```

## Troubleshooting

### Services Won't Start

```powershell
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Remove volumes and restart
docker-compose down -v
docker-compose up --build
```

### Port Conflicts

If ports are already in use, update `.env`:
```
PORT_ROUTING=8081
PORT_AUTH=3001
```

Then update `docker-compose.yml` ports accordingly.

### Connection Refused Errors

Ensure services are healthy:
```powershell
docker-compose ps
```

Wait for health checks to pass before testing endpoints.

## Stopping Services

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes (clears data)
docker-compose down -v

# Stop specific service
docker-compose stop go-routing-service
```

## Next Steps

1. ✅ Local environment running
2. Implement Cosmos DB/MongoDB integration in services
3. Implement Redis caching
4. Add sample data seeding scripts
5. Deploy to Azure

## Using Azure Cosmos DB (Optional)

To use real Azure Cosmos DB instead of MongoDB:

1. Create free tier Cosmos DB account in Azure Portal
2. Update `.env`:
   ```
   COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
   COSMOS_KEY=your-primary-key
   ```
3. Comment out `mongodb` service in `docker-compose.yml`
4. Update service dependencies to remove MongoDB

## Tips

- Use `docker-compose restart <service>` to restart after code changes
- Mount source code as volumes in `docker-compose.yml` for hot reload (advanced)
- Check `docker-compose.yml` for environment variable configuration
- Keep `.env` file out of version control (already in `.gitignore`)
