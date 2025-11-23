import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateTokenDto {
  @ApiProperty({
    description: 'JWT token to validate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    maxLength: 2048,
  })
  @IsString()
  @IsNotEmpty({ message: 'token is required' })
  @MaxLength(2048, {
    message: 'token must not exceed 2048 characters',
  })
  token: string;
}
