import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import * as client from 'prom-client';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  private readonly register: client.Registry;
  
  // Custom metrics
  private readonly httpRequestDuration: client.Histogram;
  private readonly httpRequestTotal: client.Counter;
  private readonly activeConnections: client.Gauge;
  private readonly tokenExchangeCounter: client.Counter;
  private readonly tokenExchangeDuration: client.Histogram;

  constructor() {
    // Create a Registry
    this.register = new client.Registry();

    // Add default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });

    // HTTP request duration histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    // HTTP request total counter
    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // Active connections gauge
    this.activeConnections = new client.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    // Token exchange counter
    this.tokenExchangeCounter = new client.Counter({
      name: 'token_exchange_total',
      help: 'Total number of token exchanges',
      labelNames: ['tenant_id', 'status'],
      registers: [this.register],
    });

    // Token exchange duration histogram
    this.tokenExchangeDuration = new client.Histogram({
      name: 'token_exchange_duration_seconds',
      help: 'Duration of token exchange operations in seconds',
      labelNames: ['tenant_id'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });
  }

  @Public()
  @Get()
  @Header('Content-Type', client.register.contentType)
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Returns Prometheus metrics' })
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  // Helper methods to record metrics (to be called from other services)
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  recordTokenExchange(tenantId: string, success: boolean, duration: number): void {
    this.tokenExchangeCounter.inc({
      tenant_id: tenantId,
      status: success ? 'success' : 'failure',
    });
    this.tokenExchangeDuration.observe({ tenant_id: tenantId }, duration);
  }
}
