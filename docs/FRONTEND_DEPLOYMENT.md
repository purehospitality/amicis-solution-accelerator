# Frontend Deployment Guide

## 🎉 Deployment Complete

The Amicis Multi-Tenant Foundation Platform frontend has been successfully deployed to Azure Static Web Apps.

## 🌐 URLs

- **Frontend Application**: https://gray-cliff-0abcbae0f.3.azurestaticapps.net
- **Backend API**: http://api.4.157.44.54.nip.io
- **Auth Service Health**: http://api.4.157.44.54.nip.io/health
- **API Documentation**: http://api.4.157.44.54.nip.io/api/docs

## 🔐 Test Credentials

Use these credentials to test the authentication flow:

### IKEA Tenant
- **Tenant ID**: `ikea`
- **User Token**: `user-token-123`
- **Combined Format**: `ikea:user-token-123`

### Contoso Tenant
- **Tenant ID**: `contoso`
- **User Token**: `user-token-456`
- **Combined Format**: `contoso:user-token-456`

## 🧪 End-to-End Testing Steps

### Step 1: Access the Application
1. Open browser: https://gray-cliff-0abcbae0f.3.azurestaticapps.net
2. You should see the login page with "Welcome to Amicis"

### Step 2: Test Login Flow
1. Enter Tenant ID: `ikea`
2. Enter User Token: `user-token-123`
3. Click "Sign In"
4. **Expected**: Redirect to `/stores` page with list of IKEA stores

### Step 3: Test Store Selection
1. You should see 3 IKEA stores:
   - IKEA Seattle
   - IKEA Portland
   - IKEA Brooklyn
2. Click on any store
3. **Expected**: Redirect to `/home` page showing store details

### Step 4: Test Home Page
1. Verify tenant information displays correctly
2. Verify store information displays correctly
3. Test "Change Store" button → should return to `/stores`
4. Test "Logout" button → should return to `/login`

### Step 5: Test Protected Routes
1. Logout from the application
2. Try accessing `/stores` directly: https://gray-cliff-0abcbae0f.3.azurestaticapps.net/stores
3. **Expected**: Auto-redirect to `/login` (auth protection working)

### Step 6: Test Multi-Tenancy
1. Login with Contoso credentials: `contoso:user-token-456`
2. **Expected**: Different tenant branding/context
3. **Expected**: Different set of stores (if any configured for Contoso)

## 🔍 Browser DevTools Testing

### Check Network Tab
1. Open DevTools → Network tab
2. Login with IKEA credentials
3. Verify API calls:
   - ✅ POST `http://api.4.157.44.54.nip.io/auth/exchange` → 200 OK
   - ✅ GET `http://api.4.157.44.54.nip.io/api/v1/stores` → 200 OK (with JWT)
4. Check request headers for Authorization: `Bearer {token}`

### Check Application Tab
1. Open DevTools → Application tab
2. Navigate to Local Storage → `https://gray-cliff-0abcbae0f.3.azurestaticapps.net`
3. Verify key: `amicis-auth-storage`
4. Verify stored data contains:
   - `state.isAuthenticated: true`
   - `state.accessToken: "eyJ..."`
   - `state.tenant: {id: "ikea", name: "IKEA", ...}`

### Check Console
1. Open DevTools → Console tab
2. No errors should appear during:
   - Page load
   - Login flow
   - Store selection
   - Navigation

## 🐛 Troubleshooting

### Issue: Login fails with "Invalid credentials"
**Solution**: Verify backend is healthy at http://api.4.157.44.54.nip.io/health

### Issue: Stores page shows no stores
**Possible Causes**:
1. JWT token not being sent → Check Network tab for Authorization header
2. Backend routing service down → Check http://api.4.157.44.54.nip.io/health
3. Cosmos DB connection issue → Check backend pod logs: `kubectl logs -n amicis -l app=go-routing-service`

### Issue: CORS errors in console
**Solution**: Backend ingress already configured with CORS headers. If errors persist:
```powershell
kubectl get ingress -n amicis -o yaml
# Verify nginx.ingress.kubernetes.io/cors-allow-origin annotation
```

