import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';
import { CircuitBreakerService } from '../common/circuit-breaker.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [CircuitBreakerService],
})
export class HealthModule {}
