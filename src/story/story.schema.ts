import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { StoryType } from 'src/search/search.types';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class Story extends Document {
  @Prop({ required: true, unique: true, default: uuidv4 })
  story_id: string;

  @Prop({ required: true })
  author: string;

  @Prop([String])
  children: string[];

  @Prop({ required: true })
  created_at_i: number;

  @Prop({ default: 0 })
  points: number;

  @Prop()
  text: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  type: StoryType;

  @Prop()
  url: string;

  @Prop([String])
  _tags: string[];

  createdAt: Date;
}

export const StorySchema = SchemaFactory.createForClass(Story);
