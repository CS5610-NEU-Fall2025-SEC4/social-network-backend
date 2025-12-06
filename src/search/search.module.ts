import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AppConfigModule } from '../config/app-config.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Story, StorySchema } from '../story/story.schema';
import { Like, LikeSchema } from '../like/like.schema';
import { CommentModule } from '../comment/comment.module';

@Module({
  imports: [
    AppConfigModule,
    CommentModule,
    MongooseModule.forFeature([
      { name: Story.name, schema: StorySchema },
      { name: Like.name, schema: LikeSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
