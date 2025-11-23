# Amicis Solution Accelerator

A white-label, cloud-native retail platform designed to act as an agile gateway between mobile users in retail stores and rigid backend commerce systems like Dynamics 365 CSU.

## 🏗️ Architecture Overview

### Key Principles

1. **Multi-Tenant & White-Label**: Configurable isolated instances for different retailers. Behavior and branding driven by configuration, not hardcoded logic.

2. **Microservices Backend**: Runs on Azure Kubernetes Service (AKS) with:
   - **Go Routing Service**: High-performance location lookups and store routing
   - **Node.js (NestJS) Auth Broker Service**: Token exchange and authentication brokering

3. **Direct-to-Backend Pattern**: Mobile apps call central services for auth and routing, then connect directly to retailer's backend API for shopping operations (scanning, cart management) to minimize latency.

4. **Infrastructure as Code**: All Azure infrastructure defined using reusable Terraform modules.

5. **Data Layer**: 
   - **Azure Cosmos DB (NoSQL)**: Tenant configuration and store registries
   - **Azure Cache for Redis**: Hot caching of routing data

## 📁 Repository Structure

```
amicis-solution-accelerator/
├── infra/                          # Infrastructure as Code (Terraform)
│   ├── modules/                    # Reusable Terraform modules
│   │   └── foundation/             # Base Azure resources (RG, VNet, Key Vault)
│   └── live/                       # Environment-specific deployments
│       └── ikea-pilot/             # IKEA pilot tenant
│           └── dev/                # Development environment
├── backend/                        # Microservices
│   ├── go-routing-service/         # Go routing service (Chi router)
│   └── node-auth-service/          # NestJS auth broker service
├── frontend/                       # React/Capacitor mobile app
├── docs/                           # Architecture and API documentation
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites

- **Terraform**: >= 1.5.0
- **Go**: >= 1.21
- **Node.js**: >= 20.x
- **Azure CLI**: Latest version
- **Docker**: For containerization
- **kubectl**: For Kubernetes management
- **k6**: For performance testing (optional)

### Quick Links

- 📖 [Setup Guide](docs/SETUP.md) - Initial Azure setup and configuration
- 🏠 [Local Development](docs/LOCAL_DEVELOPMENT.md) - Running services locally
- ☸️ [K8s Deployment](docs/K8S_DEPLOYMENT.md) - Kubernetes deployment guide
- 📊 [Monitoring](docs/MONITORING.md) - Application Insights and observability
- ⚡ [Performance Testing](docs/PERFORMANCE.md) - Load testing and benchmarks
- 🔄 [Resilience](docs/RESILIENCE.md) - Circuit breakers, retries, and fault tolerance
- 🧪 [Circuit Breaker Testing](docs/CIRCUIT_BREAKER_TESTING.md) - Testing resilience patterns
- 🔒 [Security](docs/SECURITY.md) - Security hardening and best practices
- 🚨 [Disaster Recovery](docs/DISASTER_RECOVERY.md) - DR plan, RTO/RPO, backup strategies

### Infrastructure Setup

```powershell
# Navigate to tenant environment
cd infra/live/ikea-pilot/dev

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply infrastructure
terraform apply
```

### Backend Services

#### Go Routing Service

```powershell
cd backend/go-routing-service

# Initialize Go module
go mod download

# Run locally
go run main.go

# Build
go build -o bin/routing-service
```

#### NestJS Auth Service

```powershell
cd backend/node-auth-service

# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Build for production
npm run build
```

### Frontend Mobile App

```powershell
cd frontend

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build
```

## 🔑 Key Technologies

- **Infrastructure**: Terraform, Azure (AKS, Cosmos DB, Redis, Key Vault, APIM)
- **Backend**: Go (Chi router), Node.js (NestJS)
- **Frontend**: React, Capacitor (iOS/Android)
- **Data**: Azure Cosmos DB, Azure Cache for Redis
- **Resilience**: Circuit Breakers (gobreaker, opossum), Exponential Backoff Retries
- **CI/CD**: GitHub Actions, Azure DevOps

## 🏢 Multi-Tenancy

Each tenant (retailer) has:
- Isolated infrastructure deployment
- Dedicated configuration in Cosmos DB
- Custom branding and business logic
- Separate authentication flows
- Independent scaling policies

Tenant deployments are managed under `infra/live/<tenant-name>/<environment>/`

## 📚 Documentation

- [Architecture Guide](docs/architecture.md) _(coming soon)_
- [API Documentation](docs/api.md) _(coming soon)_
- [Deployment Guide](docs/deployment.md) _(coming soon)_
- [Multi-Tenancy Guide](docs/multi-tenancy.md) _(coming soon)_

## 🛠️ Development Workflow

1. **Infrastructure Changes**: Modify Terraform modules, test in dev environment
2. **Service Development**: Implement features in Go/NestJS services
3. **Testing**: Run unit and integration tests
4. **Containerization**: Build Docker images
5. **Deployment**: Deploy to AKS via CI/CD pipelines

## 🔒 Security

- Secrets managed in Azure Key Vault
- RBAC for all Azure resources
- Network isolation via VNets and subnets
- API Gateway (APIM) for external access
- TLS/SSL for all communications

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Senior Software Architect & DevOps Engineering Team

---

**Status**: ✅ **Production Ready** - All phases complete (Infrastructure, Backend, Frontend, CI/CD, Production Readiness)

**Live Deployment**: https://gray-cliff-0abcbae0f.3.azurestaticapps.net
