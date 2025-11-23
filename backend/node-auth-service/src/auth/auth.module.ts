import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';
import { CircuitBreakerService } from '../common/circuit-breaker.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TenantService, CircuitBreakerService],
  exports: [AuthService],
})
export class AuthModule {}
