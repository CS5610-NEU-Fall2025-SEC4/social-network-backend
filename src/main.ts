import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = app.get(AppConfigService);

  app.use(helmet());

  const rawOrigins = configService.get<string>('CORS_ORIGINS') || '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
      return;
    },
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = appConfig.apiPort;
  await app.listen(port);

  console.log(`✅ API running at http://localhost:${port}`);
  console.log(`🌐 CORS Origins: ${allowedOrigins.join(', ') || 'any'}`);
}
void bootstrap();
