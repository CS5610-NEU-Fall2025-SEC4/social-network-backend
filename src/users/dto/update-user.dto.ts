import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMaxSize,
  Matches,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VisibilityDto {
  @IsOptional()
  @IsBoolean()
  name?: boolean;

  @IsOptional()
  @IsBoolean()
  bio?: boolean;

  @IsOptional()
  @IsBoolean()
  location?: boolean;

  @IsOptional()
  @IsBoolean()
  website?: boolean;

  @IsOptional()
  @IsBoolean()
  interests?: boolean;

  @IsOptional()
  @IsBoolean()
  social?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username?: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  twitter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  github?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedin?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VisibilityDto)
  visibility?: VisibilityDto;
}
