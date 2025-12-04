import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/users.schema';
import {
  BlockedEmail,
  BlockedEmailDocument,
} from '../users/blocked-email.schema';
import { BlockEmailDto } from './dto/block-email.dto';

import { Story } from '../story/story.schema';
import { Comment } from '../comment/comment.schema';

interface TopPosterAgg {
  _id: string;
  storyCount: number;
  totalPoints: number;
}

interface TopCommenterAgg {
  _id: string;
  commentCount: number;
  totalPoints: number;
}

interface TopEmployerAgg {
  _id: string;
  jobCount: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BlockedEmail.name)
    private readonly blockedEmailModel: Model<BlockedEmailDocument>,
    @InjectModel(Story.name)
    private readonly storyModel: Model<Story>,
    @InjectModel(Comment.name)
    private readonly commentModel: Model<Comment>,
  ) {}

  async blockUser(userId: string, adminUsername: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isBlocked) {
      throw new BadRequestException('User is already blocked');
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedBy = adminUsername;
    await user.save();

    await this.storyModel.updateMany(
      { author: user.username, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminUsername,
          deletionReason: 'User blocked by admin',
          deletedDueToBlock: true,
        },
      },
    );

    await this.commentModel.updateMany(
      { author: user.username, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminUsername,
          deletionReason: 'User blocked by admin',
          deletedDueToBlock: true,
        },
      },
    );

    return {
      message: `User ${user.username} has been blocked and all their content has been auto-deleted.`,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
        blockedBy: user.blockedBy,
      },
    };
  }

  async unblockUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isBlocked) {
      throw new BadRequestException('User is not blocked');
    }

    user.isBlocked = false;
    user.blockedAt = undefined;
    user.blockedBy = undefined;
    await user.save();

    await this.storyModel.updateMany(
      { author: user.username, deletedDueToBlock: true },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          deletedDueToBlock: false,
        },
      },
    );

    await this.commentModel.updateMany(
      { author: user.username, deletedDueToBlock: true },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          deletedDueToBlock: false,
        },
      },
    );

    return {
      message: `User ${user.username} has been unblocked and their auto-deleted content restored.`,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        isBlocked: user.isBlocked,
      },
    };
  }

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    role?: string,
    isBlocked?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
        blockedBy: user.blockedBy,
        createdAt: user.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isBlocked: user.isBlocked,
      blockedAt: user.blockedAt,
      blockedBy: user.blockedBy,
      bio: user.bio,
      location: user.location,
      website: user.website,
      interests: user.interests,
      social: user.social,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async blockEmail(blockEmailDto: BlockEmailDto, adminUsername: string) {
    const { email, reason } = blockEmailDto;

    const existing = await this.blockedEmailModel
      .findOne({ email: email.toLowerCase() })
      .exec();

    if (existing) {
      throw new BadRequestException('Email is already blocked');
    }

    const blocked = await this.blockedEmailModel.create({
      email: email.toLowerCase(),
      reason: reason || 'No reason provided',
      blockedBy: adminUsername,
    });

    return {
      message: `Email ${email} has been blocked`,
      blockedEmail: {
        id: blocked._id.toString(),
        email: blocked.email,
        reason: blocked.reason,
        blockedBy: blocked.blockedBy,
        createdAt: blocked.createdAt,
      },
    };
  }

  async unblockEmail(email: string) {
    const blocked = await this.blockedEmailModel
      .findOneAndDelete({ email: email.toLowerCase() })
      .exec();

    if (!blocked) {
      throw new NotFoundException('Email is not blocked');
    }

    return {
      message: `Email ${email} has been unblocked`,
    };
  }

  async getBlockedEmails(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      this.blockedEmailModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.blockedEmailModel.countDocuments(),
    ]);

    return {
      blockedEmails: emails.map((email) => ({
        id: email._id.toString(),
        email: email.email,
        reason: email.reason,
        blockedBy: email.blockedBy,
        createdAt: email.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllStories(
    page: number = 1,
    limit: number = 20,
    type?: string,
    author?: string,
    includeDeleted: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (author) {
      filter.author = author;
    }

    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    const [stories, total] = await Promise.all([
      this.storyModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.storyModel.countDocuments(filter),
    ]);

    return {
      stories: stories.map((story) => ({
        story_id: story.story_id,
        title: story.title,
        author: story.author,
        type: story.type,
        text: story.text
          ? story.text.substring(0, 100) +
            (story.text?.length > 100 ? '...' : '')
          : null,
        url: story.url,
        points: story.points,
        children: story.children?.length || 0,
        isDeleted: story.isDeleted,
        deletedAt: story.deletedAt,
        deletedBy: story.deletedBy,
        createdAt: story.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllComments(
    page: number = 1,
    limit: number = 20,
    storyId?: string,
    author?: string,
    includeDeleted: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (storyId) {
      filter.story_id = storyId;
    }

    if (author) {
      filter.author = author;
    }

    if (!includeDeleted) {
      filter.isDeleted = { $ne: true };
    }

    const [comments, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.commentModel.countDocuments(filter),
    ]);

    return {
      comments: comments.map((comment) => ({
        comment_id: comment.comment_id,
        author: comment.author,
        text: comment.text
          ? comment.text.substring(0, 100) +
            (comment.text.length > 100 ? '...' : '')
          : null,
        story_id: comment.story_id,
        parent_id: comment.parent_id,
        points: comment.points,
        children: comment.children?.length || 0,
        isDeleted: comment.isDeleted,
        deletedAt: comment.deletedAt,
        deletedBy: comment.deletedBy,
        createdAt: comment.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDeletedStories(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [stories, total] = await Promise.all([
      this.storyModel
        .find({ isDeleted: true })
        .skip(skip)
        .limit(limit)
        .sort({ deletedAt: -1 })
        .exec(),
      this.storyModel.countDocuments({ isDeleted: true }),
    ]);

    return {
      deletedStories: stories.map((story) => ({
        story_id: story.story_id,
        title: story.title,
        author: story.author,
        type: story.type,
        deletedAt: story.deletedAt,
        deletedBy: story.deletedBy,
        deletionReason: story.deletionReason,
        createdAt: story.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDeletedComments(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ isDeleted: true })
        .skip(skip)
        .limit(limit)
        .sort({ deletedAt: -1 })
        .exec(),
      this.commentModel.countDocuments({ isDeleted: true }),
    ]);

    return {
      deletedComments: comments.map((comment) => ({
        comment_id: comment.comment_id,
        author: comment.author,
        story_id: comment.story_id,
        deletedAt: comment.deletedAt,
        deletedBy: comment.deletedBy,
        deletionReason: comment.deletionReason,
        createdAt: comment.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async restoreStory(storyId: string, adminUsername: string) {
    const story = await this.storyModel.findOne({ story_id: storyId }).exec();

    if (!story) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }

    if (!story.isDeleted) {
      throw new BadRequestException('Story is not deleted');
    }

    story.isDeleted = false;
    story.deletedAt = undefined;
    story.deletedBy = undefined;
    story.deletionReason = undefined;
    await story.save();

    return {
      message: `Story "${story.title}" has been restored by admin ${adminUsername}`,
      restoredStory: {
        story_id: story.story_id,
        title: story.title,
        author: story.author,
        isDeleted: story.isDeleted,
      },
    };
  }

  async restoreComment(commentId: string, adminUsername: string) {
    const comment = await this.commentModel
      .findOne({ comment_id: commentId })
      .exec();

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    if (!comment.isDeleted) {
      throw new BadRequestException('Comment is not deleted');
    }

    comment.isDeleted = false;
    comment.deletedAt = undefined;
    comment.deletedBy = undefined;
    comment.deletionReason = undefined;

    await comment.save();

    return {
      message: `Comment has been restored by admin ${adminUsername}`,
      restoredComment: {
        comment_id: comment.comment_id,
        author: comment.author,
        text:
          comment.text.substring(0, 50) +
          (comment.text.length > 50 ? '...' : ''),
        story_id: comment.story_id,
        isDeleted: comment.isDeleted,
      },
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      blockedUsers,
      totalStories,
      activeStories,
      deletedStories,
      totalComments,
      activeComments,
      deletedComments,
      blockedEmails,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      usersLastMonth,
      storiesToday,
      storiesThisWeek,
      storiesThisMonth,
      storiesLastMonth,
      commentsToday,
      commentsThisWeek,
      commentsThisMonth,
      commentsLastMonth,
      deletionsToday,
      deletionsThisWeek,
      deletionsThisMonth,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isBlocked: true }),

      this.storyModel.countDocuments(),
      this.storyModel.countDocuments({ isDeleted: { $ne: true } }),
      this.storyModel.countDocuments({ isDeleted: true }),

      this.commentModel.countDocuments(),
      this.commentModel.countDocuments({ isDeleted: { $ne: true } }),
      this.commentModel.countDocuments({ isDeleted: true }),

      this.blockedEmailModel.countDocuments(),

      this.userModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.userModel.countDocuments({ createdAt: { $gte: weekStart } }),
      this.userModel.countDocuments({ createdAt: { $gte: monthStart } }),
      this.userModel.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }),

      this.storyModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.storyModel.countDocuments({ createdAt: { $gte: weekStart } }),
      this.storyModel.countDocuments({ createdAt: { $gte: monthStart } }),
      this.storyModel.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }),

      this.commentModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.commentModel.countDocuments({ createdAt: { $gte: weekStart } }),
      this.commentModel.countDocuments({ createdAt: { $gte: monthStart } }),
      this.commentModel.countDocuments({
        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      }),

      Promise.all([
        this.storyModel.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: todayStart },
        }),
        this.commentModel.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: todayStart },
        }),
      ]).then(([stories, comments]) => stories + comments),

      Promise.all([
        this.storyModel.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: weekStart },
        }),
        this.commentModel.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: weekStart },
        }),
      ]).then(([stories, comments]) => stories + comments),

      Promise.all([
        this.storyModel.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: monthStart },
        }),
        this.commentModel.countDocuments({
          isDeleted: true,
          deletedAt: { $gte: monthStart },
        }),
      ]).then(([stories, comments]) => stories + comments),
    ]);

    const usersByRole = await this.userModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const storiesByType = await this.storyModel.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const totalJobs = storiesByType.find((s) => s._id === 'job')?.count || 0;
    const jobsThisMonth = await this.storyModel.countDocuments({
      type: 'job',
      createdAt: { $gte: monthStart },
    });
    const jobsLastMonth = await this.storyModel.countDocuments({
      type: 'job',
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
    });

    const userGrowth =
      usersLastMonth > 0
        ? (((usersThisMonth - usersLastMonth) / usersLastMonth) * 100).toFixed(
            1,
          )
        : '0.0';
    const storyGrowth =
      storiesLastMonth > 0
        ? (
            ((storiesThisMonth - storiesLastMonth) / storiesLastMonth) *
            100
          ).toFixed(1)
        : '0.0';
    const commentGrowth =
      commentsLastMonth > 0
        ? (
            ((commentsThisMonth - commentsLastMonth) / commentsLastMonth) *
            100
          ).toFixed(1)
        : '0.0';
    const jobGrowth =
      jobsLastMonth > 0
        ? (((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100).toFixed(1)
        : '0.0';

    return {
      overview: {
        totalUsers,
        totalStories,
        totalComments,
        totalJobs,
        activeUsers: totalUsers - blockedUsers,
        blockedUsers,
      },
      growth: {
        users: {
          today: usersToday,
          thisWeek: usersThisWeek,
          thisMonth: usersThisMonth,
          lastMonth: usersLastMonth,
          percentChange: userGrowth,
        },
        stories: {
          today: storiesToday,
          thisWeek: storiesThisWeek,
          thisMonth: storiesThisMonth,
          lastMonth: storiesLastMonth,
          percentChange: storyGrowth,
        },
        comments: {
          today: commentsToday,
          thisWeek: commentsThisWeek,
          thisMonth: commentsThisMonth,
          lastMonth: commentsLastMonth,
          percentChange: commentGrowth,
        },
        jobs: {
          thisMonth: jobsThisMonth,
          lastMonth: jobsLastMonth,
          percentChange: jobGrowth,
        },
      },
      userBreakdown: {
        byRole: usersByRole.reduce(
          (acc: Record<string, number>, item: any) => ({
            ...acc,
            [item._id]: item.count,
          }),
          {} as Record<string, number>,
        ),
      },
      contentBreakdown: {
        stories: {
          total: totalStories,
          active: activeStories,
          deleted: deletedStories,
          byType: storiesByType.reduce(
            (acc: Record<string, number>, item: any) => ({
              ...acc,
              [item._id]: item.count,
            }),
            {} as Record<string, number>,
          ),
        },
        comments: {
          total: totalComments,
          active: activeComments,
          deleted: deletedComments,
        },
      },
      moderation: {
        blockedUsers,
        blockedEmails,
        deletionsToday,
        deletionsThisWeek,
        deletionsThisMonth,
      },
    };
  }

  async getProblematicUsers(limit: number = 20) {
    const deletedStoriesByAuthor = await this.storyModel.aggregate([
      { $match: { isDeleted: true } },
      {
        $group: {
          _id: '$author',
          deletedCount: { $sum: 1 },
          recentDeletions: {
            $push: {
              story_id: '$story_id',
              title: '$title',
              deletedAt: '$deletedAt',
              deletedBy: '$deletedBy',
              deletionReason: '$deletionReason',
              type: '$type',
            },
          },
        },
      },
    ]);

    const deletedCommentsByAuthor = await this.commentModel.aggregate([
      { $match: { isDeleted: true } },
      {
        $group: {
          _id: '$author',
          deletedCount: { $sum: 1 },
          recentDeletions: {
            $push: {
              comment_id: '$comment_id',
              text: '$text',
              story_id: '$story_id',
              deletedAt: '$deletedAt',
              deletedBy: '$deletedBy',
              deletionReason: '$deletionReason',
            },
          },
        },
      },
    ]);

    const deletionsByAuthor = new Map();

    deletedStoriesByAuthor.forEach((item) => {
      deletionsByAuthor.set(item._id, {
        deletedStories: item.deletedCount,
        storyDeletions: item.recentDeletions.slice(0, 3),
        deletedComments: 0,
        commentDeletions: [],
      });
    });

    deletedCommentsByAuthor.forEach((item) => {
      const existing = deletionsByAuthor.get(item._id) || {
        deletedStories: 0,
        storyDeletions: [],
        deletedComments: 0,
        commentDeletions: [],
      };
      existing.deletedComments = item.deletedCount;
      existing.commentDeletions = item.recentDeletions.slice(0, 3);
      deletionsByAuthor.set(item._id, existing);
    });

    const usernames = Array.from(deletionsByAuthor.keys());
    const users = await this.userModel
      .find({ username: { $in: usernames } })
      .select('-password')
      .exec();

    const problematicUsers = await Promise.all(
      users.map(async (user) => {
        const deletionData = deletionsByAuthor.get(user.username);

        const [totalStories, totalComments] = await Promise.all([
          this.storyModel.countDocuments({ author: user.username }),
          this.commentModel.countDocuments({ author: user.username }),
        ]);

        const storyDeletionRate =
          totalStories > 0 ? deletionData.deletedStories / totalStories : 0;
        const commentDeletionRate =
          totalComments > 0 ? deletionData.deletedComments / totalComments : 0;
        const totalContent = totalStories + totalComments;
        const totalDeleted =
          deletionData.deletedStories + deletionData.deletedComments;
        const overallDeletionRate =
          totalContent > 0 ? totalDeleted / totalContent : 0;

        let riskLevel = 'LOW';
        if (overallDeletionRate > 0.25 || totalDeleted > 15) {
          riskLevel = 'HIGH';
        } else if (overallDeletionRate > 0.15 || totalDeleted > 8) {
          riskLevel = 'MEDIUM';
        }

        return {
          user: {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
          },
          activityStats: {
            totalStories,
            deletedStories: deletionData.deletedStories,
            storyDeletionRate: parseFloat(storyDeletionRate.toFixed(2)),
            totalComments,
            deletedComments: deletionData.deletedComments,
            commentDeletionRate: parseFloat(commentDeletionRate.toFixed(2)),
            overallDeletionRate: parseFloat(overallDeletionRate.toFixed(2)),
            totalDeleted,
          },
          riskLevel,
          riskScore: overallDeletionRate * 100 + totalDeleted,
        };
      }),
    );

    const sorted = problematicUsers
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ riskScore, ...rest }) => rest);

    const summary = {
      totalProblematicUsers: problematicUsers.length,
      highRisk: problematicUsers.filter((u) => u.riskLevel === 'HIGH').length,
      mediumRisk: problematicUsers.filter((u) => u.riskLevel === 'MEDIUM')
        .length,
      lowRisk: problematicUsers.filter((u) => u.riskLevel === 'LOW').length,
    };

    return {
      problematicUsers: sorted,
      summary,
    };
  }

  async getTopContributors(limit: number = 10) {
    const topPosters = await this.storyModel.aggregate<TopPosterAgg>([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$author',
          storyCount: { $sum: 1 },
          totalPoints: { $sum: '$points' },
        },
      },
      { $sort: { storyCount: -1 } },
      { $limit: limit },
    ]);

    const topCommenters = await this.commentModel.aggregate<TopCommenterAgg>([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$author',
          commentCount: { $sum: 1 },
          totalPoints: { $sum: '$points' },
        },
      },
      { $sort: { commentCount: -1 } },
      { $limit: limit },
    ]);

    const topEmployers = await this.storyModel.aggregate<TopEmployerAgg>([
      { $match: { type: 'job', isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$author',
          jobCount: { $sum: 1 },
        },
      },
      { $sort: { jobCount: -1 } },
      { $limit: limit },
    ]);

    const allUsernames = new Set([
      ...topPosters.map((p) => p._id),
      ...topCommenters.map((c) => c._id),
      ...topEmployers.map((e) => e._id),
    ]);

    const userDetails = await this.userModel
      .find({ username: { $in: Array.from(allUsernames) } })
      .select('username email firstName lastName role createdAt')
      .exec();

    const userMap = new Map(userDetails.map((u) => [u.username, u]));

    const topPostersWithDetails = topPosters.map((p: any): any => {
      const user = userMap.get(p._id);
      return {
        username: p._id,
        email: user?.email,
        role: user?.role,
        storyCount: p.storyCount,
        totalPoints: p.totalPoints,
        averagePoints: Math.round(p.totalPoints / p.storyCount),
        memberSince: user?.createdAt,
      };
    });

    const topCommentersWithDetails = topCommenters.map((c: any) => {
      const user = userMap.get(c._id);
      return {
        username: c._id,
        email: user?.email,
        role: user?.role,
        commentCount: c.commentCount,
        totalPoints: c.totalPoints,
        averagePoints: Math.round(c.totalPoints / c.commentCount),
        memberSince: user?.createdAt,
      };
    });

    const topEmployersWithDetails = topEmployers.map((e) => {
      const user = userMap.get(e._id);
      return {
        username: e._id,
        email: user?.email,
        jobCount: e.jobCount,
        memberSince: user?.createdAt,
      };
    });

    return {
      topPosters: topPostersWithDetails,
      topCommenters: topCommentersWithDetails,
      topEmployers: topEmployersWithDetails,
    };
  }

  async getTrendingContent(period: 'week' | 'month' = 'week') {
    const now = new Date();
    const startDate =
      period === 'week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getFullYear(), now.getMonth(), 1);

    const topStories = await this.storyModel
      .find({
        isDeleted: { $ne: true },
        type: { $in: ['story', 'job'] },
        createdAt: { $gte: startDate },
      })
      .sort({ points: -1 })
      .limit(10)
      .select('story_id title author type points children createdAt')
      .exec();

    const mostCommented = await this.storyModel.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          createdAt: { $gte: startDate },
        },
      },
      {
        $project: {
          story_id: 1,
          title: 1,
          author: 1,
          type: 1,
          points: 1,
          commentCount: { $size: { $ifNull: ['$children', []] } },
          createdAt: 1,
        },
      },
      { $sort: { commentCount: -1 } },
      { $limit: 10 },
    ]);

    const trendingJobs = await this.storyModel
      .find({
        isDeleted: { $ne: true },
        type: 'job',
        createdAt: { $gte: startDate },
      })
      .sort({ points: -1, createdAt: -1 })
      .limit(10)
      .select('story_id title author points createdAt')
      .exec();

    return {
      period,
      topStories: topStories.map((s) => ({
        story_id: s.story_id,
        title: s.title,
        author: s.author,
        type: s.type,
        points: s.points,
        commentCount: s.children?.length || 0,
        createdAt: s.createdAt,
      })),
      mostCommented: mostCommented.map((s) => ({
        story_id: s.story_id,
        title: s.title,
        author: s.author,
        type: s.type,
        points: s.points,
        commentCount: s.commentCount,
        createdAt: s.createdAt,
      })),
      trendingJobs: trendingJobs.map((j) => ({
        story_id: j.story_id,
        title: j.title,
        author: j.author,
        points: j.points,
        createdAt: j.createdAt,
      })),
    };
  }
}
