import { IsEmail, IsOptional, IsString } from 'class-validator';

export class BlockEmailDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
