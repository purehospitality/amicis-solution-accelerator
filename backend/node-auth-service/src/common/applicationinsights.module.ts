import { Module, Global } from '@nestjs/common';
import { ApplicationInsightsService } from './applicationinsights.service';

@Global()
@Module({
  providers: [ApplicationInsightsService],
  exports: [ApplicationInsightsService],
})
export class ApplicationInsightsModule {}
