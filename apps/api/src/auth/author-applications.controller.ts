import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthorApprovalStatus } from '@prisma/client';
import { DashboardModules } from './decorators/dashboard-modules.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { AuthorApplicationsService } from './author-applications.service';
import { ListAuthorApplicationsQueryDto } from './dto/list-author-applications-query.dto';
import { ReviewAuthorApplicationDto } from './dto/review-author-application.dto';
import { UpsertAuthorApplicationDto } from './dto/upsert-author-application.dto';

@Controller('author-applications')
export class AuthorApplicationsController {
  constructor(
    private readonly authorApplicationsService: AuthorApplicationsService,
  ) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async getOwnApplication(@Req() req: { user?: { id: number } }) {
    return this.authorApplicationsService.getOwnApplication(
      req.user?.id as number,
    );
  }

  @Put('me')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async submitOwnApplication(
    @Req() req: { user?: { id: number } },
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: UpsertAuthorApplicationDto,
  ) {
    return this.authorApplicationsService.submitOwnApplication(
      req.user?.id as number,
      body,
    );
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @DashboardModules('author')
  async listApplications(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: ListAuthorApplicationsQueryDto,
  ) {
    return this.authorApplicationsService.listApplications({
      status: query.status as AuthorApprovalStatus | undefined,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Post('admin/:userId/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @DashboardModules('author')
  async approveApplication(
    @Req() req: { user?: { id: number } },
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.authorApplicationsService.approveApplication(
      req.user?.id as number,
      userId,
    );
  }

  @Post('admin/:userId/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @DashboardModules('author')
  async rejectApplication(
    @Req() req: { user?: { id: number } },
    @Param('userId', ParseIntPipe) userId: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: ReviewAuthorApplicationDto,
  ) {
    return this.authorApplicationsService.rejectApplication(
      req.user?.id as number,
      userId,
      body.reason,
    );
  }
}
