import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  // Optional profile fields
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
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
