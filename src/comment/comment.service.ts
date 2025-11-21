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
import { HNStory } from 'src/search/search.types';
import { Story } from 'src/story/story.schema';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Story.name) private storyModel: Model<Story>,
  ) {}

  private _toHNStory(comment: Comment): HNStory {
    return {
      author: comment.author,
      children: comment.children,
      created_at: new Date(comment.createdAt).toISOString(),
      created_at_i: comment.created_at_i,
      id: comment.comment_id,
      options: [],
      parent_id: comment.parent_id,
      points: comment.points,
      story_id: comment.story_id,
      text: comment.text,
      comment_text: comment.text,
      title: null,
      type: 'comment',
      url: null,
      _tags: [],
    };
  }

  async create(
    createCommentDto: CreateCommentDto,
    username: string,
  ): Promise<HNStory> {
    const { story_id, parent_id } = createCommentDto;

    const story = await this.storyModel.findOne({ story_id }).exec();
    if (!story) {
      throw new NotFoundException(`Story with ID "${story_id}" not found`);
    }

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
      } else {
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
      .findOne({ comment_id: commentId })
      .exec();
    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }
    return this._toHNStory(comment);
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
      throw new ForbiddenException(
        'You are not allowed to update this comment',
      );
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

  async remove(commentId: string, username: string): Promise<void> {
    const comment = await this.commentModel
      .findOne({ comment_id: commentId })
      .exec();
    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }
    if (comment.author !== username) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment',
      );
    }

    // Soft delete if the comment has children
    if (comment.children && comment.children.length > 0) {
      comment.text = '[deleted]';
      comment.author = '[deleted]';
      await comment.save();
    } else {
      // Hard delete if the comment has no children
      const result = await this.commentModel
        .findOneAndDelete({ comment_id: commentId })
        .exec();
      if (!result) {
        throw new NotFoundException(`Comment with ID "${commentId}" not found`);
      }

      // Remove from parent's children array
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
    }
  }
}
