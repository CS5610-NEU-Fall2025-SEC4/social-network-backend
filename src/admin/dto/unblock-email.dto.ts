import { IsEmail } from 'class-validator';

export class UnblockEmailDto {
  @IsEmail()
  email: string;
}
