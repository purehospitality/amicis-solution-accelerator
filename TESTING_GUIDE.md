# Test the IKEA Application Deployment

## Your Application is Now Live! 🎉

**Base URL:** http://api.4.157.44.54.nip.io

---

## ✅ Services Successfully Deployed

Both backend services are running and healthy:

### 1. **Node Auth Service** - Authentication & Token Management
- **Health Check:** http://api.4.157.44.54.nip.io/health
- **Status:** ✅ MongoDB: UP, Redis: UP

### 2. **Go Routing Service** - Store Routing Logic  
- **Health Check:** Accessible at `/health` endpoint (requires direct service access)
- **Status:** ✅ MongoDB: UP, Redis: UP

---

## 🧪 How to Test in Your Browser

### Test 1: Check Auth Service Health
**Open this URL in your browser:**
```
http://api.4.157.44.54.nip.io/health
```

**What you should see:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-23T...",
  "dependencies": {
    "mongodb": {
      "status": "up",
      "responseTime": 2
    },
    "redis": {
      "status": "up",
      "responseTime": 25
    }
  }
}
```

✅ **Success Criteria:** Both MongoDB and Redis show `"status": "up"`

---

### Test 2: Check API Documentation
**Open this URL in your browser:**
```
http://api.4.157.44.54.nip.io/api/docs
```

**What you should see:**
- Swagger/OpenAPI documentation interface
- Lists all available authentication endpoints

---

## 🔧 Advanced Testing (PowerShell Commands)

For more detailed testing, run these commands in PowerShell:

### Test Health Endpoints
```powershell
# Auth Service Health
Invoke-WebRequest -Uri "http://api.4.157.44.54.nip.io/health" -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json

# Check Metrics Endpoint
Invoke-WebRequest -Uri "http://api.4.157.44.54.nip.io/metrics" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Generate Test JWT Token and Query Routing Service
```powershell
# Get the JWT secret from Kubernetes
$jwtSecret = kubectl get secret jwt-secret -n amicis -o jsonpath='{.data.secret}' | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }

# Create a test JWT token (requires jwt npm package or online tool)
# For now, test directly from inside a pod:
kubectl exec -n amicis deployment/go-routing-service -- wget -qO- http://localhost:8080/health
```

---

## 📊 Database Verification

Your Cosmos DB MongoDB API contains:

### Tenants (2)
- **IKEA** - Blue branding (#0051BA)
- **Contoso Retail** - Orange branding (#FF6B35)

### Stores (3)
- **ikea-seattle** - 600 SW 43rd St, Renton WA
- **ikea-portland** - 10280 NE Cascades Pkwy, Portland OR  
- **ikea-nyc** - 1 Beard St, Brooklyn NY

---

## 🎯 What's Working

✅ **Infrastructure**
- AKS Cluster running (1 node, Kubernetes 1.31)
- NGINX Ingress Controller with external IP: 4.157.44.54
- Cosmos DB MongoDB API (serverless, free tier)
- Redis Cache (Basic C0, TLS enabled)

✅ **Backend Services**
- Node Auth Service (3 replicas scaled to 1)
- Go Routing Service (3 replicas scaled to 1)
- Both services connected to MongoDB and Redis via TLS
- Health checks passing

✅ **Networking**
- Ingress routing configured
- DNS via nip.io (no real domain needed for testing)
- CORS enabled for frontend integration

---

## 🚀 Next Steps

To fully test the routing service (protected endpoints), you need:

1. **Frontend Application** - Will handle authentication flow
2. **Token Exchange** - Frontend gets token from auth service
3. **Store Routing** - Frontend queries routing service with token

The frontend deployment is the next step to complete the end-to-end flow!

---

## 📝 Quick Reference

| Service | Endpoint | Status |
|---------|----------|--------|
| Auth Health | http://api.4.157.44.54.nip.io/health | ✅ Working |
| Auth API Docs | http://api.4.157.44.54.nip.io/api/docs | ✅ Working |
| Auth Metrics | http://api.4.157.44.54.nip.io/metrics | ✅ Working |
| Routing API | http://api.4.157.44.54.nip.io/api/v1/route | 🔒 Requires JWT |
| Routing Health | Internal only | ✅ Working |

---

**Deployment Complete!** The backend infrastructure is fully operational and ready for frontend integration.
