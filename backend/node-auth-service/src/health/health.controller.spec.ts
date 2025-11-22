import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';
import { HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('HealthController', () => {
  let controller: HealthController;
  let databaseService: DatabaseService;
  let redisMock: jest.Mocked<Redis>;

  beforeEach(async () => {
    redisMock = {
      connect: jest.fn(),
      ping: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => redisMock);

    const mockDb = {
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({}),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: {
            getDatabase: jest.fn().mockReturnValue(mockDb),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when all dependencies are up', async () => {
      redisMock.connect.mockResolvedValue(undefined);
      redisMock.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(result.status).toBe('healthy');
      expect(result.dependencies.mongodb.status).toBe('up');
      expect(result.dependencies.redis.status).toBe('up');
      expect(result.dependencies.mongodb.responseTime).toBeDefined();
      expect(result.dependencies.redis.responseTime).toBeDefined();
    });

    it('should return degraded status when Redis is down', async () => {
      redisMock.connect.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.mongodb.status).toBe('up');
      expect(result.dependencies.redis.status).toBe('down');
      expect(result.dependencies.redis.error).toBe('Connection refused');
    });

    it('should throw HttpException with 503 when MongoDB is down', async () => {
      const mockDb = {
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockRejectedValue(new Error('MongoDB unavailable')),
        }),
      };

      jest.spyOn(databaseService, 'getDatabase').mockReturnValue(mockDb as any);
      redisMock.connect.mockResolvedValue(undefined);
      redisMock.ping.mockResolvedValue('PONG');

      await expect(controller.check()).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
    });

    it('should measure response times for dependencies', async () => {
      redisMock.connect.mockResolvedValue(undefined);
      redisMock.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(result.dependencies.mongodb.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.dependencies.redis.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection on destroy', async () => {
      await controller.onModuleDestroy();
      expect(redisMock.quit).toHaveBeenCalled();
    });
  });
});
