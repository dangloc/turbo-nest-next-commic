import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FinanceService } from './finance.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { SePayWebhookAuthGuard } from './sepay-webhook.guard';
import { SePayIpnGuard } from './sepay-ipn.guard';
import { PaymentController } from './payment.controller';
import { PurchaseController } from './purchase.controller';
import {
  SePayPaymentController,
  SePayRootPaymentController,
} from './sepay-payment.controller';
import { AdminWalletsController } from './admin-wallets.controller';
import { AuthorEarningsController } from './author-earnings.controller';
import { UserWalletController } from './user-wallet.controller';
import { WithdrawalAdminController } from './withdrawal-admin.controller';
import { WithdrawalAuthorController } from './withdrawal-author.controller';

@Module({
  controllers: [
    PaymentController,
    PurchaseController,
    AuthorEarningsController,
    WithdrawalAuthorController,
    WithdrawalAdminController,
    AdminWalletsController,
    UserWalletController,
    WalletController,
    SePayPaymentController,
    SePayRootPaymentController,
  ],
  providers: [FinanceService, WalletService, SePayWebhookAuthGuard, SePayIpnGuard, PrismaService],
})
export class FinanceModule {}
