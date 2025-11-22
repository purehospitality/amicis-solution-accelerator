# NestJS Auth Broker Service

Authentication broker microservice for the Amicis Solution Accelerator platform. Handles token exchange between mobile clients and retailer backend systems.

## Overview

The Auth Broker Service is responsible for:
- Exchanging user authentication tokens for backend access tokens
- Managing multi-tenant authentication flows
- Interacting with retailer-specific OAuth/token endpoints
- Caching authentication state in Redis
- Retrieving tenant-specific auth configuration from Cosmos DB

## Technology Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Data Sources**: Azure Cosmos DB, Azure Cache for Redis
- **Security**: Azure Key Vault for secrets

## API Endpoints

### Token Exchange

```
POST /auth/exchange
Content-Type: application/json
```

**Request Body:**
```json
{
  "userToken": "string"
}
```

**Response:**
```json
{
  "accessToken": "dummy-backend-token",
  "expiresIn": 3600
}
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Git

### Installation

```powershell
# Navigate to service directory
cd backend/node-auth-service

# Install dependencies
npm install
```

### Running Locally

```powershell
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The service will start on `http://localhost:3000` by default.

### Custom Port

```powershell
$env:PORT = "4000"
npm run start:dev
```

## Development

### Project Structure

```
node-auth-service/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   └── auth/                   # Auth domain module
│       ├── auth.module.ts      # Auth module definition
│       ├── auth.controller.ts  # HTTP endpoints
│       ├── auth.service.ts     # Business logic
│       └── dto/                # Data transfer objects
│           └── token-exchange.dto.ts
├── test/                       # E2E tests
├── dist/                       # Compiled output (gitignored)
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── nest-cli.json               # NestJS CLI configuration
└── README.md                   # This file
```

### Testing

```powershell
# Unit tests
npm test

# Unit tests (watch mode)
npm run test:watch

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Code Quality

```powershell
# Linting
npm run lint

# Format code
npm run format
```

### Generate New Module/Controller/Service

```powershell
# Generate module
npx @nestjs/cli generate module tenant

# Generate controller
npx @nestjs/cli generate controller tenant

# Generate service
npx @nestjs/cli generate service tenant

# Generate complete resource (CRUD)
npx @nestjs/cli generate resource tenant
```

## Configuration

Configure the service using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment (development, production) | `development` |
| `COSMOS_ENDPOINT` | Azure Cosmos DB endpoint | - |
| `COSMOS_KEY` | Azure Cosmos DB key | - |
| `REDIS_HOST` | Redis cache hostname | - |
| `REDIS_PASSWORD` | Redis cache password | - |
| `LOG_LEVEL` | Logging level (log, error, warn, debug, verbose) | `log` |

### .env File

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
REDIS_HOST=your-redis.redis.cache.windows.net
REDIS_PASSWORD=your-redis-password
```

**Note**: Never commit `.env` files to version control.

## Docker

### Build Docker Image

```powershell
docker build -t amicis-auth-service:latest .
```

### Run Docker Container

```powershell
docker run -p 3000:3000 -e PORT=3000 amicis-auth-service:latest
```

## Deployment

### Kubernetes (AKS)

Kubernetes manifests will be located in `/infra/k8s/auth-service/`:

```powershell
kubectl apply -f infra/k8s/auth-service/
```

## Architecture Patterns

### Multi-Tenancy

The service uses a **middleware-based tenant resolution** pattern:

1. Extract tenant context from request headers or subdomains
2. Load tenant-specific configuration from Cosmos DB
3. Apply tenant context to downstream services

### Security

- **Secrets**: Stored in Azure Key Vault, never in code
- **HTTPS**: All external communications use TLS
- **CORS**: Configured for mobile app origins only
- **Rate Limiting**: Implemented per-tenant (coming soon)

## Roadmap

- [ ] Implement real token exchange with retailer backends
- [ ] Add Cosmos DB integration for tenant configuration
- [ ] Add Redis caching for tokens and config
- [ ] Implement tenant middleware
- [ ] Add Azure Key Vault integration
- [ ] Add structured logging (Winston)
- [ ] Add metrics endpoint (Prometheus)
- [ ] Add distributed tracing (OpenTelemetry)
- [ ] Implement rate limiting
- [ ] Add circuit breaker for external calls
- [ ] Write comprehensive unit tests
- [ ] Add E2E tests
- [ ] Create Dockerfile
- [ ] Create Kubernetes manifests

## API Documentation

Swagger/OpenAPI documentation will be available at:

```
http://localhost:3000/api
```

(Coming soon after Swagger module integration)

## Performance Targets

- **Latency**: p99 < 100ms for token exchange
- **Throughput**: > 1,000 requests/second per instance
- **Availability**: 99.9% uptime SLA

## Contributing

1. Follow NestJS conventions and style guide
2. Run linter and formatter before committing
3. Ensure all tests pass
4. Update API documentation for endpoint changes

## License

Proprietary - All rights reserved
