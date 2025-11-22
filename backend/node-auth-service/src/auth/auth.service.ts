import { Injectable, UnauthorizedException, Inject, LoggerService, HttpException, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TenantService } from './tenant.service';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import Redis from 'ioredis';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
  tenant: {
    id: string;
    name: string;
  };
}

@Injectable()
export class AuthService {
  private readonly redis: Redis;
  private readonly TOKEN_CACHE_PREFIX = 'token:';
  private readonly TOKEN_REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(
    private readonly tenantService: TenantService,
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    // Initialize Redis client
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err, 'AuthService');
    });
  }

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

    // Check cache first
    const cacheKey = this.getCacheKey(tenantId, actualToken);
    const cachedToken = await this.getCachedToken(cacheKey);
    
    if (cachedToken) {
      this.logger.log(`Cache hit for tenant: ${tenantId}`, 'AuthService');
      return {
        accessToken: cachedToken.accessToken,
        expiresIn: Math.floor((cachedToken.expiresAt - Date.now()) / 1000),
        tenant: cachedToken.tenant,
      };
    }

    // Retrieve tenant configuration from database
    const tenantConfig = await this.tenantService.getTenantConfig(tenantId);
    this.logger.log(`Retrieved config for tenant: ${tenantConfig.name}`, 'AuthService');

    // Call retailer's token endpoint
    try {
      const tokenResponse = await this.callTokenEndpoint(
        tenantConfig.authConfig.tokenEndpoint,
        tenantConfig.authConfig.clientId,
        actualToken,
        tenantConfig.authConfig.scope
      );

      const result = {
        accessToken: tokenResponse.access_token,
        expiresIn: tokenResponse.expires_in || 3600,
        tenant: {
          id: tenantConfig.tenantId,
          name: tenantConfig.name,
        },
      };

      // Cache the token (with 5 minute buffer before actual expiry)
      const cacheExpiry = (tokenResponse.expires_in || 3600) - 300;
      await this.cacheToken(cacheKey, result, cacheExpiry);

      this.logger.log(`Successfully exchanged token for tenant: ${tenantId}`, 'AuthService');
      return result;

    } catch (error) {
      this.logger.error(
        `Token exchange failed for tenant: ${tenantId}`,
        error.stack,
        'AuthService'
      );

      // Provide specific error messages
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid user token');
      } else if (error.response?.status === 403) {
        throw new UnauthorizedException('Token exchange forbidden');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new HttpException(
          'Retailer authentication service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        'Token exchange failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Call the retailer's token endpoint
   */
  private async callTokenEndpoint(
    endpoint: string,
    clientId: string,
    userToken: string,
    scope?: string
  ): Promise<{ access_token: string; expires_in: number; token_type?: string }> {
    const requestBody = {
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id: clientId,
      subject_token: userToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      ...(scope && { scope }),
    };

    this.logger.debug(`Calling token endpoint: ${endpoint}`, 'AuthService');

    const response = await firstValueFrom(
      this.httpService.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }).pipe(
        timeout(this.TOKEN_REQUEST_TIMEOUT),
        catchError((error) => {
          this.logger.error(
            `HTTP request to ${endpoint} failed`,
            error.message,
            'AuthService'
          );
          throw error;
        })
      )
    );

    return response.data;
  }

  /**
   * Generate cache key for token
   */
  private getCacheKey(tenantId: string, userToken: string): string {
    // Hash the user token for privacy (using simple approach)
    const tokenHash = Buffer.from(userToken).toString('base64').substring(0, 16);
    return `${this.TOKEN_CACHE_PREFIX}${tenantId}:${tokenHash}`;
  }

  /**
   * Get cached token if valid
   */
  private async getCachedToken(cacheKey: string): Promise<CachedToken | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      const token: CachedToken = JSON.parse(cached);
      
      // Check if token is still valid
      if (token.expiresAt <= Date.now()) {
        await this.redis.del(cacheKey);
        return null;
      }

      return token;
    } catch (error) {
      this.logger.warn('Cache read error', 'AuthService');
      return null;
    }
  }

  /**
   * Cache token with expiry
   */
  private async cacheToken(
    cacheKey: string,
    tokenData: { accessToken: string; expiresIn: number; tenant: { id: string; name: string } },
    ttlSeconds: number
  ): Promise<void> {
    try {
      const cachedToken: CachedToken = {
        accessToken: tokenData.accessToken,
        expiresAt: Date.now() + (ttlSeconds * 1000),
        tenant: tokenData.tenant,
      };

      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(cachedToken));
      this.logger.debug(`Token cached with TTL: ${ttlSeconds}s`, 'AuthService');
    } catch (error) {
      this.logger.warn('Cache write error', 'AuthService');
      // Don't fail the request if caching fails
    }
  }

  /**
   * Cleanup Redis connection on service destroy
   */
  async onModuleDestroy() {
    await this.redis.quit();
  }
}
