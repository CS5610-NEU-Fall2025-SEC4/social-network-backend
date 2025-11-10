import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // reject extra fields
      transform: true, // auto-transform payloads to DTO types
    }),
  );

  const port = configService.get<number>('PORT') || 8080;
  await app.listen(port);

  console.log(`✅ API running at http://localhost:${port}`);
  console.log(`🌐 CORS Origin: ${configService.get<string>('CORS_ORIGIN')}`);
}
bootstrap();
