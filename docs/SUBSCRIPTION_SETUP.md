# Azure Subscription Setup

## Current Status

You are logged in to Azure with tenant-level access only. To deploy infrastructure, you need an active Azure subscription.

## Options to Get a Subscription

### Option 1: Azure Free Trial (Recommended for Testing)
- **$200 credit** for 30 days
- **12 months** of popular free services
- **25+ services** always free

**Steps:**
1. Visit: https://azure.microsoft.com/free/
2. Sign in with: bedrock.builder@amicissolutions.com
3. Provide credit card (not charged during trial)
4. Complete registration

**After creation:**
```powershell
az login
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

### Option 2: Pay-As-You-Go Subscription
- Pay only for what you use
- No upfront commitment
- Estimated monthly cost for this project: ~$160-210

**Create via Azure Portal:**
1. Go to: https://portal.azure.com
2. Navigate to "Subscriptions"
3. Click "+ Add"
4. Select "Pay-As-You-Go"

### Option 3: Contact Your Organization Admin
If Amicis Solutions Inc has an existing subscription:
1. Contact your Azure administrator
2. Request Contributor access to an existing subscription
3. They can add you via Azure Portal → Subscriptions → Access Control (IAM)

## Estimated Costs for This Project

**Monthly infrastructure costs:**
- AKS (2 nodes): ~$140-180
- Cosmos DB: FREE (using free tier)
- Redis Cache (Basic): ~$15-20
- Storage & Networking: ~$5-10

**Total: ~$160-210/month**

**Cost-saving tips:**
- Use free tier Cosmos DB (included in Terraform)
- Scale down AKS when not in use
- Delete dev environments when not testing

## After Getting a Subscription

Once you have a subscription, run:

```powershell
# Login
az login

# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show

# Continue with deployment
cd C:\Users\GudniVilmundarson\amicis-solution-accelerator
# Follow docs/AZURE_DEPLOYMENT.md
```

## Alternative: Local Development Only

If you want to continue without Azure:
- Use Docker Compose for local development
- Test all features locally
- Deploy to Azure later when subscription is available

Let me know which option you'd like to pursue!
