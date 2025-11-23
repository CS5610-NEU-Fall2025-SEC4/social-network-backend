import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Story, StorySchema } from './story.schema';
import { Comment, CommentSchema } from '../comment/comment.schema';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Story.name, schema: StorySchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
  ],
  controllers: [StoryController],
  providers: [StoryService],
})
export class StoryModule {}
