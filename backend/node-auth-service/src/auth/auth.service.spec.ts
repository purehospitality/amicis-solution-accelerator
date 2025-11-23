import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

// Mock Redis instance
const mockRedisInstance = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

// Mock ioredis module
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockRedisInstance),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let tenantService: TenantService;
  let httpService: HttpService;

  const mockTenantConfig = {
    tenantId: 'ikea',
    name: 'IKEA',
    authConfig: {
      tokenEndpoint: 'https://auth.ikea.com/token',
      clientId: 'amicis-client',
      scope: 'store:read',
    },
  };

  const mockTokenResponse = {
    access_token: 'backend-access-token-xyz',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TenantService,
          useValue: {
            getTenantConfig: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tenantService = module.get<TenantService>(TenantService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exchangeToken', () => {
    it('should throw UnauthorizedException for invalid token format', async () => {
      await expect(service.exchangeToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return cached token if available and valid', async () => {
      const cachedToken = {
        accessToken: 'cached-token',
        expiresAt: Date.now() + 600000, // 10 minutes from now
        tenant: {
          id: 'ikea',
          name: 'IKEA',
        },
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedToken));

      const result = await service.exchangeToken('ikea:user-token-123');

      expect(result.accessToken).toBe('cached-token');
      expect(result.tenant.id).toBe('ikea');
      expect(mockRedisInstance.get).toHaveBeenCalled();
      expect(tenantService.getTenantConfig).not.toHaveBeenCalled();
    });

    it('should call token endpoint and cache result on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      jest.spyOn(tenantService, 'getTenantConfig').mockResolvedValue(mockTenantConfig);

      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(axiosResponse));

      const result = await service.exchangeToken('ikea:user-token-123');

      expect(result.accessToken).toBe('backend-access-token-xyz');
      expect(result.expiresIn).toBe(3600);
      expect(result.tenant.id).toBe('ikea');
      expect(result.tenant.name).toBe('IKEA');
      
      expect(tenantService.getTenantConfig).toHaveBeenCalledWith('ikea');
      expect(httpService.post).toHaveBeenCalledWith(
        mockTenantConfig.authConfig.tokenEndpoint,
        expect.objectContaining({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          client_id: mockTenantConfig.authConfig.clientId,
          subject_token: 'user-token-123',
        }),
        expect.any(Object),
      );
      
      expect(mockRedisInstance.setex).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on 401 response', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      jest.spyOn(tenantService, 'getTenantConfig').mockResolvedValue(mockTenantConfig);

      const error = {
        response: {
          status: 401,
          data: { error: 'invalid_token' },
        },
      } as AxiosError;

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(service.exchangeToken('ikea:user-token-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw SERVICE_UNAVAILABLE on connection error', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      jest.spyOn(tenantService, 'getTenantConfig').mockResolvedValue(mockTenantConfig);

      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      } as any;

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(service.exchangeToken('ikea:user-token-123')).rejects.toThrow(
        HttpException,
      );

      try {
        await service.exchangeToken('ikea:user-token-123');
      } catch (e) {
        expect(e.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should handle token with colon in actual token part', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      jest.spyOn(tenantService, 'getTenantConfig').mockResolvedValue(mockTenantConfig);

      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(axiosResponse));

      // Token with colons in the actual token part (e.g., JWT with : in payload)
      const result = await service.exchangeToken('ikea:token:with:colons');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          subject_token: 'token:with:colons',
        }),
        expect.any(Object),
      );
    });

    it('should not cache token if caching fails', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'));
      
      jest.spyOn(tenantService, 'getTenantConfig').mockResolvedValue(mockTenantConfig);

      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(axiosResponse));

      // Should still return result even if caching fails
      const result = await service.exchangeToken('ikea:user-token-123');

      expect(result.accessToken).toBe('backend-access-token-xyz');
    });

    it('should skip expired cached tokens', async () => {
      const expiredToken = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        tenant: {
          id: 'ikea',
          name: 'IKEA',
        },
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(expiredToken));
      jest.spyOn(tenantService, 'getTenantConfig').mockResolvedValue(mockTenantConfig);

      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(axiosResponse));

      const result = await service.exchangeToken('ikea:user-token-123');

      // Should get fresh token, not expired cached one
      expect(result.accessToken).toBe('backend-access-token-xyz');
      expect(mockRedisInstance.del).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });
  });
});
