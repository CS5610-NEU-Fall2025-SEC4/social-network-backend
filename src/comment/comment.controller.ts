import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { Request as ExpressRequest } from 'express';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { ValidatedUser } from 'src/users/types/user-response.types';
import { UserRole } from 'src/users/types/user-roles.enum';

interface AuthRequest extends ExpressRequest {
  user: ValidatedUser;
}

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentService.create(createCommentDto, req.user.username);
  }

  @Get('story/:storyId')
  findByStory(@Param('storyId') storyId: string) {
    return this.commentService.findByStoryId(storyId);
  }

  @Get(':commentId')
  findOne(@Param('commentId') commentId: string) {
    return this.commentService.findOne(commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':commentId')
  update(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: AuthRequest,
  ) {
    return this.commentService.update(
      commentId,
      updateCommentDto,
      req.user.username,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.EMPLOYER, UserRole.ADMIN)
  @Delete(':commentId')
  remove(
    @Param('commentId') commentId: string,
    @Body() body: { reason?: string },
    @Request() req: AuthRequest,
  ) {
    return this.commentService.remove(commentId, req.user, body?.reason);
  }
}
