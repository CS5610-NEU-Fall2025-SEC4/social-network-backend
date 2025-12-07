import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { ValidatedUser } from '../users/types/user-response.types';

interface AuthRequest extends ExpressRequest {
  user: ValidatedUser;
}

@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':itemId/toggle')
  async toggleLike(
    @Param('itemId') itemId: string,
    @Request() req: AuthRequest,
  ) {
    return this.likeService.toggleLike(itemId, req.user.username);
  }

  @Get(':itemId/status')
  async getLikeStatus(
    @Param('itemId') itemId: string,
    @Query('username') username?: string,
  ) {
    const likeCount = await this.likeService.getLikeCount(itemId);
    const totalPoints = await this.likeService.getTotalPoints(itemId);
    const isLiked = username
      ? await this.likeService.isLikedByUser(itemId, username)
      : false;

    return {
      likeCount,
      totalPoints,
      isLiked,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/my-likes')
  async getMyLikes(@Request() req: AuthRequest) {
    return this.likeService.getUserLikes(req.user.username);
  }
}
