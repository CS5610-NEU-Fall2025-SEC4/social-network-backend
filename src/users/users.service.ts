import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';
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
import { ProfileResponse } from './types/user-response.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<CreateUserResponse> {
    const { username, email, password } = createUserDto;

    const existing = await this.userModel.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existing) {
      throw new BadRequestException('Username or email already exists');
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
    };
    const access_token = JwtUtil.generateToken(this.jwtService, payload);

    return { message: 'Login successful', access_token };
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
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
    };
  }

  async updateUserProfile(
    userId: string,
    updates: UpdateUserDto,
  ): Promise<ProfileResponse> {
    // If email is changing, ensure uniqueness
    if (updates.email) {
      const exists = await this.userModel.findOne({
        _id: { $ne: userId },
        email: updates.email,
      });
      if (exists) throw new BadRequestException('Email already in use');
    }

    const { twitter, github, linkedin, ...rest } = updates;
    const updateDoc: Partial<User> & {
      interests?: string[];
      social?: { twitter?: string; github?: string; linkedin?: string };
    } = { ...rest };
    const social: { twitter?: string; github?: string; linkedin?: string } = {};
    if (typeof twitter === 'string') social.twitter = twitter;
    if (typeof github === 'string') social.github = github;
    if (typeof linkedin === 'string') social.linkedin = linkedin;
    if (Object.keys(social).length > 0) updateDoc.social = social;

    const user = await this.userModel
      .findByIdAndUpdate(userId, updateDoc, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
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
    };
  }
}
