import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';
import type { AdminWalletTransactionsQuery } from './types';

@Controller('admin/wallets')
@UseGuards(RolesGuard)
@Roles('ADMIN')
@DashboardModules('wallets')
export class AdminWalletsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('transactions')
  async listTransactions(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('sortBy') sortByRaw?: string,
    @Query('sortOrder') sortOrderRaw?: string,
    @Query('search') searchRaw?: string,
  ) {
    const page = pageRaw !== undefined ? Number(pageRaw) : undefined;
    const pageSize =
      pageSizeRaw !== undefined ? Number(pageSizeRaw) : undefined;

    const query: AdminWalletTransactionsQuery = {
      page,
      pageSize,
      sortBy: sortByRaw as AdminWalletTransactionsQuery['sortBy'],
      sortOrder: sortOrderRaw as AdminWalletTransactionsQuery['sortOrder'],
      search: searchRaw,
    };

    return this.financeService.listAdminWalletTransactions(query);
  }
}
