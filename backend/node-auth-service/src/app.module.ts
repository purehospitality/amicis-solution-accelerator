import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { KeyVaultModule } from './common/keyvault.module';
import { ApplicationInsightsModule } from './common/applicationinsights.module';
import { WinstonModule } from 'nest-winston';
import { getWinstonConfig } from './common/logger.config';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    WinstonModule.forRoot(getWinstonConfig()),
    KeyVaultModule,
    ApplicationInsightsModule,
    DatabaseModule, 
    AuthModule, 
    HealthModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
