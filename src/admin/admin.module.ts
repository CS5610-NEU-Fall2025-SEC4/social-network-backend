import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/users.schema';
import {
  BlockedEmail,
  BlockedEmailSchema,
} from '../users/blocked-email.schema';
import { Story, StorySchema } from '../story/story.schema';
import { Comment, CommentSchema } from '../comment/comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BlockedEmail.name, schema: BlockedEmailSchema },
      { name: Story.name, schema: StorySchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
