# Wishlist Feature - Deployment Guide

## 🎯 Implementation Complete

The complete wishlist feature has been implemented with:
- ✅ Full frontend UI (Products catalog + Wishlist management)
- ✅ Backend API (3 endpoints with MongoDB storage)
- ✅ Docker image v1.2.0 built and pushed to ACR
- ✅ All code committed to GitHub

## 📦 What's New in v1.2.0

### Backend Endpoints
```
GET    /api/v1/commerce/wishlist?storeId={}&customerId={}
POST   /api/v1/commerce/wishlist/items
DELETE /api/v1/commerce/wishlist/items/{itemId}?storeId={}&customerId={}
```

### Frontend Pages
- **ProductsPage** (`/products`) - Browse catalog with category filters, add/remove wishlist
- **WishlistPage** (`/wishlist`) - View saved items, remove from wishlist, see total value
- **ProductCard** - Reusable component with heart toggle, price, inventory

### Technical Details
- **Storage**: Cosmos DB MongoDB API, `wishlists` collection
- **State Management**: Zustand with localStorage persistence
- **Product Details**: Fetched from retail connectors (IKEA, SAP, etc.)
- **Image**: `acramicisikeadev.azurecr.io/go-routing-service:v1.2.0`
- **Digest**: `sha256:86b5c6fbf6addd27ae8ce9b392f91c6a658cb2ab81cdb023cdbc3803dc3abaed`

## ⏳ Deployment Required

The AKS pods need to be **manually restarted** to use the new v1.2.0 image.

### Option 1: Azure Portal (Recommended)

1. Open [Azure Portal](https://portal.azure.com)
2. Navigate to: **Kubernetes services** → `aks-amicis-ikea-dev`
3. Click: **Workloads** → **Deployments**
4. Find: `go-routing-service` (namespace: `amicis`)
5. Click: **Restart** button (top menu)
6. Wait: 30-60 seconds for pods to restart

### Option 2: Interactive Script

```powershell
.\scripts\restart-aks-deployment.ps1
```

This script provides:
- Detailed step-by-step instructions
- Option to open Azure Portal
- Copy kubectl commands to clipboard
- Run verification test after deployment

### Option 3: Install Tools (Future Use)

**Install kubelogin:**
```powershell
choco install kubelogin
```

**Then restart deployment:**
```powershell
kubectl rollout restart deployment/go-routing-service -n amicis
```

**Or use Azure CLI:**
```powershell
az aks command invoke \
  --resource-group rg-amicis-ikea-dev \
  --name aks-amicis-ikea-dev \
  --command 'kubectl rollout restart deployment/go-routing-service -n amicis'
```

## 🧪 Testing After Deployment

### Automated API Test

```powershell
.\scripts\test-wishlist-api.ps1
```

This will:
1. ✅ Authenticate with the API
2. ✅ Get empty wishlist
3. ✅ Fetch products
4. ✅ Add product to wishlist
5. ✅ Verify item added
6. ✅ Remove item from wishlist
7. ✅ Verify item removed

**Expected Output:**
```
✅ ALL TESTS PASSED! 🎉
Wishlist API v1.2.0 is fully functional!
```

### Manual UI Test

The frontend is running at: **http://localhost:3001**

**Test Steps:**
1. Open: http://localhost:3001
2. Login with:
   - Tenant ID: `ikea`
   - User Token: `test-token-123`
3. Select any store (e.g., IKEA Seattle)
4. Click: **🛒 Browse Products**
5. Click: **🤍** (heart icon) on any product
   - Heart should turn to **❤️**
   - Wishlist badge should show **(1)**
6. Click: **❤️ Wishlist (1)**
7. Verify: Product appears in wishlist with details
8. Click: **Remove** button
9. Verify: Empty state message appears

### Sample Products Available
- BILLY Bookcase - $79.99
- KALLAX Shelf Unit - $89.99
- POÄNG Armchair - $129.99
- LACK Coffee Table - $49.99
- EKTORP Sofa - $699.99

## 🔍 Troubleshooting

### "404 Not Found" on Wishlist API

**Cause:** Pods haven't been restarted yet, still running v1.1.0

**Solution:** Complete the manual restart steps above

**Verify pod status:**
```powershell
# If kubelogin is installed:
kubectl get pods -n amicis -l app=go-routing-service

# Check image version:
kubectl describe pod -n amicis -l app=go-routing-service | Select-String "Image:"
```

### Frontend Not Loading

**Check dev server:**
```powershell
# Should show running on port 3001
Get-Process -Name node -ErrorAction SilentlyContinue
```

**Restart if needed:**
```powershell
cd frontend
npm run dev -- --host
```

### Mixed Content Errors

The frontend runs on **HTTP** (localhost:3001) and backend on **HTTPS** (api.4.157.44.54.nip.io).

This is intentional for local development. The `--host` flag enables network access.

## 📊 Implementation Summary

### Git Commits
- **b72d479** - feat: add complete wishlist UI with products catalog
- **4ac556e** - fix: correct store ID property reference
- **b8c0125** - feat: add wishlist API endpoints to go-routing-service
- **00effc7** - chore: add deployment helper scripts

### Files Changed
**Frontend (7 files, 905+ lines):**
- `frontend/src/pages/ProductsPage.tsx` (267 lines)
- `frontend/src/pages/WishlistPage.tsx` (267 lines)
- `frontend/src/components/ProductCard.tsx` (167 lines)
- `frontend/src/store/wishlistStore.ts` (60 lines)
- `frontend/src/services/api.ts` (+3 methods)
- `frontend/src/App.tsx` (+2 routes)
- `frontend/src/pages/HomePage.tsx` (+quick actions)

**Backend (2 files, 240 lines):**
- `backend/go-routing-service/commerce_handlers.go` (+3 handlers)
- `backend/go-routing-service/main.go` (+3 routes)

**Scripts (2 files, 295 lines):**
- `scripts/restart-aks-deployment.ps1` (Interactive deployment guide)
- `scripts/test-wishlist-api.ps1` (Automated integration tests)

## 🚀 Next Steps

1. **Deploy Now**: Restart AKS pods using Azure Portal
2. **Verify**: Run `.\scripts\test-wishlist-api.ps1`
3. **Test UI**: Browse products and add to wishlist
4. **Monitor**: Check MongoDB for wishlist documents
5. **Demo Ready**: Feature fully functional for presentations

## 📞 Support

**Helper Scripts:**
- `.\scripts\restart-aks-deployment.ps1` - Deployment instructions
- `.\scripts\test-wishlist-api.ps1` - API verification

**Documentation:**
- [Wishlist Backend Implementation](backend/go-routing-service/README.md)
- [Frontend Setup](frontend/README.md)
- [Kubernetes Deployment](docs/K8S_DEPLOYMENT.md)

---

**Status**: ✅ Implementation Complete | ⏳ Deployment Pending Manual Restart
