import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';

@Controller('finance/author/earnings')
@UseGuards(RolesGuard)
@Roles('AUTHOR', 'ADMIN')
@DashboardModules('earnings')
export class AuthorEarningsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  async getEarnings(@Req() req: { user?: { id?: number } }) {
    return this.financeService.getAuthorEarnings(req.user?.id as number);
  }
}
