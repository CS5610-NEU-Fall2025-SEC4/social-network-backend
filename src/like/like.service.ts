import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like } from './like.schema';
import { Story } from '../story/story.schema';
import { Comment } from '../comment/comment.schema';
import { User } from '../users/users.schema';

@Injectable()
export class LikeService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<Like>,
    @InjectModel(Story.name) private storyModel: Model<Story>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async toggleLike(
    itemId: string,
    itemType: 'story' | 'comment',
    username: string,
    originalPoints: number = 0,
  ): Promise<{ liked: boolean; totalPoints: number }> {
    const existingLike = await this.likeModel
      .findOne({ item_id: itemId, username })
      .exec();

    if (existingLike) {
      await this.likeModel.deleteOne({ item_id: itemId, username }).exec();

      await this.userModel.updateOne(
        { username },
        { $pull: { likes: itemId } },
      );

      const isInternal = isNaN(Number(itemId));
      if (isInternal) {
        if (itemType === 'story') {
          await this.storyModel.updateOne(
            { story_id: itemId },
            { $inc: { points: -1 } },
          );
        } else {
          await this.commentModel.updateOne(
            { comment_id: itemId },
            { $inc: { points: -1 } },
          );
        }
      }

      const totalPoints = await this.getTotalPoints(
        itemId,
        itemType,
        originalPoints,
      );
      return { liked: false, totalPoints };
    } else {
      const newLike = new this.likeModel({
        item_id: itemId,
        item_type: itemType,
        username,
      });

      await newLike.save();

      await this.userModel.updateOne(
        { username },
        { $addToSet: { likes: itemId } },
      );

      const isInternal = isNaN(Number(itemId));
      if (isInternal) {
        if (itemType === 'story') {
          await this.storyModel.updateOne(
            { story_id: itemId },
            { $inc: { points: 1 } },
          );
        } else {
          await this.commentModel.updateOne(
            { comment_id: itemId },
            { $inc: { points: 1 } },
          );
        }
      }

      const totalPoints = await this.getTotalPoints(
        itemId,
        itemType,
        originalPoints,
      );
      return { liked: true, totalPoints };
    }
  }

  async isLikedByUser(itemId: string, username: string): Promise<boolean> {
    const user = await this.userModel
      .findOne({ username, likes: itemId })
      .select('_id')
      .exec();
    return !!user;
  }

  async getLikeCount(itemId: string): Promise<number> {
    return this.likeModel.countDocuments({ item_id: itemId }).exec();
  }

  async getTotalPoints(
    itemId: string,
    itemType: 'story' | 'comment',
    originalPoints: number = 0,
  ): Promise<number> {
    const isInternal = isNaN(Number(itemId));

    if (isInternal) {
      if (itemType === 'story') {
        const story = await this.storyModel.findOne({ story_id: itemId });
        return story?.points || 0;
      } else {
        const comment = await this.commentModel.findOne({ comment_id: itemId });
        return comment?.points || 0;
      }
    } else {
      const ourLikes = await this.getLikeCount(itemId);
      return originalPoints + ourLikes;
    }
  }

  async getUserLikes(username: string): Promise<string[]> {
    const user = await this.userModel
      .findOne({ username })
      .select('likes')
      .exec();
    return user?.likes || [];
  }
}
