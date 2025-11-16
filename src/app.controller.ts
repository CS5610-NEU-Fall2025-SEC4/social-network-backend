import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

type HealthResponse = {
  status: string;
  uptime: number;
  timestamp: string;
  env: string;
  port: number;
  db: { status: string };
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
