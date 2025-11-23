# Disaster Recovery Plan

This document outlines the disaster recovery (DR) strategy for the Amicis Solution Accelerator, including backup procedures, recovery processes, and business continuity measures.

## Executive Summary

**RTO (Recovery Time Objective)**: 4 hours  
**RPO (Recovery Point Objective)**: 1 hour  
**Availability Target**: 99.9% (8.76 hours downtime/year)

## 1. DR Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIMARY REGION (East US)                  │
│                                                              │
│  ┌────────────────┐         ┌────────────────┐             │
│  │ AKS Cluster    │         │ Azure Static   │             │
│  │ - Go Service   │         │ Web Apps       │             │
│  │ - Node Service │         │ (Frontend)     │             │
│  └───────┬────────┘         └────────────────┘             │
│          │                                                   │
│  ┌───────▼──────────────────────────────┐                  │
│  │     Azure Cosmos DB                   │                  │
│  │  - Automatic backups (every 4 hours)  │─────┐           │
│  │  - Point-in-time restore              │     │           │
│  │  - Geo-redundancy enabled             │     │           │
│  └───────────────────────────────────────┘     │           │
│                                                  │           │
│  ┌───────────────────────────────────┐         │           │
│  │   Azure Cache for Redis            │         │           │
│  │  - Persistence enabled (RDB)       │──┐      │           │
│  │  - Geo-replication (Premium tier)  │  │      │           │
│  └───────────────────────────────────┘  │      │           │
│                                           │      │           │
│  ┌───────────────────────────────────┐  │      │           │
│  │   Azure Key Vault                  │  │      │           │
│  │  - Soft delete enabled             │  │      │           │
│  │  - Purge protection enabled        │  │      │           │
│  └───────────────────────────────────┘  │      │           │
│                                           │      │           │
│  ┌───────────────────────────────────┐  │      │           │
│  │   Azure Container Registry         │  │      │           │
│  │  - Geo-replication enabled         │  │      │           │
│  │  - Retention policy: 90 days       │  │      │           │
│  └───────────────────────────────────┘  │      │           │
└──────────────────────────────────────────┼──────┼──────────┘
                                           │      │
                         Replication       │      │
                                           │      │
┌──────────────────────────────────────────┼──────┼──────────┐
│                SECONDARY REGION (West US) │      │          │
│                                           │      │          │
│  ┌───────────────────────────────────┐   │      │          │
│  │   Azure Cosmos DB (Read Replica)  │◄──┘      │          │
│  │  - Automatic failover              │          │          │
│  │  - Multi-region writes (optional)  │          │          │
│  └───────────────────────────────────┘          │          │
│                                                  │          │
│  ┌───────────────────────────────────┐          │          │
│  │   Azure Cache for Redis (Replica) │◄─────────┘          │
│  │  - Active geo-replication          │                     │
│  │  - Manual failover trigger         │                     │
│  └───────────────────────────────────┘                     │
│                                                              │
│  ┌───────────────────────────────────┐                     │
│  │   ACR Geo-Replica                  │                     │
│  │  - Synced container images         │                     │
│  └───────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 2. Backup Strategy

### 2.1 Cosmos DB Backups

**Automatic Backups**:
- **Frequency**: Every 4 hours (default)
- **Retention**: 30 days (can extend to 7-90 days)
- **Type**: Full backup + incremental
- **Storage**: Geo-redundant Azure Blob Storage

**Configuration** (Terraform):
```hcl
resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-amicis-${var.tenant}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  offer_type          = "Standard"
  kind                = "MongoDB"

  # Backup configuration
  backup {
    type                = "Continuous"  # Continuous (7 days) or Periodic (30 days)
    interval_in_minutes = 240          # 4 hours
    retention_in_hours  = 720          # 30 days
    storage_redundancy  = "Geo"        # Geo-redundant storage
  }

  # Geo-redundancy
  geo_location {
    location          = var.location
    failover_priority = 0
  }

  geo_location {
    location          = var.failover_location
    failover_priority = 1
  }
}
```

