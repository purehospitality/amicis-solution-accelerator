import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { Public } from '../auth/decorators/public.decorator';
import Redis from 'ioredis';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  dependencies: {
    mongodb: { status: 'up' | 'down'; responseTime?: number; error?: string };
    redis: { status: 'up' | 'down'; responseTime?: number; error?: string };
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(private readonly databaseService: DatabaseService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry in health checks
    });
  }

  @Public()
  @Get()
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Returns service health status with dependency checks'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string' },
        dependencies: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy'
  })
  async check(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        mongodb: { status: 'down' },
        redis: { status: 'down' },
      },
    };

    // Check MongoDB
    const mongoStart = Date.now();
    try {
      const db = this.databaseService.getDatabase();
      await db.admin().ping();
      result.dependencies.mongodb = {
        status: 'up',
        responseTime: Date.now() - mongoStart,
      };
    } catch (error) {
      result.dependencies.mongodb = {
        status: 'down',
        error: error.message,
      };
      result.status = 'unhealthy';
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      await this.redis.connect();
      await this.redis.ping();
      result.dependencies.redis = {
        status: 'up',
        responseTime: Date.now() - redisStart,
      };
      await this.redis.disconnect();
    } catch (error) {
      result.dependencies.redis = {
        status: 'down',
        error: error.message,
      };
      result.status = result.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Return 503 if unhealthy
    if (result.status === 'unhealthy') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
