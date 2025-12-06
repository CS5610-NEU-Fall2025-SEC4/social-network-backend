import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeController } from './like.controller';
import { LikeService } from './like.service';
import { Like, LikeSchema } from './like.schema';
import { Story, StorySchema } from '../story/story.schema';
import { Comment, CommentSchema } from '../comment/comment.schema';
import { User, UserSchema } from '../users/users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Like.name, schema: LikeSchema },
      { name: Story.name, schema: StorySchema },
      { name: Comment.name, schema: CommentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LikeController],
  providers: [LikeService],
  exports: [LikeService],
})
export class LikeModule {}