**Point-in-Time Restore (PITR)**:
- Continuous backup mode enables restore to any point within 7 days
- Granularity: Per second
- Scope: Entire account, specific database, or collection

**Restore Command** (Azure CLI):
```powershell
# Restore to a specific timestamp
az cosmosdb mongodb database restore `
  --account-name cosmos-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --name amicis `
  --restore-timestamp "2024-01-15T10:00:00Z" `
  --target-database-name amicis-restored
```

### 2.2 Redis Cache Backups

**RDB Persistence** (Premium tier):
- **Frequency**: Configurable (15 min, 1 hour, 6 hours, 12 hours, 24 hours)
- **Retention**: Multiple snapshots
- **Storage**: Azure Storage Account (geo-redundant)

**Configuration** (Azure Portal or Terraform):
```hcl
resource "azurerm_redis_cache" "main" {
  name                = "redis-amicis-${var.tenant}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  capacity            = 1
  family              = "P"  # Premium tier required for persistence
  sku_name            = "Premium"

  redis_configuration {
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60  # minutes
    rdb_backup_max_snapshot_count = 1
    rdb_storage_connection_string = azurerm_storage_account.backup.primary_connection_string
  }
}
```

**Manual Backup** (Azure CLI):
```powershell
# Export Redis database to storage
az redis export `
  --name redis-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --prefix backup-20240115 `
  --container backup-container `
  --file-format rdb
```

**Restore from Backup**:
```powershell
# Import Redis database from storage
az redis import `
  --name redis-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --files https://storageaccount.blob.core.windows.net/backup-container/backup-20240115.rdb
```

### 2.3 AKS Cluster Backups

**Velero** (Kubernetes Backup Tool):
```powershell
# Install Velero
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm install velero vmware-tanzu/velero `
  --namespace velero `
  --create-namespace `
  --set-file credentials.secretContents.cloud=./credentials-velero `
  --set configuration.provider=azure `
  --set configuration.backupStorageLocation.bucket=velero-backups `
  --set configuration.backupStorageLocation.config.resourceGroup=rg-amicis-ikea-dev `
  --set configuration.backupStorageLocation.config.storageAccount=stveleroamicis `
  --set snapshotsEnabled=true

# Create backup schedule (daily at 2 AM)
velero schedule create amicis-daily `
  --schedule="0 2 * * *" `
  --include-namespaces amicis `
  --ttl 720h  # 30 days retention
```

**Manual Backup**:
```powershell
# Backup entire amicis namespace
velero backup create amicis-manual-$(Get-Date -Format 'yyyyMMdd-HHmmss') `
  --include-namespaces amicis `
  --wait

# Verify backup
velero backup get
```

**What Gets Backed Up**:
- ✅ Deployments, Services, ConfigMaps
- ✅ Secrets (encrypted)
- ✅ PersistentVolumeClaims
- ✅ Custom Resource Definitions
- ❌ Node configurations
- ❌ Cluster-level resources (unless specified)

### 2.4 Azure Container Registry

**Geo-Replication**:
```hcl
resource "azurerm_container_registry" "main" {
  name                = "acramicis${var.tenant}${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Premium"  # Required for geo-replication

  georeplications {
    location = "westus"
    tags     = { environment = "dr" }
  }
}
```

**Retention Policy**:
```powershell
# Enable retention policy (delete untagged manifests after 30 days)
az acr config retention update `
  --name acramicisikeadev `
  --type UntaggedManifests `
  --days 30 `
  --status enabled
```

### 2.5 Application Code & Infrastructure

**Git Repository** (Primary Source of Truth):
- All code in GitHub with branch protection
- Infrastructure as Code in Terraform
- Daily automated backups to Azure DevOps Repos (mirror)

