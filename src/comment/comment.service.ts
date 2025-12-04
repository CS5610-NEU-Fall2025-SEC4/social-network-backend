import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Story } from 'src/story/story.schema';
import { HNStory, HNStoryItem } from 'src/search/search.types';
import { ValidatedUser } from 'src/users/types/user-response.types';
import { UserRole } from 'src/users/types/user-roles.enum';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Story.name) private storyModel: Model<Story>,
  ) {}

  private _toHNStory(comment: Comment): HNStory {
    return {
      author: comment.isDeleted ? '[deleted]' : comment.author,
      text: comment.isDeleted ? '[deleted by admin]' : comment.text,
      children: comment.children,
      created_at: new Date(comment.createdAt).toISOString(),
      created_at_i: comment.created_at_i,
      id: comment.comment_id,
      options: [],
      parent_id: comment.parent_id,
      points: comment.points,
      story_id: comment.story_id,
      comment_text: comment.isDeleted ? '[deleted by admin]' : comment.text,
      title: null,
      type: 'comment',
      url: null,
      _tags: [],
    };
  }

  private async _buildCommentWithChildren(
    comment: Comment,
  ): Promise<HNStoryItem> {
    const baseComment = this._toHNStory(comment);

    if (!comment.children || comment.children.length === 0) {
      return {
        ...baseComment,
        children: [] as HNStoryItem[],
      } as HNStoryItem;
    }

    const childrenPromises = comment.children.map(async (childId) => {
      try {
        const childComment = await this.commentModel
          .findOne({ comment_id: childId })
          .exec();
        if (!childComment) {
          console.warn(`Child comment ${childId} not found`);
          return null;
        }
        return this._buildCommentWithChildren(childComment);
      } catch (error) {
        console.error(`Error fetching child comment ${childId}:`, error);
        return null;
      }
    });

    const children = (await Promise.all(childrenPromises)).filter(
      (child): child is HNStoryItem => child !== null,
    );

    return {
      ...baseComment,
      children,
    } as HNStoryItem;
  }

  async create(
    createCommentDto: CreateCommentDto,
    username: string,
  ): Promise<HNStory> {
    const { story_id, parent_id } = createCommentDto;

    const story = await this.storyModel.findOne({ story_id }).exec();

    if (parent_id) {
      const parentComment = await this.commentModel
        .findOne({ comment_id: parent_id })
        .exec();
      if (!parentComment) {
        throw new NotFoundException(
          `Parent comment with ID "${parent_id}" not found`,
        );
      }
    }

    const createdComment = new this.commentModel({
      ...createCommentDto,
      author: username,
      created_at_i: Math.floor(Date.now() / 1000),
    });

    try {
      const savedComment = await createdComment.save();
      if (savedComment.parent_id) {
        await this.commentModel.updateOne(
          { comment_id: savedComment.parent_id },
          { $push: { children: savedComment.comment_id } },
        );
      } else if (story) {
        await this.storyModel.updateOne(
          { story_id: savedComment.story_id },
          { $push: { children: savedComment.comment_id } },
        );
      }

      return this._toHNStory(savedComment);
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Comment with this ID already exists');
      }
      throw error;
    }
  }

  async findOne(commentId: string): Promise<HNStory> {
    const comment = await this.commentModel
      .findOne({
        comment_id: commentId,
        isDeleted: { $ne: true },
      })
      .exec();
    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }
    return this._toHNStory(comment);
  }

  async findByStoryId(storyId: string): Promise<HNStoryItem[]> {
    const topLevelComments = await this.commentModel
      .find({
        story_id: storyId,
        parent_id: null,
        isDeleted: { $ne: true },
      })
      .exec();

    const commentsWithChildren = await Promise.all(
      topLevelComments.map((comment) =>
        this._buildCommentWithChildren(comment),
      ),
    );

    return commentsWithChildren;
  }

  async update(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    username: string,
  ): Promise<HNStory> {
    const comment = await this.commentModel
      .findOne({ comment_id: commentId })
      .exec();

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    if (comment.author !== username) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const existingComment = await this.commentModel
      .findOneAndUpdate({ comment_id: commentId }, updateCommentDto, {
        new: true,
      })
      .exec();

    if (!existingComment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    return this._toHNStory(existingComment);
  }

  async remove(
    commentId: string,
    user: ValidatedUser,
    reason?: string,
  ): Promise<{ message: string; deletedComment?: any }> {
    const comment = await this.commentModel
      .findOne({ comment_id: commentId })
      .exec();

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    if (user.role === UserRole.USER || user.role == UserRole.EMPLOYER) {
      if (comment.author !== user.username) {
        throw new ForbiddenException('You can only delete your own comments');
      }

      if (comment.children && comment.children.length > 0) {
        comment.text = '[deleted]';
        comment.author = '[deleted]';
        comment.isDeleted = true;
        comment.deletedAt = new Date();
        comment.deletedBy = user.username;
        await comment.save();

        return {
          message: `Comment soft-deleted (has ${comment.children.length} replies)`,
          deletedComment: {
            comment_id: comment.comment_id,
            hasChildren: true,
          },
        };
      } else {
        await this.commentModel
          .findOneAndDelete({ comment_id: commentId })
          .exec();

        if (comment.parent_id) {
          await this.commentModel.updateOne(
            { comment_id: comment.parent_id },
            { $pull: { children: commentId } },
          );
        } else {
          await this.storyModel.updateOne(
            { story_id: comment.story_id },
            { $pull: { children: commentId } },
          );
        }

        return {
          message: 'Your comment has been deleted successfully',
          deletedComment: {
            comment_id: commentId,
            hasChildren: false,
          },
        };
      }
    }

    if (user.role === UserRole.ADMIN) {
      comment.isDeleted = true;
      comment.deletedAt = new Date();
      comment.deletedBy = user.username;
      comment.deletionReason = reason || 'Deleted by admin';
      comment.text = '[deleted by admin]';
      comment.author = '[deleted]';
      await comment.save();

      return {
        message: 'Comment has been deleted by admin',
        deletedComment: {
          comment_id: comment.comment_id,
          deletedBy: user.username,
          deletionReason: comment.deletionReason,
          hasChildren: comment.children?.length > 0,
        },
      };
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
