import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Like extends Document {
  @Prop({ required: true })
  item_id: string;

  @Prop({ required: true })
  item_type: string;

  @Prop({ required: true })
  username: string;

  createdAt: Date;
  updatedAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Unique constraint: one user can like an item only once
LikeSchema.index({ item_id: 1, username: 1 }, { unique: true });

// Fast lookup of all likes for an item (for count queries)
LikeSchema.index({ item_id: 1 });

// Fast lookup of user's likes (for "my likes" feature)
LikeSchema.index({ username: 1 });

// Efficient queries for item type filtering if needed
LikeSchema.index({ item_type: 1 });
