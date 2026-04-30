import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth';
import { FinanceService } from './finance.service';

type AuthenticatedWalletRequest = {
  user: {
    id: number;
  };
};

@Controller('finance/wallet')
@UseGuards(JwtAuthGuard)
export class UserWalletController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('transactions')
  async listTransactions(
    @Req() req: AuthenticatedWalletRequest,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    return this.financeService.listUserWalletTransactions(req.user.id, {
      page: pageRaw ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
    });
  }
}
