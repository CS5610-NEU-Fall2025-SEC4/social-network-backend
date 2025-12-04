import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin-guard';
import { BlockEmailDto } from './dto/block-email.dto';
import { ValidatedUser } from '../users/types/user-response.types';

interface RequestWithUser extends Request {
  user: ValidatedUser;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users/:id/block')
  async blockUser(
    @Param('id') userId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.adminService.blockUser(userId, req.user.username);
  }

  @Post('users/:id/unblock')
  async unblockUser(@Param('id') userId: string) {
    return this.adminService.unblockUser(userId);
  }

  @Get('users')
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('isBlocked') isBlocked?: string,
  ) {
    const blocked =
      isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined;
    return this.adminService.getAllUsers(page, limit, role, blocked);
  }

  @Get('users/:id')
  async getUserById(@Param('id') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Post('emails/block')
  async blockEmail(
    @Body() blockEmailDto: BlockEmailDto,
    @Request() req: RequestWithUser,
  ) {
    return this.adminService.blockEmail(blockEmailDto, req.user.username);
  }

  @Delete('emails/:email')
  async unblockEmail(@Param('email') email: string) {
    return this.adminService.unblockEmail(email);
  }

  @Get('emails/blocked')
  async getBlockedEmails(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getBlockedEmails(page, limit);
  }

  @Get('stories')
  async getAllStories(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('author') author?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const showDeleted = includeDeleted === 'true';
    return this.adminService.getAllStories(
      page,
      limit,
      type,
      author,
      showDeleted,
    );
  }

  @Get('comments')
  async getAllComments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('storyId') storyId?: string,
    @Query('author') author?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const showDeleted = includeDeleted === 'true';
    return this.adminService.getAllComments(
      page,
      limit,
      storyId,
      author,
      showDeleted,
    );
  }

  @Get('deleted/stories')
  async getDeletedStories(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getDeletedStories(page, limit);
  }

  @Get('deleted/comments')
  async getDeletedComments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getDeletedComments(page, limit);
  }

  @Post('stories/:storyId/restore')
  async restoreStory(
    @Param('storyId') storyId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.adminService.restoreStory(storyId, req.user.username);
  }

  @Post('comments/:commentId/restore')
  async restoreComment(
    @Param('commentId') commentId: string,
    @Body('restoredText') restoredText: string,
    @Request() req: RequestWithUser,
  ) {
    return this.adminService.restoreComment(commentId, req.user.username);
  }
  @Get('analytics/problematic-users')
  async getProblematicUsers(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getProblematicUsers(limit);
  }

  @Get('analytics/top-contributors')
  async getTopContributors(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getTopContributors(limit);
  }

  @Get('analytics/trending')
  async getTrendingContent(@Query('period') period: 'week' | 'month' = 'week') {
    return this.adminService.getTrendingContent(period);
  }

  @Get('stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}
