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

import { Request as ExpressRequest } from 'express';
import { Query } from '@nestjs/common';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import type { StoryType } from 'src/search/search.types';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { ValidatedUser } from 'src/users/types/user-response.types';
import { UserRole } from 'src/users/types/user-roles.enum';

interface AuthRequest extends ExpressRequest {
  user: ValidatedUser;
}

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createStoryDto: CreateStoryDto, @Request() req: AuthRequest) {
    return this.storyService.create(
      createStoryDto,
      req.user.username,
      req.user.role,
    );
  }

  @Get()
  findAll() {
    return this.storyService.findAll();
  }

  @Get('type/:type')
  findStoriesByType(@Param('type') type: StoryType) {
    return this.storyService.findByType(type);
  }

  @Get('author/:username')
  findStoriesByAuthor(
    @Param('username') username: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.storyService.findByAuthor(username, limitNum);
  }

  @Get(':storyId/full')
  async findOneWithChildren(@Param('storyId') storyId: string) {
    return this.storyService.findOneWithChildren(storyId);
  }

  @Get(':storyId')
  findOne(@Param('storyId') storyId: string) {
    return this.storyService.findOneHN(storyId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':storyId')
  update(
    @Param('storyId') storyId: string,
    @Body() updateStoryDto: UpdateStoryDto,
    @Request() req: AuthRequest,
  ) {
    return this.storyService.update(storyId, updateStoryDto, req.user.username);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.EMPLOYER, UserRole.ADMIN)
  @Delete(':storyId')
  remove(
    @Param('storyId') storyId: string,
    @Body() body: { reason?: string },
    @Request() req: AuthRequest,
  ) {
    return this.storyService.remove(storyId, req.user, body?.reason);
  }
}
