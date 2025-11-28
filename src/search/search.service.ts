import { Injectable, BadRequestException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { HNSearchResponse, HNStory, SearchParams } from './search.types';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Story } from '../story/story.schema';

@Injectable()
export class SearchService {
  constructor(
    private readonly config: AppConfigService,
    @InjectModel(Story.name) private storyModel: Model<Story>,
  ) {}

  private buildQueryString(params: SearchParams): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value as string);
      }
    });
    return searchParams.toString();
  }

  private async fetchAlgoliaAPI<T>(endpoint: string): Promise<T> {
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

  private storyToHNStory(story: Story): HNStory {
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
      objectID: undefined,
      author: story.author,
      children: story.children || [],
      created_at: new Date(story.createdAt).toISOString(),
      created_at_i: story.created_at_i,
      id: story.story_id,
      options: [],
      parent_id: null,
      points: story.points || 0,
      story_id: story.story_id,
      text: story.text || null,
      comment_text: null,
      title: story.title || null,
      type: story.type,
      url: story.url || null,
      _tags: tags,
    };
  }

  private async searchLocalStories(params: SearchParams): Promise<HNStory[]> {
    const query: any = {
      isDeleted: { $ne: true },
    };

    if (params.query && params.query.trim() !== '') {
      query.$or = [
        { title: { $regex: params.query, $options: 'i' } },
        { text: { $regex: params.query, $options: 'i' } },
        { author: { $regex: params.query, $options: 'i' } },
      ];
    }

    if (params.tags && params.tags !== 'front_page') {
      const tagFilters = params.tags.split(',').map((t) => t.trim());
      const typeFilters = tagFilters
        .filter((t) => ['story', 'comment', 'job', 'poll'].includes(t))
        .map((t) => (t === 'ask_hn' ? 'story' : t === 'show_hn' ? 'story' : t));

      if (typeFilters.length > 0) {
        query.type = { $in: typeFilters };
      }

      const customTags = tagFilters.filter(
        (t) => !['story', 'comment', 'job', 'poll'].includes(t),
      );
      if (customTags.length > 0) {
        query._tags = { $in: customTags };
      }
    }

    if (params.numericFilters) {
      const match = params.numericFilters.match(/created_at_i>(\d+)/);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        query.created_at_i = { $gt: timestamp };
      }
    }

    let sortCriteria: any = { created_at_i: -1 };
    if (params.sort === 'search') {
      sortCriteria = { points: -1, created_at_i: -1 };
    }

    const stories = await this.storyModel.find(query).sort(sortCriteria).exec();

    return stories.map((story) => this.storyToHNStory(story));
  }

  private async searchAlgolia(params: SearchParams): Promise<HNSearchResponse> {
    const processed: SearchParams = {
      query: params.query ?? '',
      hitsPerPage: params.hitsPerPage ?? '30',
      tags: params.tags ?? 'front_page',
      page: params.page ?? '0',
      numericFilters: params.numericFilters ?? '',
    };
    const qs = this.buildQueryString(processed);
    const endpoint = `/${params.sort || 'search'}?${qs}`;

    try {
      return await this.fetchAlgoliaAPI<HNSearchResponse>(endpoint);
    } catch (error) {
      console.warn('Algolia search failed, returning empty results:', error);
      return {
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage: parseInt(params.hitsPerPage || '30', 10),
        exhaustiveNbHits: true,
        exhaustiveTypo: true,
        query: params.query || '',
        params: qs,
        processingTimeMS: 0,
      };
    }
  }

  async search(params: SearchParams): Promise<HNSearchResponse> {
    const startTime = Date.now();

    const [algoliaResponse, localStories] = await Promise.all([
      this.searchAlgolia(params),
      this.searchLocalStories(params),
    ]);

    const combinedHits = [...algoliaResponse.hits, ...localStories];

    if (
      params.sort === 'search_by_date' ||
      !params.sort ||
      params.sort === 'search'
    ) {
      combinedHits.sort((a, b) => {
        if (params.sort === 'search_by_date') {
          return b.created_at_i - a.created_at_i;
        } else {
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          return b.created_at_i - a.created_at_i;
        }
      });
    }

    const page = parseInt(params.page || '0', 10);
    const hitsPerPage = parseInt(params.hitsPerPage || '30', 10);
    const startIndex = page * hitsPerPage;
    const endIndex = startIndex + hitsPerPage;
    const paginatedHits = combinedHits.slice(startIndex, endIndex);

    const processingTimeMS = Date.now() - startTime;

    return {
      hits: paginatedHits,
      nbHits: combinedHits.length,
      page,
      nbPages: Math.ceil(combinedHits.length / hitsPerPage),
      hitsPerPage,
      exhaustiveNbHits: true,
      exhaustiveTypo: true,
      query: params.query || '',
      params: this.buildQueryString(params),
      processingTimeMS,
    };
  }

  async getItem(id: number): Promise<HNStory> {
    return this.fetchAlgoliaAPI(`/items/${id}`);
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
