import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // reject extra fields
      transform: true, // auto-transform payloads to DTO types
    }),
  );

  await app.listen(process.env.PORT || 8080);
  console.log(`API on http://localhost:${process.env.PORT || 8080}`);
}
bootstrap();
