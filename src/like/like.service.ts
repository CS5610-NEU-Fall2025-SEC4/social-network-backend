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
    username: string,
  ): Promise<{ liked: boolean; totalPoints: number }> {
    const existingLike = await this.likeModel
      .findOne({ item_id: itemId, username })
      .lean()
      .exec();

    if (existingLike) {
      await this.likeModel.deleteOne({ item_id: itemId, username }).exec();

      await this.userModel.updateOne(
        { username },
        { $pull: { likes: itemId } },
      );
      const isInternal = isNaN(Number(itemId));
      if (isInternal) {
        await this.updateItemPoints(itemId, -1);
      }

      const totalPoints = await this.getTotalPoints(itemId);
      return { liked: false, totalPoints };
    } else {
      const newLike = new this.likeModel({
        item_id: itemId,
        item_type: 'item',
        username,
      });

      await newLike.save();

      await this.userModel.updateOne(
        { username },
        { $addToSet: { likes: itemId } },
      );

      const isInternal = isNaN(Number(itemId));
      if (isInternal) {
        await this.updateItemPoints(itemId, 1);
      }

      const totalPoints = await this.getTotalPoints(itemId);
      return { liked: true, totalPoints };
    }
  }

  private async updateItemPoints(
    itemId: string,
    increment: number,
  ): Promise<void> {
    const commentResult = await this.commentModel
      .updateOne({ comment_id: itemId }, { $inc: { points: increment } })
      .exec();

    if (commentResult.matchedCount === 0) {
      await this.storyModel
        .updateOne({ story_id: itemId }, { $inc: { points: increment } })
        .exec();
    }
  }

  async isLikedByUser(itemId: string, username: string): Promise<boolean> {
    const user = await this.userModel
      .findOne({ username, likes: itemId })
      .select('_id')
      .lean()
      .exec();
    return !!user;
  }

  async getLikeCount(itemId: string): Promise<number> {
    return this.likeModel.countDocuments({ item_id: itemId }).exec();
  }

  async getTotalPoints(itemId: string): Promise<number> {
    return this.getLikeCount(itemId);
  }

  async getUserLikes(username: string): Promise<string[]> {
    const user = await this.userModel
      .findOne({ username })
      .select('likes')
      .lean()
      .exec();
    return user?.likes || [];
  }
}