**Terraform State Backup**:
```powershell
# Terraform state stored in Azure Storage with versioning
az storage blob service-properties update `
  --account-name stterraformamicis `
  --enable-versioning

# State locking prevents concurrent modifications
# Automatic state backups retained for 30 days
```

## 3. Recovery Procedures

### 3.1 Database Recovery

#### Cosmos DB Recovery

**Scenario 1: Accidental Data Deletion** (last 7 days)

```powershell
# Step 1: Identify the timestamp before deletion
$restoreTimestamp = "2024-01-15T09:30:00Z"  # Before deletion

# Step 2: Create restore request
az cosmosdb sql database restore `
  --account-name cosmos-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --name amicis `
  --restore-timestamp $restoreTimestamp `
  --target-database-name amicis-restored

# Step 3: Verify data integrity
# Connect to amicis-restored and validate records

# Step 4: Switch applications to restored database
# Update ConfigMaps in Kubernetes:
kubectl set env deployment/go-routing-service `
  COSMOS_DATABASE=amicis-restored `
  -n amicis

# Step 5: After validation, rename databases
# (Manual process through Azure Portal or CLI)
```

**Scenario 2: Regional Outage** (automatic failover)

```powershell
# Cosmos DB automatically fails over to secondary region
# Monitor failover status:
az cosmosdb show `
  --name cosmos-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --query "writeLocations[0].locationName"

# After primary region recovers:
# Optional: Force failover back to primary
az cosmosdb failover-priority-change `
  --name cosmos-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --failover-policies "eastus=0" "westus=1"
```

#### Redis Cache Recovery

**Scenario: Cache Corruption**

```powershell
# Step 1: Export current state (if possible)
az redis export `
  --name redis-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --prefix emergency-backup `
  --container backup-container

# Step 2: Import from last known good backup
az redis import `
  --name redis-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --files https://stbackupamicis.blob.core.windows.net/backups/redis-20240115-0200.rdb

# Step 3: Verify cache warmup
# Monitor cache hit rate - should rebuild gradually
```

### 3.2 AKS Cluster Recovery

#### Full Cluster Rebuild

**Estimated Time**: 2-4 hours  
**Prerequisites**: Terraform state intact, ACR images available

```powershell
# Step 1: Destroy failed cluster (if needed)
cd infra/live/ikea-pilot/dev
terraform destroy -target=module.aks

# Step 2: Provision new AKS cluster
terraform apply -target=module.aks
# Expected duration: 15-30 minutes

# Step 3: Configure kubectl
az aks get-credentials `
  --name aks-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --overwrite-existing

# Step 4: Restore Kubernetes resources from Velero
velero restore create amicis-restore `
  --from-backup amicis-daily-20240115020000 `
  --wait

# Step 5: Verify deployments
kubectl get pods -n amicis
kubectl get services -n amicis

# Step 6: Update DNS/Ingress if needed
kubectl get ingress -n amicis

# Step 7: Run smoke tests
./scripts/smoke-test.ps1
```

#### Namespace Recovery

**Estimated Time**: 15-30 minutes

```powershell
# Step 1: Delete corrupted namespace
kubectl delete namespace amicis --force --grace-period=0

# Step 2: Restore from Velero backup
velero restore create amicis-namespace-restore `
  --from-backup amicis-daily-20240115020000 `
  --include-namespaces amicis `
  --wait

# Step 3: Verify pods are running
kubectl get pods -n amicis -w

# Step 4: Check service health
kubectl exec -n amicis deploy/go-routing-service -- wget -O- http://localhost:8080/health
kubectl exec -n amicis deploy/node-auth-service -- wget -O- http://localhost:3000/health
```

### 3.3 Application Recovery

#### Service Rollback

**Scenario: Bad Deployment**

```powershell
# Step 1: Identify last known good version
kubectl rollout history deployment/go-routing-service -n amicis

# Step 2: Rollback to previous version
kubectl rollout undo deployment/go-routing-service -n amicis

# Step 3: Monitor rollback progress
kubectl rollout status deployment/go-routing-service -n amicis

# Alternative: Rollback to specific revision
kubectl rollout undo deployment/go-routing-service -n amicis --to-revision=3
```

