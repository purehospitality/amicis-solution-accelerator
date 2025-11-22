export class TenantConfigDto {
  tenantId: string;
  name: string;
  authConfig: {
    tokenEndpoint: string;
    clientId: string;
    scope?: string;
  };
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

export class StoreConfigDto {
  storeId: string;
  tenantId: string;
  name: string;
  backendUrl: string;
  backendContext: Record<string, any>;
  location?: {
    lat: number;
    lon: number;
  };
}
