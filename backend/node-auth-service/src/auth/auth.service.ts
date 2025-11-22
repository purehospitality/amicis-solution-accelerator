import { Injectable, UnauthorizedException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TenantService } from './tenant.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Exchange user token for backend access token
   * 
   * @param userToken - The user's authentication token (format: Bearer tenantId:usertoken)
   * @returns Backend access token and expiry information
   */
  async exchangeToken(userToken: string) {
    this.logger.log('Processing token exchange request', 'AuthService');

    // Extract tenantId from token (format: "tenantId:actualToken")
    const parts = userToken.split(':');
    if (parts.length < 2) {
      this.logger.warn('Invalid token format received', 'AuthService');
      throw new UnauthorizedException('Invalid token format');
    }

    const tenantId = parts[0];
    const actualToken = parts.slice(1).join(':');

    // Retrieve tenant configuration from database
    const tenantConfig = await this.tenantService.getTenantConfig(tenantId);
    this.logger.log(`Retrieved config for tenant: ${tenantConfig.name}`, 'AuthService');

    // TODO: Call retailer's token endpoint with tenantConfig.authConfig
    // For now, return mock response with tenant-specific data
    return {
      accessToken: `backend-token-for-${tenantId}`,
      expiresIn: 3600,
      tenant: {
        id: tenantConfig.tenantId,
        name: tenantConfig.name,
      },
    };
  }
}
