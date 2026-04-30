import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';
import type { InitiateTopUpInput, VerifyTopUpInput } from './types';

@Controller('finance')
@UseGuards(RolesGuard)
@Roles('USER', 'AUTHOR', 'ADMIN')
export class PaymentController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Post('payments/initiate')
  async initiateTopUp(
    @Req() req: { user?: { id: number } },
    @Body() body: InitiateTopUpInput,
  ) {
    return this.financeService.initiateTopUp(req.user?.id as number, body);
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Post('payments/verify')
  async verifyTopUp(
    @Req() req: { user?: { id: number } },
    @Body() body: VerifyTopUpInput,
  ) {
    return this.financeService.verifyTopUp(req.user?.id as number, body);
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Get('wallet/summary')
  async getWalletSummary(@Req() req: { user?: { id: number } }) {
    return this.financeService.getWalletSummary(req.user?.id as number);
  }
}
