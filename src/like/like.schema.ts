import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Like extends Document {
  @Prop({ required: true })
  item_id: string;

  @Prop({ required: true, enum: ['story', 'comment'] })
  item_type: 'story' | 'comment';

  @Prop({ required: true })
  username: string;

  createdAt: Date;
  updatedAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

LikeSchema.index({ item_id: 1, username: 1 }, { unique: true });
