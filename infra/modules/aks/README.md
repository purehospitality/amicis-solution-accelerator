# Azure Kubernetes Service (AKS) Module

This Terraform module creates an Azure Kubernetes Service (AKS) cluster with best practices for production workloads.

## Features

- **Multi-node pool architecture**: Separate system and user node pools
- **Auto-scaling**: Built-in support for cluster autoscaling
- **Azure AD integration**: RBAC with Azure Active Directory
- **Monitoring**: Integrated with Azure Monitor and Log Analytics
- **Network security**: Azure CNI with Network Policy
- **High availability**: Multi-zone deployment support
- **Auto-upgrade**: Configurable auto-upgrade channels
- **ACR integration**: Automatic role assignment for container registry pull
- **Secrets management**: Azure Key Vault integration

## Usage

```hcl
module "aks" {
  source = "../../modules/aks"

  project_name        = "amicis"
  environment         = "dev"
  tenant_id           = "ikea"
  location            = "westeurope"
  resource_group_name = module.foundation.resource_group_name
  subnet_id           = module.foundation.default_subnet_id
  
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  acr_id                     = module.acr.registry_id

  system_node_pool_config = {
    node_count          = 2
    vm_size             = "Standard_D2s_v3"
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 5
  }

  user_node_pools = {
    apps = {
      vm_size             = "Standard_D4s_v3"
      node_count          = 3
      enable_auto_scaling = true
      min_count           = 2
      max_count           = 10
    }
  }

  tags = {
    Owner = "Platform Team"
  }
}
```

## Node Pool Architecture

### System Node Pool
- Runs system-critical pods (CoreDNS, metrics-server, etc.)
- Tainted with `CriticalAddonsOnly=true:NoSchedule`
- Minimum 2 nodes for high availability
- Smaller VM sizes acceptable (D2s_v3)

### User Node Pools
- Runs application workloads
- Can have multiple pools for different workload types
- Supports auto-scaling based on CPU/memory
- Larger VM sizes for application performance (D4s_v3+)

## Network Configuration

The module uses Azure CNI networking with:
- **Network Plugin**: Azure CNI (provides pod IP addresses from VNet)
- **Network Policy**: Azure Network Policy (pod-to-pod network security)
- **Load Balancer**: Standard SKU (required for availability zones)
- **DNS Service IP**: Customizable (default: 10.2.0.10)
- **Service CIDR**: Customizable (default: 10.2.0.0/16)

## Security Features

1. **Azure AD RBAC**: Cluster access controlled via Azure AD groups
2. **Managed Identity**: System-assigned identity for Azure resource access
3. **Network Policies**: Pod-to-pod traffic control
4. **Key Vault Secrets**: CSI driver for secret management
5. **ACR Integration**: Automatic AcrPull role assignment

## Monitoring

Integrated with Azure Monitor:
- Container Insights enabled
- Logs sent to Log Analytics Workspace
- Prometheus metrics available
- Application performance monitoring

## Auto-Upgrade

Configurable upgrade channels:
- **patch**: Auto-upgrade to latest patch version
- **stable**: Auto-upgrade to latest stable minor version
- **rapid**: Auto-upgrade to latest version (preview + stable)
- **node-image**: Auto-upgrade node images only
- **none**: Manual upgrades only

## Maintenance Window

Optional maintenance window configuration:
```hcl
maintenance_window = {
  day   = "Sunday"
  hours = [2, 3, 4]  # 2 AM - 5 AM UTC
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5.0 |
| azurerm | ~> 3.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Project name for resource naming | string | - | yes |
| environment | Environment (dev/staging/prod) | string | - | yes |
| location | Azure region | string | - | yes |
| resource_group_name | Resource group name | string | - | yes |
| subnet_id | Subnet ID for AKS nodes | string | - | yes |
| log_analytics_workspace_id | Log Analytics workspace ID | string | - | yes |
| kubernetes_version | Kubernetes version | string | "1.28" | no |
| system_node_pool_config | System node pool configuration | object | See defaults | no |
| user_node_pools | Map of user node pools | map(object) | {} | no |
| acr_id | Azure Container Registry ID | string | null | no |
| automatic_channel_upgrade | Auto-upgrade channel | string | "stable" | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | AKS cluster ID |
| cluster_name | AKS cluster name |
| cluster_fqdn | AKS cluster FQDN |
| kubelet_identity_object_id | Kubelet identity object ID |
| kube_config | Kubernetes config (sensitive) |
| identity_principal_id | Cluster identity principal ID |
| node_resource_group | AKS node resource group |

## Post-Deployment

After deploying the cluster:

1. **Get credentials**:
   ```bash
   az aks get-credentials --resource-group <rg-name> --name <cluster-name>
   ```

2. **Verify cluster**:
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

3. **Deploy applications**:
   ```bash
   kubectl apply -f k8s/
   ```

## Best Practices

1. Use separate node pools for system and application workloads
2. Enable auto-scaling for production workloads
3. Deploy across availability zones for high availability
4. Use Azure CNI for better network performance
5. Enable Azure AD integration for RBAC
6. Monitor with Container Insights
7. Configure maintenance windows for production
8. Use ACR for private container images

## Multi-Tenancy

For multi-tenant deployments:
- Each tenant gets a dedicated AKS cluster (complete isolation)
- Use namespaces within cluster for logical separation
- Apply resource quotas per namespace
- Use network policies for pod isolation

## Cost Optimization

- Use auto-scaling to match demand
- Stop/start clusters in dev/test environments
- Use spot instances for non-critical workloads
- Right-size VM SKUs based on workload requirements
- Monitor with Azure Advisor for cost recommendations

## Support

For issues or questions:
- Review Azure AKS documentation
- Check Terraform azurerm provider docs
- Contact Platform Team

---

*Module version: 1.0.0*
