import { Injectable, NotFoundException, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import Redis from 'ioredis';
import { DatabaseService } from '../database/database.service';
import { TenantConfigDto } from './dto/tenant-config.dto';

@Injectable()
export class TenantService {
  private redisClient: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour in seconds
  private readonly CACHE_PREFIX = 'tenant:';

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {
    // Initialize Redis client
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      tls: process.env.REDIS_PORT === '6380' ? {} : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, 'TenantService');
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis connected successfully', 'TenantService');
    });
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfigDto> {
    this.logger.log(`Fetching tenant config for: ${tenantId}`, 'TenantService');

    // Try to get from cache first
    const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for tenant: ${tenantId}`, 'TenantService');
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache read error for tenant ${tenantId}: ${error.message}`, 'TenantService');
      // Continue to database query if cache fails
    }

    // Cache miss - query database
    this.logger.log(`Cache miss for tenant: ${tenantId}`, 'TenantService');
    const db = this.databaseService.getDatabase();
    const tenant = await db.collection('tenants').findOne({ tenantId });

    if (!tenant) {
      this.logger.warn(`Tenant not found: ${tenantId}`, 'TenantService');
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    const tenantConfig: TenantConfigDto = {
      tenantId: tenant.tenantId,
      name: tenant.name,
      authConfig: tenant.authConfig,
      branding: tenant.branding,
    };

    // Store in cache
    try {
      await this.redisClient.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(tenantConfig),
      );
      this.logger.log(`Cached tenant config for: ${tenantId}`, 'TenantService');
    } catch (error) {
      this.logger.warn(`Cache write error for tenant ${tenantId}: ${error.message}`, 'TenantService');
      // Continue even if caching fails
    }

    return tenantConfig;
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

  /**
   * Invalidate cached tenant configuration
   * Call this when tenant config is updated
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
    try {
      await this.redisClient.del(cacheKey);
      this.logger.log(`Invalidated cache for tenant: ${tenantId}`, 'TenantService');
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for tenant ${tenantId}: ${error.message}`, 'TenantService');
    }
  }

  /**
   * Warm up cache for all tenants
   * Useful for application startup or periodic refresh
   */
  async warmupCache(): Promise<void> {
    this.logger.log('Warming up tenant cache', 'TenantService');
    const tenants = await this.getAllTenants();
    
    for (const tenant of tenants) {
      const cacheKey = `${this.CACHE_PREFIX}${tenant.tenantId}`;
      try {
        await this.redisClient.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(tenant),
        );
      } catch (error) {
        this.logger.warn(`Failed to warm cache for tenant ${tenant.tenantId}: ${error.message}`, 'TenantService');
      }
    }
    
    this.logger.log(`Warmed up cache for ${tenants.length} tenants`, 'TenantService');
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
