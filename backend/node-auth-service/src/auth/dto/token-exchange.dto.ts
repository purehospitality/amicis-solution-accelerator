import { ApiProperty } from '@nestjs/swagger';

export class TokenExchangeDto {
  @ApiProperty({
    description: 'User token prefixed with tenant ID (format: tenantId:token)',
    example: 'ikea:user-auth-token-12345'
  })
  userToken: string;
}
