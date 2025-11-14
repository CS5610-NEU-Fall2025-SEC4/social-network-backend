import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import {
  CreateUserResponse,
  LoginResponse,
  JwtPayload,
} from './types/user-response.types';
import { BcryptUtil, JwtUtil } from '../utils';

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
    } catch (error) {
      if (error.code === 11000) {
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
}
