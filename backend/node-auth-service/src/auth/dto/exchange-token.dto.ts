import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExchangeTokenDto {
  @ApiProperty({
    description: 'User token in format tenantId:jwtToken',
    example: 'ikea:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    maxLength: 2048,
  })
  @IsString()
  @IsNotEmpty({ message: 'userToken is required' })
  @Matches(/^[a-zA-Z0-9\-_]+:[a-zA-Z0-9\-_\.]+$/, {
    message: 'userToken must be in format tenantId:token',
  })
  @MaxLength(2048, {
    message: 'userToken must not exceed 2048 characters',
  })
  userToken: string;
}
