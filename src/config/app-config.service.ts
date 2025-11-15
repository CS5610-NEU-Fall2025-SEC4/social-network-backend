import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {
    this.validateConfig();
  }

  get jwtSecret(): string {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  get bcryptSaltRounds(): number {
    const rounds = this.configService.get<string>('BCRYPT_SALT_ROUNDS', '10');
    return parseInt(rounds, 10);
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('MONGODB_URI');
  }
  get algoliaBaseUrl(): string {
    return this.configService.get<string>(
      'ALGOLIA_BASE_URL',
      'https://hn.algolia.com/api/v1',
    );
  }

  private validateConfig(): void {
    const requiredConfigs = [
      { key: 'JWT_ACCESS_SECRET', value: this.jwtSecret },
      { key: 'MONGODB_URI', value: this.databaseUrl },
    ];

    const missing = requiredConfigs.filter((config) => !config.value);

    if (missing.length > 0) {
      const missingKeys = missing.map((c) => c.key).join(', ');
      throw new Error(
        ` Missing required environment variables: ${missingKeys}`,
      );
    }
  }
}