#### Container Image Recovery

**Scenario: ACR Image Corruption**

```powershell
# Step 1: Pull image from geo-replica
az acr import `
  --name acramicisikeadev `
  --source acramicisikeadev.westus.data.azurecr.io/go-routing-service:v1.0.4 `
  --image go-routing-service:v1.0.4

# Step 2: Re-deploy using known good image
kubectl set image deployment/go-routing-service `
  routing-service=acramicisikeadev.azurecr.io/go-routing-service:v1.0.4 `
  -n amicis

# Step 3: Rebuild from source (if replicas unavailable)
cd backend/go-routing-service
docker build -t acramicisikeadev.azurecr.io/go-routing-service:v1.0.4-rebuild .
docker push acramicisikeadev.azurecr.io/go-routing-service:v1.0.4-rebuild
```

### 3.4 Frontend Recovery

**Azure Static Web Apps** (automatic failover via CDN)

```powershell
# Step 1: Check deployment history
az staticwebapp show `
  --name gray-cliff-0abcbae0f `
  --query "defaultHostname"

# Step 2: Rollback to previous deployment (if needed)
# Via Azure Portal: Deployments -> Select previous -> Activate

# Step 3: Redeploy from Git (if corruption)
# Trigger GitHub Actions workflow or manual deployment:
cd frontend
npm run build
az staticwebapp deploy `
  --name gray-cliff-0abcbae0f `
  --app-location ./dist
```

## 4. DR Testing

### 4.1 Quarterly DR Drill

**Schedule**: Q1, Q2, Q3, Q4 (90-day intervals)

**Scenario**: Simulated regional outage

**Steps**:
1. ☐ Announce DR drill to team (24-hour notice)
2. ☐ Trigger Cosmos DB manual failover to secondary region
3. ☐ Verify application connectivity to secondary database
4. ☐ Simulate AKS cluster failure by scaling down to 0 replicas
5. ☐ Restore AKS using Velero backup
6. ☐ Validate all services healthy
7. ☐ Run full integration test suite
8. ☐ Measure RTO (target: < 4 hours)
9. ☐ Fail back to primary region
10. ☐ Document findings and improvements

**Success Criteria**:
- ✅ All services restored within RTO
- ✅ Data loss within RPO (< 1 hour)
- ✅ No manual intervention required for database failover
- ✅ Application automatically reconnects to secondary region

### 4.2 Monthly Backup Verification

**Schedule**: 1st day of each month

```powershell
# Verify Cosmos DB backup
az cosmosdb show `
  --name cosmos-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --query "backup.{type:type, interval:intervalInMinutes, retention:retentionInHours}"

# Verify Redis backup
az redis show `
  --name redis-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --query "redisConfiguration.rdbBackupEnabled"

# Verify Velero backups
velero backup get | Where-Object { $_.CompletionTimestamp -gt (Get-Date).AddDays(-30) }

# Test restore to non-production environment
velero restore create test-restore-$(Get-Date -Format 'yyyyMMdd') `
  --from-backup amicis-daily-$(Get-Date -Format 'yyyyMMdd') `
  --namespace-mappings amicis:amicis-test
