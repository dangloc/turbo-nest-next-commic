import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';
import type { CreateWithdrawalRequestInput } from './types';

@Controller('finance/withdrawals')
@UseGuards(RolesGuard)
@Roles('AUTHOR', 'ADMIN')
export class WithdrawalAuthorController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles('AUTHOR', 'ADMIN')
  @Post('requests')
  async createRequest(
    @Req() req: { user?: { id: number } },
    @Body() body: CreateWithdrawalRequestInput,
  ) {
    return this.financeService.createWithdrawalRequest(
      req.user?.id as number,
      body.amount,
      body.note,
    );
  }
}
