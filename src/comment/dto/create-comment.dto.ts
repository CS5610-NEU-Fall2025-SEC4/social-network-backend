import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  parent_id: string;

  @IsString()
  story_id: string;
}
