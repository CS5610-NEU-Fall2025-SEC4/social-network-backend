import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class BlockedEmail {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: true })
  blockedBy: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type BlockedEmailDocument = HydratedDocument<BlockedEmail>;

export const BlockedEmailSchema = SchemaFactory.createForClass(BlockedEmail);
