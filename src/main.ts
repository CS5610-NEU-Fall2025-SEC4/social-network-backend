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

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
    credentials: true,
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
  console.log(`🌐 CORS Origin: ${configService.get<string>('CORS_ORIGIN')}`);
}
void bootstrap();
