import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Story } from './story.schema';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { HNStory, StoryType } from 'src/search/search.types';

@Injectable()
export class StoryService {
  constructor(@InjectModel(Story.name) private storyModel: Model<Story>) {}

  private _toHNStory(story: Story): HNStory {
    const tags = [...(story._tags || [])];

    if (story.type === 'story' && !tags.includes('story')) {
      tags.push('story');
    }
    if (story.type === 'comment' && !tags.includes('comment')) {
      tags.push('comment');
    }
    if (story.type === 'job' && !tags.includes('job')) {
      tags.push('job');
    }
    return {
      author: story.author,
      children: story.children,
      created_at: new Date(story.createdAt).toISOString(),
      created_at_i: story.created_at_i,
      id: story.story_id,
      options: [],
      parent_id: null,
      points: story.points,
      story_id: story.story_id,
      text: story.text,
      comment_text: null,
      title: story.title,
      type: story.type,
      url: story.url,
      _tags: tags,
    };
  }

  async create(
    createStoryDto: CreateStoryDto,
    username: string,
  ): Promise<HNStory> {
    const createdStory = new this.storyModel({
      ...createStoryDto,

      author: username,

      created_at_i: Math.floor(Date.now() / 1000),
    });

    try {
      const savedStory = await createdStory.save();

      return this._toHNStory(savedStory);
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'Story with this ID or Story ID already exists',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<HNStory[]> {
    const stories = await this.storyModel.find().exec();
    return stories.map(this._toHNStory);
  }

  async findOneByMongoId(mongoId: string): Promise<Story> {
    const story = await this.storyModel.findById(mongoId).exec();
    if (!story) {
      throw new NotFoundException(`Story with ID "${mongoId}" not found`);
    }
    return story;
  }

  async findOne(storyId: string): Promise<Story> {
    const story = await this.storyModel.findOne({ story_id: storyId }).exec();
    if (!story) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }
    return story;
  }

  async findOneHN(storyId: string): Promise<HNStory> {
    const story = await this.findOne(storyId);
    return this._toHNStory(story);
  }

  async update(
    storyId: string,
    updateStoryDto: UpdateStoryDto,
    username: string,
  ): Promise<HNStory> {
    const story = await this.findOne(storyId);
    if (story.author !== username) {
      throw new ForbiddenException('You are not allowed to update this story');
    }
    const existingStory = await this.storyModel
      .findOneAndUpdate({ story_id: storyId }, updateStoryDto, { new: true })
      .exec();
    if (!existingStory) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }
    return this._toHNStory(existingStory);
  }

  async remove(storyId: string, username: string): Promise<void> {
    const story = await this.findOne(storyId);
    if (story.author !== username) {
      throw new ForbiddenException('You are not allowed to delete this story');
    }
    const result = await this.storyModel
      .findOneAndDelete({ story_id: storyId })
      .exec();
    if (!result) {
      throw new NotFoundException(`Story with ID "${storyId}" not found`);
    }
  }

  async findByType(type: StoryType): Promise<HNStory[]> {
    const stories = await this.storyModel.find({ type }).exec();
    return stories.map(this._toHNStory);
  }
}
