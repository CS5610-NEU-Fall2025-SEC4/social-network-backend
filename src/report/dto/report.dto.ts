import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ContentType, ReportStatus } from '../report.schema';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType: ContentType;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status: ReportStatus;
}

export interface ReportResponseDto {
  id: string;
  contentId: string;
  contentType: ContentType;
  reportedBy: {
    id: string;
    username: string;
    email: string;
  };
  reason: string;
  status: ReportStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: {
    id: string;
    username: string;
  };
  contentAuthor: string;
  contentAuthorId?: string;
  content?: {
    id: string;
    title?: string;
    text?: string;
    author: string;
  } | null;
}
