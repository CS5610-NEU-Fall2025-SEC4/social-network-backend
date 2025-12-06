import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { StoryModule } from './story/story.module';
import { CommentModule } from './comment/comment.module';
import { AdminModule } from './admin/admin.module';
import { ReportModule } from './report/report.module';
import { LikeModule } from './like/like.module';

@Module({
  imports: [
    AppConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => ({
        uri: appConfigService.databaseUrl,
      }),
    }),
    UsersModule,
    AuthModule,
    SearchModule,
    StoryModule,
    CommentModule,
    AdminModule,
    ReportModule,
    LikeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
