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

import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import type { StoryType } from 'src/search/search.types';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

interface AuthRequest extends ExpressRequest {
  user: {
    username: string;
  };
}

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createStoryDto: CreateStoryDto, @Request() req: AuthRequest) {
    return this.storyService.create(createStoryDto, req.user.username);
  }

  @Get()
  findAll() {
    return this.storyService.findAll();
  }

  @Get('type/:type')
  findStoriesByType(@Param('type') type: StoryType) {
    return this.storyService.findByType(type);
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

  @UseGuards(JwtAuthGuard)
  @Delete(':storyId')
  remove(@Param('storyId') storyId: string, @Request() req: AuthRequest) {
    return this.storyService.remove(storyId, req.user.username);
  }
}
