import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Story } from './story.schema';
import { Comment } from '../comment/comment.schema';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { HNStory, HNStoryItem, StoryType } from 'src/search/search.types';
import { ValidatedUser } from 'src/users/types/user-response.types';
import { UserRole } from 'src/users/types/user-roles.enum';

@Injectable()
export class StoryService {
  constructor(
    @InjectModel(Story.name) private storyModel: Model<Story>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
  ) {}

  private _toHNStory(story: Story): HNStory {
    const tags = [...(story._tags || [])];

    if (story.type === 'story' && !tags.includes('story')) {
      tags.push('story');
    }
    if (story.type === 'comment' && !tags.includes('comment')) {
      tags.push('comment');
    }
    if (story.type === 'job' && !tags.includes('job')) {
      tags.push('job');
    }
    return {
      author: story.author,
      children: story.children,
      created_at: new Date(story.createdAt).toISOString(),
      created_at_i: story.created_at_i,
      id: story.story_id,
      options: [],
      parent_id: null,
      points: story.points,
      story_id: story.story_id,
      text: story.text,
      comment_text: null,
      title: story.title,
      type: story.type,
      url: story.url,
      _tags: tags,
    };
  }

  private _commentToHNStory(comment: Comment): HNStory {
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
      _tags: ['comment'],
    };
  }

  private async _buildCommentWithChildren(
    comment: Comment,
  ): Promise<HNStoryItem> {
    const baseComment = this._commentToHNStory(comment);

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

  private async _buildStoryWithChildren(story: Story): Promise<HNStoryItem> {
    const baseStory = this._toHNStory(story);

    if (!story.children || story.children.length === 0) {
      return {
        ...baseStory,
        children: [] as HNStoryItem[],
      } as HNStoryItem;
    }

    const childrenPromises = story.children.map(async (childId) => {
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
        console.error(`Error fetching child ${childId}:`, error);
        return null;
      }
    });

    const children = (await Promise.all(childrenPromises)).filter(
      (child): child is HNStoryItem => child !== null,
    );

    return {
      ...baseStory,
      children,
    } as HNStoryItem;
  }

  async create(
    createStoryDto: CreateStoryDto,
    username: string,
    userRole: string,
  ): Promise<HNStory> {
    if (createStoryDto.type === 'job') {
      if (
        userRole !== UserRole.EMPLOYER.toString() &&
        userRole !== UserRole.ADMIN.toString()
      ) {
        throw new ForbiddenException('Only employers can create job postings');
      }
    }

    const createdStory = new this.storyModel({
      ...createStoryDto,

      author: username,

      created_at_i: Math.floor(Date.now() / 1000),
    });

    try {
      const savedStory = await createdStory.save();

      return this._toHNStory(savedStory);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Story with this ID or Story ID already exists',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<HNStory[]> {
    const stories = await this.storyModel
      .find({ isDeleted: { $ne: true } })
      .exec();
    return stories.map((story) => this._toHNStory(story));
  }

  async findOneByMongoId(mongoId: string): Promise<Story> {
    const story = await this.storyModel
      .findOne({
        _id: mongoId,
        isDeleted: { $ne: true }, // ✨ ADD THIS
      })
      .exec();
    if (!story) {
      throw new NotFoundException(`Story with ID "${mongoId}" not found`);
    }
    return story;
  }

  async findOne(storyId: string): Promise<Story> {
    const story = await this.storyModel
      .findOne({ story_id: storyId, isDeleted: { $ne: true } })
      .exec();
    if (!story) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }
    return story;
  }

  async findOneHN(storyId: string): Promise<HNStory> {
    const story = await this.findOne(storyId);
    return this._toHNStory(story);
  }

  async findOneWithChildren(storyId: string): Promise<HNStoryItem> {
    const story = await this.findOne(storyId);
    return this._buildStoryWithChildren(story);
  }

  async findByType(type: StoryType): Promise<HNStory[]> {
    const stories = await this.storyModel
      .find({
        type,
        isDeleted: { $ne: true },
      })
      .exec();
    return stories.map((story) => this._toHNStory(story));
  }

  async update(
    storyId: string,
    updateStoryDto: UpdateStoryDto,
    username: string,
  ): Promise<HNStory> {
    const story = await this.findOne(storyId);

    if (story.author !== username) {
      throw new ForbiddenException('You can only update your own stories');
    }

    const existingStory = await this.storyModel
      .findOneAndUpdate({ story_id: storyId }, updateStoryDto, { new: true })
      .exec();

    if (!existingStory) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }

    return this._toHNStory(existingStory);
  }

  async remove(
    storyId: string,
    user: ValidatedUser,
    reason?: string,
  ): Promise<{ message: string; deletedStory?: any }> {
    const story = await this.storyModel
      .findOne({ story_id: storyId, isDeleted: { $ne: true } })
      .exec();

    if (!story) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }

    if (user.role === UserRole.USER || user.role === UserRole.EMPLOYER) {
      if (story.author !== user.username) {
        throw new ForbiddenException('You can only delete your own stories');
      }

      story.isDeleted = true;
      story.deletedAt = new Date();
      story.deletedBy = user.username;
      await story.save();

      return {
        message: 'Your story has been deleted successfully',
        deletedStory: {
          story_id: story.story_id,
          title: story.title,
        },
      };
    }

    if (user.role === UserRole.ADMIN) {
      story.isDeleted = true;
      story.deletedAt = new Date();
      story.deletedBy = user.username;
      story.deletionReason = reason || 'Deleted by admin';
      await story.save();

      return {
        message: `Story "${story.title}" has been deleted by admin`,
        deletedStory: {
          story_id: story.story_id,
          title: story.title,
          deletedBy: user.username,
          deletionReason: story.deletionReason,
        },
      };
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
