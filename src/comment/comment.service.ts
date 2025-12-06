import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
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
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Story.name) private storyModel: Model<Story>,
    private readonly config: AppConfigService,
  ) {}

  private countAllComments(comments: HNStoryItem[]): number {
    let count = 0;

    const traverse = (comment: HNStoryItem) => {
      count++;
      if (comment.children && Array.isArray(comment.children)) {
        comment.children.forEach((child) => {
          if (typeof child === 'object' && child !== null) {
            traverse(child);
          }
        });
      }
    };

    comments.forEach(traverse);
    return count;
  }
  private async fetchAlgoliaAPI<T>(endpoint: string): Promise<T> {
    const base = this.config.algoliaBaseUrl;
    const url = `${base}${endpoint}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new BadRequestException(
        `Algolia API Error: ${res.status} ${res.statusText}`,
      );
    }
    return (await res.json()) as T;
  }

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
      editedAt: comment.editedAt
        ? new Date(comment.editedAt).toISOString()
        : undefined,
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
      const isInternalParent = isNaN(Number(parent_id));

      if (isInternalParent) {
        const parentComment = await this.commentModel
          .findOne({ comment_id: parent_id })
          .exec();
        if (!parentComment) {
          throw new NotFoundException(
            `Parent comment with ID "${parent_id}" not found`,
          );
        }
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
        const isInternalParent = isNaN(Number(savedComment.parent_id));

        if (isInternalParent) {
          await this.commentModel.updateOne(
            { comment_id: savedComment.parent_id },
            { $push: { children: savedComment.comment_id } },
          );
        }
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

  private buildMongoCommentTree(
    comment: Comment,
    mongoByParentId: Map<string | null, Comment[]>,
  ): HNStoryItem {
    const baseComment = this._toHNStory(comment);

    const mongoChildren = mongoByParentId.get(String(comment.comment_id)) || [];

    const childTrees = mongoChildren.map((child) =>
      this.buildMongoCommentTree(child, mongoByParentId),
    );

    return {
      ...baseComment,
      children: childTrees,
    } as HNStoryItem;
  }

  private injectMongoIntoAlgoliaTree(
    algoliaComments: HNStoryItem[],
    mongoComments: Comment[],
  ): HNStoryItem[] {
    const mongoByParentId = new Map<string | null, Comment[]>();

    mongoComments.forEach((comment) => {
      const parentId = comment.parent_id ? String(comment.parent_id) : null;
      if (!mongoByParentId.has(parentId)) {
        mongoByParentId.set(parentId, []);
      }
      mongoByParentId.get(parentId)!.push(comment);
    });

    const processAlgoliaComment = (
      algoliaComment: HNStoryItem,
      depth: number = 0,
    ): HNStoryItem => {
      const algoliaIdString = String(algoliaComment.id);

      const mongoReplies = mongoByParentId.get(algoliaIdString) || [];

      const mongoTrees = mongoReplies.map((mongoComment) =>
        this.buildMongoCommentTree(mongoComment, mongoByParentId),
      );

      let processedChildren: HNStoryItem[] = [];
      if (Array.isArray(algoliaComment.children)) {
        processedChildren = algoliaComment.children
          .filter(
            (child): child is HNStoryItem =>
              typeof child === 'object' && child !== null,
          )
          .map((child) => processAlgoliaComment(child, depth + 1));
      }

      return {
        ...algoliaComment,
        children: [...processedChildren, ...mongoTrees],
      };
    };

    const enhancedAlgoliaComments = algoliaComments.map((comment) => {
      return processAlgoliaComment(comment);
    });

    const topLevelMongoComments = mongoByParentId.get(null) || [];

    const topLevelMongoTrees = topLevelMongoComments.map((mongoComment) => {
      return this.buildMongoCommentTree(mongoComment, mongoByParentId);
    });

    const result = [...enhancedAlgoliaComments, ...topLevelMongoTrees];

    return result;
  }

  async findByStoryId(storyId: string): Promise<{
    comments: HNStoryItem[];
    commentCount: number;
  }> {
    const isExternal = !isNaN(Number(storyId));

    if (!isExternal) {
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
      const internalCount = this.countAllComments(commentsWithChildren);

      return {
        comments: commentsWithChildren,
        commentCount: internalCount,
      };
    }

    let algoliaComments: HNStoryItem[] = [];

    try {
      const algoliaStory = await this.fetchAlgoliaAPI<any>(`/items/${storyId}`);

      if (Array.isArray(algoliaStory.children)) {
        algoliaComments = algoliaStory.children.filter(
          (child: any): child is HNStoryItem =>
            typeof child === 'object' && child !== null,
        );
      }
    } catch (error) {
      console.error(' [CommentService] Algolia fetch failed:', error);
    }

    const mongoComments = await this.commentModel
      .find({
        story_id: storyId,
        isDeleted: { $ne: true },
      })
      .exec();

    if (algoliaComments.length === 0) {
      const topLevelMongoComments = mongoComments.filter((c) => !c.parent_id);

      const builtComments = await Promise.all(
        topLevelMongoComments.map((comment) =>
          this._buildCommentWithChildren(comment),
        ),
      );

      const internalCount = this.countAllComments(builtComments);

      return {
        comments: builtComments,
        commentCount: internalCount,
      };
    }

    const result = this.injectMongoIntoAlgoliaTree(
      algoliaComments,
      mongoComments,
    );

    const totalCount = this.countAllComments(result);
    return {
      comments: result,
      commentCount: totalCount,
    };
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

    const updateData = {
      ...updateCommentDto,
      editedAt: new Date(),
    };

    const existingComment = await this.commentModel
      .findOneAndUpdate({ comment_id: commentId }, updateData, {
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
