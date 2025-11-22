import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  exports: [MetricsController],
})
export class MetricsModule {}
