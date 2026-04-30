import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Roles, RolesGuard } from '../auth';
import { FinanceService } from './finance.service';
import { InitSePayCheckoutDto } from './sepay-checkout.dto';
import { WalletService } from './wallet.service';

@Controller('payment')
export class SePayPaymentController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly walletService: WalletService,
  ) {}

  @Post('checkout/init')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async initCheckout(
    @Req() req: { user?: { id: number } },
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    body: InitSePayCheckoutDto,
  ) {
    return this.financeService.initSePayCheckout(req.user?.id as number, body);
  }

  @Get('success')
  success() {
    return {
      status: 'success',
      message: 'Payment successful',
    };
  }

  @Get('error')
  error() {
    return {
      status: 'error',
      message: 'Payment failed',
    };
  }

  @Get('cancel')
  cancel() {
    return {
      status: 'cancel',
      message: 'Payment cancelled',
    };
  }

  @Post('ipn')
  async ipn(@Body() payload: Record<string, unknown>) {
    return this.walletService.handleSePayPaymentIpn(
      payload,
      payload as unknown as Prisma.InputJsonValue,
    );
  }
}

@Controller()
export class SePayRootPaymentController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async rootIpn(@Body() payload: Record<string, unknown>) {
    return this.walletService.handleSePayPaymentIpn(
      payload,
      payload as unknown as Prisma.InputJsonValue,
    );
  }
}
