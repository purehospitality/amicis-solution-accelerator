import { IsString, IsNotEmpty, IsOptional, IsUrl, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class AuthConfigDto {
  @IsUrl({}, { message: 'tokenEndpoint must be a valid URL' })
  @IsNotEmpty()
  tokenEndpoint: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsOptional()
  scope?: string;
}

class BrandingDto {
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsUrl({}, { message: 'logoUrl must be a valid URL' })
  @IsOptional()
  logoUrl?: string;
}

export class TenantConfigDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => AuthConfigDto)
  @IsNotEmpty()
  authConfig: AuthConfigDto;

  @ValidateNested()
  @Type(() => BrandingDto)
  @IsOptional()
  branding?: BrandingDto;
}

export class StoreConfigDto {
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl({}, { message: 'backendUrl must be a valid URL' })
  @IsNotEmpty()
  backendUrl: string;

  @IsObject()
  @IsNotEmpty()
  backendContext: Record<string, any>;

  @ValidateNested()
  @IsOptional()
  location?: {
    lat: number;
    lon: number;
  };
}
