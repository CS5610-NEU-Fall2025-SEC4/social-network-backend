import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AppConfigModule } from '../config/app-config.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Story, StorySchema } from '../story/story.schema';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forFeature([{ name: Story.name, schema: StorySchema }]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