### Issue: Page shows 404 or blank
**Solution**: Static Web App SPA routing configured. Check:
1. Browser URL is correct: https://gray-cliff-0abcbae0f.3.azurestaticapps.net
2. Clear browser cache and reload
3. Check staticwebapp.config.json is deployed

## 📊 Backend Health Check

Run this command to verify backend services:
```powershell
Invoke-WebRequest -Uri "http://api.4.157.44.54.nip.io/health" | ConvertFrom-Json | ConvertTo-Json -Depth 3
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-23T02:57:23.965Z",
  "dependencies": {
    "mongodb": {
      "status": "up",
      "responseTime": 2
    },
    "redis": {
      "status": "up",
      "responseTime": 47
    }
  }
}
```

## 🏗️ Architecture Overview

### Foundation Platform Components (Deployed ✅)

**Frontend** (Azure Static Web Apps):
- React 18.2 with TypeScript
- Vite 5.0 build tool
- Zustand state management
- React Router for navigation
- URL: https://gray-cliff-0abcbae0f.3.azurestaticapps.net

**Backend Services** (AKS):
- Node Auth Service (2 pods) → http://api.4.157.44.54.nip.io/auth
- Go Routing Service (3 pods) → http://api.4.157.44.54.nip.io/api/v1

**Infrastructure**:
- Kubernetes Cluster (AKS 1.31)
- Cosmos DB (MongoDB API) → 2 tenants, 3 stores
- Redis Cache (Basic C0 with TLS)
- NGINX Ingress Controller
- Azure Container Registry

### Future Business Solutions (To Be Added)

These will plug into the foundation platform as modular features:

1. **IKEA Wishlist Solution**
   - Product browsing and search
   - Wishlist management
   - Product availability checking
   - New microservice + new frontend pages

2. **Store Manager App Solution**
   - Inventory management
   - Staff scheduling
   - Store analytics dashboard
   - New microservice + new frontend pages

3. **Kiosk Assistant App Solution**
   - Product lookup and wayfinding
   - Store map integration
   - QR code scanning
   - New microservice + new frontend pages

## 🚀 Next Steps

1. **Test the deployed application** using the steps above
2. **Validate all user flows** work correctly
3. **Monitor Application Insights** (if configured)
4. **Plan first business solution** to add to the platform
5. **Set up CI/CD pipeline** for automated deployments
6. **Configure custom domain** (optional)
7. **Add Application Insights** for frontend telemetry (optional)

## 📝 Configuration Files

### Environment Variables (.env.production)
```env
VITE_API_URL=http://api.4.157.44.54.nip.io
VITE_AUTH_URL=http://api.4.157.44.54.nip.io
VITE_ENVIRONMENT=production
```

### Static Web App Config (staticwebapp.config.json)
- SPA routing enabled (all routes → /index.html)
- Security headers configured
- CORS headers enabled
- 404 override to /index.html for client-side routing

## 🔒 Security Notes

- Frontend uses HTTPS (automatically provided by Azure Static Web Apps)
- Backend currently uses HTTP (suitable for development/testing)
- JWT tokens stored in localStorage with Zustand persist
- Protected routes require authentication
- CORS configured to allow cross-origin requests

## 💰 Cost Estimation

**Current Monthly Cost**:
- Azure Static Web Apps (Free tier): **$0**
- AKS (1 node D2s_v3): **~$75**
- Cosmos DB (Serverless): **~$0-10**
- Redis (Basic C0): **~$16**
- Container Registry (Basic): **~$5**
- **Total: ~$96-106/month**

## 📞 Support

For issues or questions:
1. Check backend health: http://api.4.157.44.54.nip.io/health
2. Review pod logs: `kubectl logs -n amicis -l app=node-auth-service`
3. Check ingress status: `kubectl get ingress -n amicis`
4. Verify Static Web App status: `az staticwebapp show --name swa-amicis-frontend-dev`

---

**Deployment Date**: November 22, 2025  
**Frontend Version**: v1.0.0  
**Backend Version**: Auth v1.0.4, Routing v1.0.2  
**Status**: ✅ Foundation Platform Deployed
