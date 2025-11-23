import { Controller, Post, Body, HttpCode, HttpStatus, Req, Inject, LoggerService } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthService } from './auth.service';
import { TokenExchangeDto } from './dto/token-exchange.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  @Public()
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Exchange user token for backend access token',
    description: 'Accepts a tenant-prefixed user token and returns a backend-specific access token with tenant information'
  })
  @ApiBody({ type: TokenExchangeDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Token exchange successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'backend-token-for-ikea' },
        expiresIn: { type: 'number', example: 3600 },
        tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ikea' },
            name: { type: 'string', example: 'IKEA' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid token format' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async exchangeToken(@Body() dto: TokenExchangeDto, @Req() req: Request) {
    const correlationId = req.correlationId || 'unknown';
    
    this.logger.log(
      `Token exchange request received`,
      { correlationId, context: 'AuthController' },
    );
    
    const result = await this.authService.exchangeToken(dto.userToken);
    
    this.logger.log(
      `Token exchange successful`,
      { correlationId, tenantId: result.tenant.id, context: 'AuthController' },
    );
    
    return result;
  }
}
