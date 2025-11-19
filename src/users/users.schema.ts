import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false })
  bio?: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ required: false })
  website?: string;

  @Prop({ type: [String], required: false, default: [] })
  interests?: string[];

  @Prop({
    type: {
      twitter: { type: String, required: false },
      github: { type: String, required: false },
      linkedin: { type: String, required: false },
    },
    required: false,
    _id: false,
  })
  social?: { twitter?: string; github?: string; linkedin?: string };

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: false,
    default: [],
  })
  followers?: Types.ObjectId[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: false,
    default: [],
  })
  following?: Types.ObjectId[];

  @Prop({
    type: {
      name: { type: Boolean, default: true },
      bio: { type: Boolean, default: true },
      location: { type: Boolean, default: true },
      website: { type: Boolean, default: true },
      interests: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
    },
    required: false,
    _id: false,
  })
  visibility?: {
    name?: boolean;
    bio?: boolean;
    location?: boolean;
    website?: boolean;
    interests?: boolean;
    social?: boolean;
  };

  // Timestamp fields added by Mongoose when using { timestamps: true }
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
