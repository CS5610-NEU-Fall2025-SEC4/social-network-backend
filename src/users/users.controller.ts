import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Patch,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type {
  CreateUserResponse,
  LoginResponse,
  AuthCheckResponse,
  ValidatedUser,
} from './types/user-response.types';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ProfileResponse,
  PublicProfileResponse,
} from './types/user-response.types';

interface AuthenticatedRequest extends Request {
  user: ValidatedUser;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<CreateUserResponse> {
    return this.usersService.createUser(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponse> {
    return this.usersService.loginUser(loginUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('isAuthenticated')
  checkAuth(@Request() req: AuthenticatedRequest): AuthCheckResponse {
    return {
      authenticated: true,
      userId: req.user.userId,
      username: req.user.username,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest): Promise<ProfileResponse> {
    return this.usersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() updates: UpdateUserDto,
  ): Promise<ProfileResponse> {
    return this.usersService.updateUserProfile(req.user.userId, updates);
  }

  @Get('checkHnUsername/:username')
  async checkHNUsername(
    @Param('username') username: string,
  ): Promise<{ exists: boolean; message: string; }> {
    return this.usersService.checkHNUsername(username);
  }

  @Get('checkUsername/:username')
  async checkUsername(
    @Param('username') username: string,
  ): Promise<{ exists: boolean; message: string; }> {
    return this.usersService.checkUsernameExists(username);
  }

  @Get('search/:username')
  async getUserIdByUsername(
    @Param('username') username: string,
  ): Promise<{ id: string; }> {
    return this.usersService.getUserIdByUsername(username);
  }

  @Get(':id')
  async getPublicById(@Param('id') id: string): Promise<PublicProfileResponse> {
    return this.usersService.getPublicProfile(id);
  }
}
