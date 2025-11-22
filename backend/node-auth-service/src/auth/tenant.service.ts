import { Injectable, NotFoundException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DatabaseService } from '../database/database.service';
import { TenantConfigDto } from './dto/tenant-config.dto';

@Injectable()
export class TenantService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getTenantConfig(tenantId: string): Promise<TenantConfigDto> {
    this.logger.log(`Fetching tenant config for: ${tenantId}`, 'TenantService');

    const db = this.databaseService.getDatabase();
    const tenant = await db.collection('tenants').findOne({ tenantId });

    if (!tenant) {
      this.logger.warn(`Tenant not found: ${tenantId}`, 'TenantService');
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    return {
      tenantId: tenant.tenantId,
      name: tenant.name,
      authConfig: tenant.authConfig,
      branding: tenant.branding,
    };
  }

  async getAllTenants(): Promise<TenantConfigDto[]> {
    const db = this.databaseService.getDatabase();
    const tenants = await db.collection('tenants').find({}).toArray();

    return tenants.map(tenant => ({
      tenantId: tenant.tenantId,
      name: tenant.name,
      authConfig: tenant.authConfig,
      branding: tenant.branding,
    }));
  }
}
