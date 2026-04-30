import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { SePayWebhookDto } from './sepay-webhook.dto';

export function buildSePayUsernameCandidates(content: string): string[] {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return [];
  }

  const words = normalized.split(' ').filter(Boolean);
  const candidates: string[] = [];

  for (const word of words) {
    candidates.push(word.toLowerCase());
  }

  for (let index = 0; index < words.length - 1; index += 1) {
    candidates.push(`${words[index]} ${words[index + 1]}`.toLowerCase());
  }

  if (words.length > 1) {
    candidates.push(words.join('').toLowerCase());
  }

  return [...new Set(candidates)];
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async handleSePayWebhook(dto: SePayWebhookDto, rawBody: Prisma.InputJsonValue) {
    const candidates = buildSePayUsernameCandidates(dto.content);
    if (candidates.length === 0) {
      return { status: 'ok', processed: false, reason: 'user_not_found' };
    }

    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          in: candidates,
        },
      },
      select: {
        id: true,
        balance: true,
        kimTe: true,
      },
    });

    if (!user) {
      return { status: 'ok', processed: false, reason: 'user_not_found' };
    }

    return this.recordSePayDeposit(user, dto, rawBody);
  }

  async handleSePayPaymentIpn(
    payload: Record<string, unknown>,
    rawBody: Prisma.InputJsonValue,
  ) {
    const notificationType = String(payload.notification_type ?? '');
    if (notificationType !== 'ORDER_PAID') {
      return {
        success: true,
        ignored: true,
      };
    }

    const order = (payload.order ?? {}) as Record<string, unknown>;
    const transaction = (payload.transaction ?? {}) as Record<string, unknown>;
    const customer = (payload.customer ?? {}) as Record<string, unknown>;
    const userId = Number(customer.customer_id ?? customer.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return {
        success: false,
        message: 'Missing customer user id',
      };
    }

    const orderStatus = String(order.order_status ?? '');
    const transactionStatus = String(transaction.transaction_status ?? '');
    if (orderStatus && orderStatus !== 'CAPTURED') {
      return {
        success: true,
        ignored: true,
        reason: 'order_not_captured',
      };
    }

    if (transactionStatus && transactionStatus !== 'APPROVED') {
      return {
        success: true,
        ignored: true,
        reason: 'transaction_not_approved',
      };
    }

    const code = String(
      transaction.transaction_id ??
        transaction.id ??
        order.id ??
        order.order_id ??
        '',
    );

    if (!code) {
      return {
        success: false,
        message: 'Missing transaction code',
      };
    }

    const amount = Number(
      transaction.transaction_amount ?? order.order_amount ?? 0,
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        message: 'Invalid transaction amount',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        kimTe: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const dto: SePayWebhookDto = {
      gateway: 'SePay',
      transactionDate: String(
        transaction.transaction_date ?? new Date().toISOString(),
      ),
      accountNumber: String(order.account_number ?? 'UNKNOWN'),
      subAccount: String(order.id ?? order.order_id ?? 'UNKNOWN'),
      transferType: 'in',
      transferAmount: Math.floor(amount),
      accumulated: Math.floor(amount),
      code,
      content: String(
        order.order_description ??
          order.order_invoice_number ??
          order.order_id ??
          '',
      ),
      referenceCode: String(
        order.order_invoice_number ?? order.order_id ?? order.id ?? '',
      ),
    };

    const result = await this.recordSePayDeposit(user, dto, rawBody);

    return {
      success: true,
      result,
    };
  }

  private async recordSePayDeposit(
    user: { id: number; balance: number; kimTe: number },
    dto: SePayWebhookDto,
    rawBody: Prisma.InputJsonValue,
  ) {
    const existing = await this.prisma.transaction.findFirst({
      where: {
        sepayCode: dto.code,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return { status: 'ok', processed: false, reason: 'duplicate' };
    }

    const transactionDate = new Date(dto.transactionDate);
    const appliedDate = Number.isNaN(transactionDate.getTime())
      ? new Date()
      : transactionDate;
    const existingUserBalance = new Prisma.Decimal(user.balance);
    const existingTotalDeposited = new Prisma.Decimal(
      Math.max(user.balance, user.kimTe),
    );

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          balance: new Prisma.Decimal(0),
          depositedBalance: existingUserBalance,
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: existingTotalDeposited,
        },
        update: {},
      });

      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: {
          depositedBalance: wallet.depositedBalance.plus(dto.transferAmount),
          totalDeposited: wallet.totalDeposited.plus(dto.transferAmount),
        },
      });

      const vipLevel = await tx.vipLevel.findFirst({
        where: {
          vndValue: {
            lte: Number(updatedWallet.totalDeposited),
          },
        },
        orderBy: {
          vndValue: 'desc',
        },
        select: {
          id: true,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: Math.floor(Number(updatedWallet.depositedBalance)),
          kimTe: Math.floor(Number(updatedWallet.totalDeposited)),
          vipLevelId: vipLevel?.id ?? null,
          currentVipLevelId: vipLevel?.id ?? null,
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amountIn: new Prisma.Decimal(dto.transferAmount),
          amountOut: new Prisma.Decimal(0),
          accumulated: updatedWallet.depositedBalance,
          type: TransactionType.DEPOSIT,
          transactionDate: appliedDate,
          gateway: dto.gateway,
          referenceCode: dto.referenceCode ?? null,
          sepayCode: dto.code,
          rawBody,
          content: dto.content,
        },
      });
    });

    return { status: 'ok', processed: true };
  }
}
