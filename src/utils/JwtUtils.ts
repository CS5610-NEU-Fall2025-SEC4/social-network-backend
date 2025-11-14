import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../users/types/user-response.types';

export class JwtUtil {
  static generateToken(jwtService: JwtService, payload: JwtPayload): string {
    return jwtService.sign(payload);
  }
}
