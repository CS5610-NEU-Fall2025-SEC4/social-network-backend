// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/social_network';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(mongoUri),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
