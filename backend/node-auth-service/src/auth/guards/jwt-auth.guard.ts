import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface JwtPayload {
  sub: string; // Subject (user ID)
  tenantId: string;
  email?: string;
  roles?: string[];
  iat?: number; // Issued at
  exp?: number; // Expiration
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      this.logger.warn('Missing authorization header', 'JwtAuthGuard');
      throw new UnauthorizedException('Missing authorization header');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      this.logger.warn('Invalid authorization header format', 'JwtAuthGuard');
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      // Get JWT secret from environment
      const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-in-production';
      
      // Verify and decode JWT
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      // Validate required fields
      if (!decoded.sub || !decoded.tenantId) {
        this.logger.warn('JWT missing required fields', 'JwtAuthGuard');
        throw new UnauthorizedException('Invalid token payload');
      }

      // Attach user info to request
      request.user = decoded;

      this.logger.debug(
        `JWT validated for user: ${decoded.sub}, tenant: ${decoded.tenantId}`,
        'JwtAuthGuard',
      );

      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.warn('JWT token expired', 'JwtAuthGuard');
        throw new UnauthorizedException('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn(`JWT validation failed: ${error.message}`, 'JwtAuthGuard');
        throw new UnauthorizedException('Invalid token');
      }

      this.logger.error('JWT validation error', error.stack, 'JwtAuthGuard');
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
