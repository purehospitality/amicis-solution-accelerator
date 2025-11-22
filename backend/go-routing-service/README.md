# Go Routing Service

High-performance microservice for store routing and location lookups in the Amicis Solution Accelerator platform.

## Overview

The Go Routing Service is responsible for:
- Resolving store IDs to backend API endpoints
- Providing routing context for mobile clients
- Caching routing data from Redis for low-latency lookups
- Querying Cosmos DB for tenant and store configuration

## Technology Stack

- **Language**: Go 1.21+
- **Router**: Chi (lightweight, idiomatic HTTP router)
- **Data Sources**: Azure Cosmos DB, Azure Cache for Redis

## API Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

### Get Route Information

```
GET /api/v1/route?storeId={storeId}
```

**Query Parameters:**
- `storeId` (optional): The store identifier. Defaults to "123" if not provided.

**Response:**
```json
{
  "storeId": "123",
  "backendUrl": "https://dummy-csu.com",
  "backendContext": {
    "channelId": "dummy-channel"
  }
}
```

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Git

### Installation

```powershell
# Navigate to service directory
cd backend/go-routing-service

# Download dependencies
go mod download

# Verify installation
go mod verify
```

### Running Locally

```powershell
# Run with default port (8080)
go run main.go

# Run with custom port
$env:PORT = "3000"
go run main.go
```

### Building

```powershell
# Build binary
go build -o bin/routing-service.exe

# Build for Linux (for Docker/AKS deployment)
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -o bin/routing-service

# Run binary
./bin/routing-service.exe
```

### Testing

```powershell
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Development

### Project Structure

```
go-routing-service/
├── main.go              # Application entry point
├── go.mod               # Go module definition
├── go.sum               # Dependency checksums
├── bin/                 # Compiled binaries (gitignored)
├── internal/            # Private application code (coming soon)
│   ├── handlers/        # HTTP handlers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Data models
│   └── services/        # Business logic
├── pkg/                 # Public libraries (coming soon)
├── configs/             # Configuration files (coming soon)
└── README.md            # This file
```

### Adding Dependencies

```powershell
# Add a new dependency
go get github.com/example/package

# Update dependencies
go get -u ./...

# Tidy up go.mod
go mod tidy
```

## Configuration

The service is configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `8080` |
| `COSMOS_ENDPOINT` | Azure Cosmos DB endpoint | - |
| `COSMOS_KEY` | Azure Cosmos DB key | - |
| `REDIS_HOST` | Redis cache hostname | - |
| `REDIS_PASSWORD` | Redis cache password | - |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |

## Docker

### Build Docker Image

```powershell
docker build -t amicis-routing-service:latest .
```

### Run Docker Container

```powershell
docker run -p 8080:8080 -e PORT=8080 amicis-routing-service:latest
```

## Deployment

### Kubernetes (AKS)

Kubernetes manifests will be located in `/infra/k8s/routing-service/`:

```powershell
kubectl apply -f infra/k8s/routing-service/
```

## Roadmap

- [ ] Implement Cosmos DB integration for store registry lookups
- [ ] Add Redis caching layer for hot routing data
- [ ] Implement structured logging (zerolog)
- [ ] Add metrics endpoint (Prometheus)
- [ ] Add distributed tracing (OpenTelemetry)
- [ ] Implement rate limiting
- [ ] Add circuit breaker for external dependencies
- [ ] Write comprehensive unit tests
- [ ] Add integration tests
- [ ] Create Dockerfile
- [ ] Create Kubernetes manifests

## Performance Targets

- **Latency**: p99 < 10ms for cached routes
- **Throughput**: > 10,000 requests/second per instance
- **Availability**: 99.9% uptime SLA

## Contributing

1. Follow Go standard project layout
2. Run `go fmt` before committing
3. Ensure all tests pass
4. Update documentation for API changes

## License

Proprietary - All rights reserved
