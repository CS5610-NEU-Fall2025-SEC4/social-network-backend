import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true, unique: true, default: uuidv4 })
  comment_id: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: String, default: null })
  parent_id: string | null;

  @Prop({ required: true })
  story_id: string;

  @Prop([String])
  children: string[];

  @Prop({ required: true })
  created_at_i: number;

  @Prop({ default: 0 })
  points: number;

  createdAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
