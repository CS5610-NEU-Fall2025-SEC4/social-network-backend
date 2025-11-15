import { Controller, Get, Param, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { HNSearchResponse, HNStory } from './search.types';

@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  async search(
    @Query() query: Record<string, string>,
  ): Promise<HNSearchResponse> {
    return this.searchService.search(query);
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string): Promise<HNStory> {
    return this.searchService.getItem(parseInt(id, 10));
  }

  @Get('front-page')
  async frontPage(
    @Query('storyType') storyType?: string,
  ): Promise<HNSearchResponse> {
    return this.searchService.getFrontPage(storyType);
  }

  @Get('tag/:storyType')
  async tag(@Param('storyType') storyType: string): Promise<HNSearchResponse> {
    return this.searchService.getTag(storyType);
  }
}
