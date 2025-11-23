import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { TelemetryClient, setup, defaultClient, DistributedTracingModes } from 'applicationinsights';

@Injectable()
export class ApplicationInsightsService implements OnModuleInit {
  private readonly logger = new Logger(ApplicationInsightsService.name);
  private client: TelemetryClient | null = null;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.APPLICATIONINSIGHTS_ENABLED === 'true';
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

    if (this.enabled && connectionString) {
      try {
        setup(connectionString)
          .setAutoDependencyCorrelation(true)
          .setAutoCollectRequests(true)
          .setAutoCollectPerformance(true, true)
          .setAutoCollectExceptions(true)
          .setAutoCollectDependencies(true)
          .setAutoCollectConsole(true, true)
          .setUseDiskRetryCaching(true)
          .setDistributedTracingMode(DistributedTracingModes.AI_AND_W3C)
          .setSendLiveMetrics(true)
          .start();

        this.client = defaultClient;
        this.client.context.tags[this.client.context.keys.cloudRole] = 'node-auth-service';
        
        this.logger.log('Application Insights initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Application Insights', error);
        this.enabled = false;
      }
    } else {
      this.logger.log('Application Insights disabled or not configured');
    }
  }

  async onModuleInit() {
    if (this.enabled && this.client) {
      this.trackEvent('ServiceStarted', {
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      });
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(name: string, properties?: { [key: string]: string }): void {
    if (this.enabled && this.client) {
      this.client.trackEvent({
        name,
        properties,
      });
    }
  }

  /**
   * Track a metric
   */
  trackMetric(name: string, value: number, properties?: { [key: string]: string }): void {
    if (this.enabled && this.client) {
      this.client.trackMetric({
        name,
        value,
        properties,
      });
    }
  }

  /**
   * Track an exception
   */
  trackException(exception: Error, properties?: { [key: string]: string }): void {
    if (this.enabled && this.client) {
      this.client.trackException({
        exception,
        properties,
      });
    }
  }

  /**
   * Track a dependency call
   */
  trackDependency(
    name: string,
    commandName: string,
    duration: number,
    success: boolean,
    dependencyTypeName?: string,
  ): void {
    if (this.enabled && this.client) {
      this.client.trackDependency({
        name,
        data: commandName,
        duration,
        success,
        resultCode: success ? 200 : 500,
        dependencyTypeName: dependencyTypeName || 'HTTP',
      });
    }
  }

  /**
   * Track a request
   */
  trackRequest(name: string, url: string, duration: number, responseCode: number, success: boolean): void {
    if (this.enabled && this.client) {
      this.client.trackRequest({
        name,
        url,
        duration,
        resultCode: responseCode,
        success,
      });
    }
  }

  /**
   * Flush all telemetry
   */
  async flush(): Promise<void> {
    if (this.enabled && this.client) {
      return new Promise((resolve) => {
        this.client!.flush({
          callback: () => resolve(),
        });
      });
    }
  }

  /**
   * Check if Application Insights is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }
}
