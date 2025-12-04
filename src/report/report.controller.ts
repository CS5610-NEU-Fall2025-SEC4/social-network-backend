import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto, UpdateReportStatusDto } from './dto/report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/types/user-roles.enum';

@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() createReportDto: CreateReportDto, @Request() req) {
    return this.reportService.create(createReportDto, req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.reportService.findAllWithDetails();
  }

  @Get('status/:status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByStatus(@Param('status') status: 'pending' | 'reviewed' | 'dismissed') {
    return this.reportService.findByStatus(status as any);
  }

  @Get('content/:contentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByContentId(@Param('contentId') contentId: string) {
    return this.reportService.findByContentId(contentId);
  }

  @Get('content/:contentId/count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getReportCount(@Param('contentId') contentId: string) {
    const count = await this.reportService.getReportCount(contentId);
    return { contentId, count };
  }

  @Get('author/:username')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findByContentAuthor(@Param('username') username: string) {
    return this.reportService.findByContentAuthor(username);
  }

  @Get('author/:username/count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getReportCountByAuthor(@Param('username') username: string) {
    const count = await this.reportService.getReportCountByAuthor(username);
    return { username, count };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReportStatusDto,
    @Request() req,
  ) {
    return this.reportService.updateStatus(
      id,
      updateStatusDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.reportService.remove(id);
  }
}
