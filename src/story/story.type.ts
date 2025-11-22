import type { StoryType } from 'src/search/search.types';

export interface InternalStory {
  story_id: string;
  author: string;
  children: number[];
  created_at_i: number;
  points: number;
  text: string | null;
  title: string;
  type: StoryType;
  url: string;
  _tags: string[];
  createdAt: string;
}
