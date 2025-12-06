import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
  Patch,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
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

interface AuthenticatedRequest extends ExpressRequest {
  user: ValidatedUser;
}

// Minimal file type to avoid dependency on Multer's global typings
type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<CreateUserResponse> {
    return await this.usersService.createUser(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponse> {
    return await this.usersService.loginUser(loginUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('isAuthenticated')
  checkAuth(@Request() req: AuthenticatedRequest): AuthCheckResponse {
    return {
      authenticated: true,
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest): Promise<ProfileResponse> {
    return await this.usersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() updates: UpdateUserDto,
  ): Promise<ProfileResponse> {
    return await this.usersService.updateUserProfile(req.user.userId, updates);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: UploadedImageFile,
  ): Promise<{ avatarUrl: string }> {
    return await this.usersService.updateUserPhoto(req.user.userId, file);
  }

  @Get('checkHnUsername/:username')
  async checkHNUsername(
    @Param('username') username: string,
  ): Promise<{ exists: boolean; message: string }> {
    return await this.usersService.checkHNUsername(username);
  }

  @Get('checkUsername/:username')
  async checkUsername(
    @Param('username') username: string,
  ): Promise<{ exists: boolean; message: string }> {
    return await this.usersService.checkUsernameExists(username);
  }

  @Get('search/:username')
  async getUserIdByUsername(
    @Param('username') username: string,
  ): Promise<{ id: string }> {
    return await this.usersService.getUserIdByUsername(username);
  }

  @Get(':id')
  async getPublicById(@Param('id') id: string): Promise<PublicProfileResponse> {
    return await this.usersService.getPublicProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return await this.usersService.followUser(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/unfollow')
  async unfollow(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return await this.usersService.unfollowUser(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/bookmarks')
  async addBookmark(
    @Request() req: AuthenticatedRequest,
    @Body() body: { itemId: string },
  ): Promise<{ message: string; bookmarks: string[] }> {
    return await this.usersService.addBookmark(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/bookmarks')
  async removeBookmark(
    @Request() req: AuthenticatedRequest,
    @Body() body: { itemId: string },
  ): Promise<{ message: string; bookmarks: string[] }> {
    return await this.usersService.removeBookmark(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/isFollowing')
  async getIsFollowing(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ following: boolean }> {
    return await this.usersService.isFollowing(req.user.userId, id);
  }
}
