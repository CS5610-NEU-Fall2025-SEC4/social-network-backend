import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '../config/app-config.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (appConfigService: AppConfigService): JwtModuleOptions => ({
        secret: appConfigService.jwtSecret,
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [AppConfigService],
    }),
    forwardRef(() => UsersModule),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
