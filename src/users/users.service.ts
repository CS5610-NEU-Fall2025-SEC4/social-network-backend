import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import {
  CreateUserResponse,
  LoginResponse,
  JwtPayload,
} from './types/user-response.types';
import { BcryptUtil, JwtUtil } from '../utils';
import {
  ProfileResponse,
  PublicProfileResponse,
  UserRef,
} from './types/user-response.types';
import { User, UserDocument } from './users.schema';
import { BlockedEmail, BlockedEmailDocument } from './blocked-email.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BlockedEmail.name)
    private readonly blockedEmailModel: Model<BlockedEmailDocument>,
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
  ) {}

  private async isUsernameTaken(username: string): Promise<boolean> {
    try {
      const user = await this.userModel.findOne({ username }).exec();
      return user !== null;
    } catch (error) {
      throw new BadRequestException(
        'Error checking username availability: ' + error.message,
      );
    }
  }

  async checkHNUsername(
    username: string,
  ): Promise<{ exists: boolean; message: string }> {
    try {
      const base = this.appConfigService.hnBaseUrl;
      const url = `${base}/${username}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new BadRequestException('Failed to check HackerNews username');
      }

      const data = await response.json();

      if (data === null) {
        return {
          exists: false,
          message: 'Username is available',
        };
      }

      return {
        exists: true,
        message: 'Username already exists',
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to check HackerNews username : ' + error.message,
      );
    }
  }

  async checkUsernameExists(
    username: string,
  ): Promise<{ exists: boolean; message: string }> {
    const exists = await this.isUsernameTaken(username);
    return {
      exists,
      message: exists ? 'Username already exists.' : 'Username is available',
    };
  }

  async createUser(createUserDto: CreateUserDto): Promise<CreateUserResponse> {
    const { username, email, password } = createUserDto;

    const blockedEmail = await this.blockedEmailModel
      .findOne({ email: email.toLowerCase() })
      .exec();

    if (blockedEmail) {
      throw new BadRequestException(
        'This email address is not allowed to register.',
      );
    }

    const usernameTaken = await this.isUsernameTaken(username);
    if (usernameTaken) {
      throw new BadRequestException('Username already exists');
    }

    const emailTaken = await this.userModel.findOne({ email }).exec();
    if (emailTaken) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await BcryptUtil.hashPassword(
      password,
      this.appConfigService.bcryptSaltRounds,
    );

    try {
      const newUser = await this.userModel.create({
        ...createUserDto,
        password: hashedPassword,
      });

      return {
        message: 'User created successfully',
        user: {
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      };
    } catch (error: unknown) {
      const anyErr = error as { code?: number };
      if (anyErr?.code === 11000) {
        throw new BadRequestException('Username or email already exists');
      }
      throw new BadRequestException(
        'Unable to Process request at the moment. Contact support',
      );
    }
  }

  async loginUser(loginUserDto: LoginUserDto): Promise<LoginResponse> {
    const { username, password } = loginUserDto;
    const user = await this.userModel.findOne({ username: username });

    if (!user) {
      throw new BadRequestException('Invalid username or password');
    }

    if (user.isBlocked) {
      throw new BadRequestException(
        'Your account has been blocked. Please contact support.',
      );
    }

    const isPasswordMatching = await BcryptUtil.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordMatching) {
      throw new BadRequestException('Invalid username or password');
    }

    const payload: JwtPayload = {
      username: user.username,
      sub: user._id.toString(),
      role: user.role,
    };
    const access_token = JwtUtil.generateToken(this.jwtService, payload);

    return { message: 'Login successful', access_token, role: user.role };
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.userModel
      .findById(userId)
      .populate('followers', 'username')
      .populate('following', 'username')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    type FF = {
      followers?: Array<{ _id: unknown; username: string }>;
      following?: Array<{ _id: unknown; username: string }>;
    };
    const rels = user as unknown as FF;
    const followersDocs = rels.followers ?? [];
    const followingDocs = rels.following ?? [];
    const followers: UserRef[] = followersDocs.map((u) => ({
      id: String(u._id),
      username: u.username,
    }));
    const following: UserRef[] = followingDocs.map((u) => ({
      id: String(u._id),
      username: u.username,
    }));
    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio ?? null,
      location: user.location ?? null,
      website: user.website ?? null,
      interests: user.interests ?? [],
      social: user.social ?? {},
      followers,
      following,
      createdAt: user.createdAt as Date,
      updatedAt: user.updatedAt as Date,
      visibility: user.visibility ?? {},
      role: user.role,
      isBlocked: user.isBlocked,
    };
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateUserDto,
  ): Promise<ProfileResponse> {
    const current = await this.userModel.findById(userId).exec();
    if (!current) throw new NotFoundException('User not found');

    if (updates.email) {
      const exists = await this.userModel.findOne({
        _id: { $ne: userId },
        email: updates.email,
      });
      if (exists) throw new BadRequestException('Email already in use');
    }
    if (updates.username) {
      const uExists = await this.userModel.findOne({
        _id: { $ne: userId },
        username: updates.username,
      });
      if (uExists) throw new BadRequestException('Username already in use');
    }

    const {
      twitter,
      github,
      linkedin,
      visibility: visibilityUpdates,
      ...rest
    } = updates;
    const updateDoc: Partial<User> & {
      interests?: string[];
      social?: { twitter?: string; github?: string; linkedin?: string };
      visibility?: {
        name?: boolean;
        bio?: boolean;
        location?: boolean;
        website?: boolean;
        interests?: boolean;
        social?: boolean;
      };
    } = { ...rest };

    if (twitter || github || linkedin) {
      const mergedSocial: {
        twitter?: string;
        github?: string;
        linkedin?: string;
      } = {
        ...(current.social ?? {}),
      };
      if (typeof twitter === 'string') mergedSocial.twitter = twitter;
      if (typeof github === 'string') mergedSocial.github = github;
      if (typeof linkedin === 'string') mergedSocial.linkedin = linkedin;
      updateDoc.social = mergedSocial;
    }

    if (visibilityUpdates) {
      const mergedVis: {
        name?: boolean;
        bio?: boolean;
        location?: boolean;
        website?: boolean;
        interests?: boolean;
        social?: boolean;
      } = { ...(current.visibility ?? {}) };
      for (const [key, value] of Object.entries(visibilityUpdates)) {
        if (typeof value === 'boolean') {
          mergedVis[key as keyof typeof mergedVis] = value;
        }
      }
      updateDoc.visibility = mergedVis;
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, updateDoc, { new: true })
      .populate('followers', 'username')
      .populate('following', 'username')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    type FF2 = {
      followers?: Array<{ _id: unknown; username: string }>;
      following?: Array<{ _id: unknown; username: string }>;
    };
    const rels2 = user as unknown as FF2;
    const followersDocs = rels2.followers ?? [];
    const followingDocs = rels2.following ?? [];
    const followers: UserRef[] = followersDocs.map((u) => ({
      id: String(u._id),
      username: u.username,
    }));
    const following: UserRef[] = followingDocs.map((u) => ({
      id: String(u._id),
      username: u.username,
    }));
    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio ?? null,
      location: user.location ?? null,
      website: user.website ?? null,
      interests: user.interests ?? [],
      social: user.social ?? {},
      followers,
      following,
      createdAt: user.createdAt as Date,
      updatedAt: user.updatedAt as Date,
      visibility: user.visibility ?? {},
      role: user.role,
      isBlocked: user.isBlocked,
    };
  }

  async getPublicProfile(userId: string): Promise<PublicProfileResponse> {
    const user = await this.userModel
      .findById(userId)
      .populate('followers', 'username')
      .populate('following', 'username')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    type FF3 = {
      followers?: Array<{ _id: unknown; username: string }>;
      following?: Array<{ _id: unknown; username: string }>;
    };
    const rels3 = user as unknown as FF3;
    const followersDocs = rels3.followers ?? [];
    const followingDocs = rels3.following ?? [];
    const followers: UserRef[] = followersDocs.map((u) => ({
      id: String(u._id),
      username: u.username,
    }));
    const following: UserRef[] = followingDocs.map((u) => ({
      id: String(u._id),
      username: u.username,
    }));
    return {
      id: String(user._id),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.visibility?.bio === false ? null : (user.bio ?? null),
      location:
        user.visibility?.location === false ? null : (user.location ?? null),
      website:
        user.visibility?.website === false ? null : (user.website ?? null),
      interests:
        user.visibility?.interests === false
          ? undefined
          : (user.interests ?? []),
      social:
        user.visibility?.social === false ? undefined : (user.social ?? {}),
      followers,
      following,
      createdAt: user.createdAt as Date,
      role: user.role,
    };
  }
}
