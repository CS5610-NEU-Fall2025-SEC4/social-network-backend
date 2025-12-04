import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportStatus, ContentType } from './report.schema';
import {
  CreateReportDto,
  UpdateReportStatusDto,
  ReportResponseDto,
} from './dto/report.dto';
import { Story } from '../story/story.schema';
import { Comment } from '../comment/comment.schema';
import { User } from '../users/users.schema';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(Story.name) private storyModel: Model<Story>,
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(
    createReportDto: CreateReportDto,
    userId: string,
  ): Promise<Report> {
    const { contentId, contentType, reason } = createReportDto;

    let contentAuthor: string;
    let contentAuthorId: string | undefined;

    if (contentType === ContentType.STORY) {
      const story = await this.storyModel.findOne({ story_id: contentId });
      if (!story) {
        throw new NotFoundException('Story not found');
      }
      contentAuthor = story.author;

      const authorUser = await this.userModel.findOne({
        username: contentAuthor,
      });
      if (authorUser) {
        contentAuthorId = authorUser._id.toString();
      }
    } else if (contentType === ContentType.COMMENT) {
      const comment = await this.commentModel.findOne({
        comment_id: contentId,
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }
      contentAuthor = comment.author;

      const authorUser = await this.userModel.findOne({
        username: contentAuthor,
      });
      if (authorUser) {
        contentAuthorId = authorUser._id.toString();
      }
    } else {
      throw new BadRequestException('Invalid content type');
    }

    const existingReport = await this.reportModel.findOne({
      contentId,
      reportedBy: userId,
    });

    if (existingReport) {
      throw new ConflictException('You have already reported this content');
    }

    const reporter = await this.userModel.findById(userId);
    if (!reporter) {
      throw new NotFoundException('Reporter user not found');
    }

    const report = new this.reportModel({
      contentId,
      contentType,
      reason,
      reportedBy: userId,
      reportedByUsername: reporter.username,
      contentAuthor,
      contentAuthorId: contentAuthorId || undefined,
      status: ReportStatus.PENDING,
    });

    return report.save();
  }

  async findAll(): Promise<Report[]> {
    return this.reportModel
      .find()
      .populate('reportedBy', 'username email')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllWithDetails(): Promise<ReportResponseDto[]> {
    const reports = await this.reportModel
      .find()
      .populate('reportedBy', 'username email')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .exec();

    const reportsWithDetails: ReportResponseDto[] = await Promise.all(
      reports.map(async (report): Promise<ReportResponseDto> => {
        let content: {
          id: string;
          title?: string;
          text?: string;
          author: string;
        } | null = null;

        if (report.contentType === ContentType.STORY) {
          const story = await this.storyModel.findOne({
            story_id: report.contentId,
          });
          if (story) {
            content = {
              id: story.story_id,
              title: story.title,
              text: story.text || undefined,
              author: story.author,
            };
          }
        } else if (report.contentType === ContentType.COMMENT) {
          const comment = await this.commentModel.findOne({
            comment_id: report.contentId,
          });
          if (comment) {
            content = {
              id: comment.comment_id,
              text: comment.text,
              author: comment.author,
            };
          }
        }

        const reportedBy = report.reportedBy as any;
        const reviewedBy = report.reviewedBy as any;

        const reportData: ReportResponseDto = {
          id: (report as any)._id.toString(),
          contentId: report.contentId,
          contentType: report.contentType,
          reportedBy: {
            id: reportedBy._id.toString(),
            username: reportedBy.username,
            email: reportedBy.email,
          },
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt,
          reviewedAt: report.reviewedAt,
          reviewedBy: reviewedBy
            ? {
                id: reviewedBy._id.toString(),
                username: reviewedBy.username,
              }
            : undefined,
          contentAuthor: report.contentAuthor,
          contentAuthorId: report.contentAuthorId?.toString(),
          content: content,
        };

        return reportData;
      }),
    );

    return reportsWithDetails;
  }
  async findByStatus(status: ReportStatus): Promise<ReportResponseDto[]> {
    const reports = await this.reportModel
      .find({ status })
      .populate('reportedBy', 'username email')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .exec();

    const reportsWithDetails: ReportResponseDto[] = await Promise.all(
      reports.map(async (report): Promise<ReportResponseDto> => {
        let content: {
          id: string;
          title?: string;
          text?: string;
          author: string;
        } | null = null;

        if (report.contentType === ContentType.STORY) {
          const story = await this.storyModel.findOne({
            story_id: report.contentId,
          });
          if (story) {
            content = {
              id: story.story_id,
              title: story.title,
              text: story.text || undefined,
              author: story.author,
            };
          }
        } else if (report.contentType === ContentType.COMMENT) {
          const comment = await this.commentModel.findOne({
            comment_id: report.contentId,
          });
          if (comment) {
            content = {
              id: comment.comment_id,
              text: comment.text,
              author: comment.author,
            };
          }
        }

        const reportedBy = report.reportedBy as any;
        const reviewedBy = report.reviewedBy as any;

        return {
          id: (report as any)._id.toString(),
          contentId: report.contentId,
          contentType: report.contentType,
          reportedBy: {
            id: reportedBy._id.toString(),
            username: reportedBy.username,
            email: reportedBy.email,
          },
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt,
          reviewedAt: report.reviewedAt,
          reviewedBy: reviewedBy
            ? {
                id: reviewedBy._id.toString(),
                username: reviewedBy.username,
              }
            : undefined,
          contentAuthor: report.contentAuthor,
          contentAuthorId: report.contentAuthorId?.toString(),
          content: content,
        };
      }),
    );

    return reportsWithDetails;
  }
  async findByContentId(contentId: string): Promise<Report[]> {
    return this.reportModel
      .find({ contentId })
      .populate('reportedBy', 'username email')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByContentAuthor(username: string): Promise<ReportResponseDto[]> {
    const reports = await this.reportModel
      .find({ contentAuthor: username })
      .populate('reportedBy', 'username email')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .exec();

    const mappedReports: ReportResponseDto[] = reports.map(
      (report): ReportResponseDto => {
        const reportedBy = report.reportedBy as any;
        const reviewedBy = report.reviewedBy as any;

        return {
          id: (report as any)._id.toString(),
          contentId: report.contentId,
          contentType: report.contentType,
          reportedBy: {
            id: reportedBy._id.toString(),
            username: reportedBy.username,
            email: reportedBy.email,
          },
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt,
          reviewedAt: report.reviewedAt,
          reviewedBy: reviewedBy
            ? {
                id: reviewedBy._id.toString(),
                username: reviewedBy.username,
              }
            : undefined,
          contentAuthor: report.contentAuthor,
          contentAuthorId: report.contentAuthorId?.toString(),
          content: undefined,
        };
      },
    );

    return mappedReports;
  }

  async getReportCount(contentId: string): Promise<number> {
    return this.reportModel.countDocuments({
      contentId,
      status: ReportStatus.PENDING,
    });
  }

  async getReportCountByAuthor(username: string): Promise<number> {
    return this.reportModel.countDocuments({
      contentAuthor: username,
      status: ReportStatus.PENDING,
    });
  }

  async updateStatus(
    reportId: string,
    updateStatusDto: UpdateReportStatusDto,
    adminId: string,
  ): Promise<Report> {
    const report = await this.reportModel.findById(reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const admin = await this.userModel.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    report.status = updateStatusDto.status;
    report.reviewedBy = adminId as any;
    report.reviewedByUsername = admin.username;
    report.reviewedAt = new Date();

    return report.save();
  }

  async remove(reportId: string): Promise<void> {
    const result = await this.reportModel.deleteOne({ _id: reportId });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Report not found');
    }
  }
}
