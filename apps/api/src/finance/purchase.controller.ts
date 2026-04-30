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
import { Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';

@Controller('finance/purchases')
@UseGuards(RolesGuard)
@Roles('USER', 'AUTHOR', 'ADMIN')
export class PurchaseController {
  constructor(private readonly financeService: FinanceService) {}

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Get('novels/:novelId/pricing')
  async getNovelPricing(
    @Req() req: { user?: { id: number } },
    @Param('novelId', ParseIntPipe) novelId: number,
  ) {
    return this.financeService.getNovelPricing(novelId, req.user?.id);
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Get('history')
  async listPurchaseHistory(
    @Req() req: { user?: { id: number } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listPurchaseHistory(req.user?.id as number, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Get('vip/packages')
  async getVipPackages(@Req() req: { user?: { id: number } }) {
    return this.financeService.getVipPackages(req.user?.id as number);
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Post('vip/packages/:packageType')
  async purchaseVipPackage(
    @Req() req: { user?: { id: number } },
    @Param('packageType') packageType: string,
  ) {
    return this.financeService.purchaseVipPackage(
      req.user?.id as number,
      packageType as 'vip_2_months' | 'vip_3_months' | 'vip_permanent',
    );
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Post('chapters/:chapterId')
  async purchaseChapter(
    @Req() req: { user?: { id: number } },
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() body: { novelId: number },
  ) {
    const quote = await this.financeService.resolveChapterPurchaseQuote(
      body.novelId,
      chapterId,
      req.user?.id,
    );

    if (!quote.isLocked || quote.effectivePrice <= 0) {
      return {
        status: 'free_chapter',
        chapterId,
        novelId: body.novelId,
        purchasedChapterId: null,
        effectivePrice: 0,
      };
    }

    return this.financeService.purchaseChapter(req.user?.id as number, {
      chapterId,
      novelId: body.novelId,
      price: quote.effectivePrice,
    });
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Get('history/combo')
  async listComboPurchaseHistory(
    @Req() req: { user?: { id: number } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.financeService.listComboPurchaseHistory(
      req.user?.id as number,
      {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      },
    );
  }

  @Roles('USER', 'AUTHOR', 'ADMIN')
  @Post('novels/:novelId/combo')
  async purchaseNovelCombo(
    @Req() req: { user?: { id: number } },
    @Param('novelId', ParseIntPipe) novelId: number,
  ) {
    return this.financeService.purchaseNovelCombo(req.user?.id as number, {
      novelId,
    });
  }
}
