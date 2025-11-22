import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class TokenExchangeDto {
  @ApiProperty({
    description: 'User token prefixed with tenant ID (format: tenantId:token)',
    example: 'ikea:user-auth-token-12345'
  })
  @IsNotEmpty({ message: 'User token is required' })
  @IsString({ message: 'User token must be a string' })
  @Matches(/^[a-zA-Z0-9-_]+:.+$/, {
    message: 'Token must be in format: tenantId:token',
  })
  userToken: string;
}
