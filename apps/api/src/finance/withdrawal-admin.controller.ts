import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';
import type { ListWithdrawalRequestsQuery } from './types';

@Controller('finance/admin/withdrawals')
@UseGuards(RolesGuard)
@Roles('ADMIN')
@DashboardModules('wallets')
export class WithdrawalAdminController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles('ADMIN')
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('authorProfileId') authorProfileIdRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const authorProfileId =
      authorProfileIdRaw !== undefined ? Number(authorProfileIdRaw) : undefined;
    const page = pageRaw !== undefined ? Number(pageRaw) : undefined;
    const pageSize =
      pageSizeRaw !== undefined ? Number(pageSizeRaw) : undefined;

    const query: ListWithdrawalRequestsQuery = {
      status: status as ListWithdrawalRequestsQuery['status'],
      authorProfileId,
      page,
      pageSize,
    };

    return this.financeService.listWithdrawalRequests(query);
  }

  @Roles('ADMIN')
  @Post(':id/approve')
  async approve(
    @Req() req: { user?: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
  ) {
    return this.financeService.resolveWithdrawalRequest(
      req.user?.id as number,
      id,
      'approve',
      body?.note,
    );
  }

  @Roles('ADMIN')
  @Post(':id/reject')
  async reject(
    @Req() req: { user?: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
  ) {
    return this.financeService.resolveWithdrawalRequest(
      req.user?.id as number,
      id,
      'reject',
      body?.note,
    );
  }
}
