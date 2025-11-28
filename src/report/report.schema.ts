import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  DISMISSED = 'dismissed',
}

export enum ContentType {
  STORY = 'story',
  COMMENT = 'comment',
}

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ required: true })
  contentId: string;

  @Prop({
    type: String,
    enum: ContentType,
    required: true,
  })
  contentType: ContentType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy: Types.ObjectId;

  @Prop({ required: true })
  reportedByUsername: string;
  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  contentAuthor: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  contentAuthorId?: Types.ObjectId;
  @Prop({
    type: String,
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedByUsername?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ contentId: 1, reportedBy: 1 }, { unique: true });

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ contentAuthor: 1 });
