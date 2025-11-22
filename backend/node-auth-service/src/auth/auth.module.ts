import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TenantService],
  exports: [AuthService],
})
export class AuthModule {}
