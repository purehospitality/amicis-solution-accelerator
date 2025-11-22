import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { WinstonModule } from 'nest-winston';
import { getWinstonConfig } from './common/logger.config';

@Module({
  imports: [
    WinstonModule.forRoot(getWinstonConfig()),
    DatabaseModule, 
    AuthModule, 
    HealthModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