```

## 5. RTO/RPO Targets

| Component | RTO | RPO | Backup Frequency | Recovery Method |
|-----------|-----|-----|------------------|-----------------|
| **Cosmos DB** | 5 min | 1 sec | Continuous | Automatic failover |
| **Redis Cache** | 2 hours | 1 hour | Hourly | Manual import |
| **AKS Cluster** | 4 hours | 24 hours | Daily | Terraform + Velero |
| **ACR** | 1 hour | Real-time | Geo-replication | Automatic sync |
| **Static Web App** | 30 min | 1 hour | On git push | Redeploy from Git |
| **Secrets (Key Vault)** | 1 hour | Real-time | Soft delete | Undelete command |

## 6. Incident Response

### Severity Levels

**Severity 1** (Critical - Full Outage):
- **Response Time**: 15 minutes
- **Escalation**: Immediate to on-call engineer
- **Examples**: Complete database loss, AKS cluster down, security breach

**Severity 2** (High - Partial Outage):
- **Response Time**: 1 hour
- **Escalation**: Within 30 minutes if not resolved
- **Examples**: Single service degraded, elevated error rates

**Severity 3** (Medium - Degraded Performance):
- **Response Time**: 4 hours
- **Escalation**: During business hours
- **Examples**: Slow queries, cache miss rate high

**Severity 4** (Low - Minor Issue):
- **Response Time**: Next business day
- **Escalation**: Not required
- **Examples**: Non-critical feature unavailable

### Incident Checklist

**Detection** (0-15 minutes):
- ☐ Alert triggered (Application Insights, Azure Monitor)
- ☐ Confirm incident severity
- ☐ Create incident ticket
- ☐ Page on-call engineer (Sev 1)

**Assessment** (15-30 minutes):
- ☐ Identify affected components
- ☐ Determine scope (all tenants vs single tenant)
- ☐ Check backup status and last known good state
- ☐ Establish communication channel (Teams/Slack)

**Mitigation** (30 min - 4 hours):
- ☐ Execute recovery procedures (see Section 3)
- ☐ Monitor recovery progress
- ☐ Update incident ticket with progress
- ☐ Communicate status to stakeholders

**Resolution** (after recovery):
- ☐ Verify all services healthy
- ☐ Run integration tests
- ☐ Monitor for recurring issues
- ☐ Close incident ticket

**Post-Mortem** (within 48 hours):
- ☐ Root cause analysis
- ☐ Timeline of events
- ☐ Lessons learned
- ☐ Action items for prevention
- ☐ Update DR procedures if needed

## 7. Contact Information

**On-Call Rotation**: PagerDuty  
**Incident Channel**: #amicis-incidents (Slack)  
**Escalation Path**:
1. On-Call Engineer
2. Engineering Manager
3. VP Engineering
4. CTO

**Azure Support**:
- Support Plan: Premier
- TAM (Technical Account Manager): [Name]
- Phone: 1-800-XXX-XXXX
- Portal: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade

## 8. Documentation & Runbooks

**Location**: `docs/runbooks/`

**Available Runbooks**:
- `cosmos-db-restore.md` - Cosmos DB recovery procedures
- `aks-cluster-rebuild.md` - AKS cluster recovery
- `redis-cache-recovery.md` - Redis cache restore
- `service-rollback.md` - Application rollback procedures
- `failover-test.md` - DR drill execution guide

## 9. Continuous Improvement

**Review Schedule**:
- **Monthly**: Backup verification
- **Quarterly**: DR drill execution
- **Annually**: DR plan comprehensive review

**Metrics to Track**:
- Actual RTO vs target
- Actual RPO vs target
- DR drill success rate
- Backup verification pass rate
- Mean time to detect (MTTD)
- Mean time to resolve (MTTR)

**Improvement Actions**:
1. Update RTO/RPO targets based on business needs
2. Automate manual recovery steps
3. Enhance monitoring and alerting
4. Reduce recovery times through automation
5. Improve documentation based on drill findings

## 10. References

- [Azure Cosmos DB Backup](https://docs.microsoft.com/en-us/azure/cosmos-db/online-backup-and-restore)
- [AKS Business Continuity](https://docs.microsoft.com/en-us/azure/aks/operator-best-practices-multi-region)
- [Velero Documentation](https://velero.io/docs/)
- [Azure Site Recovery](https://docs.microsoft.com/en-us/azure/site-recovery/)
- [Redis Persistence](https://redis.io/docs/management/persistence/)
