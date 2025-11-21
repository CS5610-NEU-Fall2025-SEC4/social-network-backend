import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import type { StoryType } from 'src/search/search.types';

export class CreateStoryDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  children: number[];

  @IsNumber()
  @IsOptional()
  points: number;

  @IsString()
  @IsOptional()
  text: string;

  @IsString()
  title: string;

  @IsString()
  type: StoryType;

  @IsString()
  @IsOptional()
  url: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  _tags: string[];
}
