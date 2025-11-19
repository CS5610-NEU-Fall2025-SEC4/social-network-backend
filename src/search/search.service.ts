import { Injectable, BadRequestException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { HNSearchResponse, HNStory, SearchParams } from './search.types';

@Injectable()
export class SearchService {
  constructor(private readonly config: AppConfigService) { }

  private buildQueryString(params: SearchParams): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value as string);
      }
    });
    return searchParams.toString();
  }

  private async fetchAPI<T>(endpoint: string): Promise<T> {
    const base = this.config.algoliaBaseUrl;
    const url = `${base}${endpoint}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new BadRequestException(
        `Algolia API Error: ${res.status} ${res.statusText}`,
      );
    }
    return (await res.json()) as T;
  }

  async search(params: SearchParams): Promise<HNSearchResponse> {
    const processed: SearchParams = {
      query: params.query ?? '',
      hitsPerPage: params.hitsPerPage ?? '30',
      tags: params.tags ?? 'front_page',
      page: params.page ?? '0',
      numericFilters: params.numericFilters ?? '',
    };
    const qs = this.buildQueryString(processed);
    console.log(
      `/${params.sort !== undefined && params.sort !== null && params.sort !== '' ? params.sort : 'search'}?${qs}`,
    );
    return this.fetchAPI(`/${params.sort !== undefined && params.sort !== null && params.sort !== '' ? params.sort : 'search'}?${qs}`,
    );
  }

  async getItem(id: number): Promise<HNStory> {
    return this.fetchAPI(`/items/${id}`);
  }

  async getFrontPage(storyType?: string): Promise<HNSearchResponse> {
    const tagSearch =
      storyType && storyType !== ''
        ? `(front_page,${storyType})`
        : 'front_page';
    return this.search({ tags: tagSearch, hitsPerPage: '10' });
  }

  async getTag(storyType: string): Promise<HNSearchResponse> {
    return this.search({ tags: storyType });
  }
}
