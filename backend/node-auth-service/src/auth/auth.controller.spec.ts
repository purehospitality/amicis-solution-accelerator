import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';
import { UnauthorizedException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    exchangeToken: jest.fn(),
  };

  const mockTenantService = {
    getTenantByIdOrName: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('exchangeToken', () => {
    it('should exchange token successfully', async () => {
      const mockToken = 'ikea:demo-token';
      const mockTenant = {
        id: 'ikea',
        name: 'IKEA',
      };
      const mockAccessToken = 'mock-access-token';

      mockAuthService.exchangeToken.mockResolvedValue({
        accessToken: mockAccessToken,
        tenant: mockTenant,
      });

      const result = await controller.exchangeToken({ userToken: mockToken });

      expect(result).toEqual({
        accessToken: mockAccessToken,
        tenant: mockTenant,
      });
      expect(mockAuthService.exchangeToken).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      const invalidToken = 'invalid-token-format';

      mockAuthService.exchangeToken.mockRejectedValue(
        new UnauthorizedException('Invalid token format'),
      );

      await expect(
        controller.exchangeToken({ userToken: invalidToken }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthService.exchangeToken).toHaveBeenCalledWith(invalidToken);
    });

    it('should throw UnauthorizedException for non-existent tenant', async () => {
      const mockToken = 'nonexistent:demo-token';

      mockAuthService.exchangeToken.mockRejectedValue(
        new UnauthorizedException('Tenant not found'),
      );

      await expect(
        controller.exchangeToken({ userToken: mockToken }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthService.exchangeToken).toHaveBeenCalledWith(mockToken);
    });

    it('should throw UnauthorizedException for invalid user token', async () => {
      const mockToken = 'ikea:invalid-user-token';

      mockAuthService.exchangeToken.mockRejectedValue(
        new UnauthorizedException('Invalid user token'),
      );

      await expect(
        controller.exchangeToken({ userToken: mockToken }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuthService.exchangeToken).toHaveBeenCalledWith(mockToken);
    });

    it('should handle empty token', async () => {
      const emptyToken = '';

      mockAuthService.exchangeToken.mockRejectedValue(
        new UnauthorizedException('Token is required'),
      );

      await expect(
        controller.exchangeToken({ userToken: emptyToken }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tenant information in response', async () => {
      const mockToken = 'ikea:demo-token';
      const mockTenant = {
        id: 'ikea',
        name: 'IKEA',
      };

      mockAuthService.exchangeToken.mockResolvedValue({
        accessToken: 'mock-access-token',
        tenant: mockTenant,
      });

      const result = await controller.exchangeToken({ userToken: mockToken });

      expect(result.tenant).toBeDefined();
      expect(result.tenant.id).toEqual('ikea');
      expect(result.tenant.name).toEqual('IKEA');
    });

    it('should handle service errors gracefully', async () => {
      const mockToken = 'ikea:demo-token';

      mockAuthService.exchangeToken.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        controller.exchangeToken({ userToken: mockToken }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
