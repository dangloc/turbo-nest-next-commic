import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorApprovalStatus,
  PointTransactionType,
  Prisma,
  TransactionType,
  WithdrawalStatus,
  type VipLevel,
} from '@prisma/client';
import {
  getChapterNumberFromTitle,
  sortChaptersByReadableOrder,
} from '../chapters/chapter-order';
import { PrismaService } from '../prisma.service';
import type {
  AuthorEarningsResponse,
  AdminWalletTransactionsQuery,
  AdminWalletTransactionsResponse,
  ChapterPurchaseInput,
  ComboPurchaseHistoryResponse,
  ComboPurchaseInput,
  InitiateTopUpInput,
  InitSePayCheckoutInput,
  InitSePayCheckoutResponse,
  ListWithdrawalRequestsQuery,
  PurchaseHistoryQuery,
  PurchaseHistoryResponse,
  PurchaseVipPackageResponse,
  UserWalletTransactionsQuery,
  UserWalletTransactionsResponse,
  VerifyTopUpInput,
  VipPackageType,
  VipPackagesResponse,
  WalletSummaryResponse,
  WithdrawalDecision,
} from './types';

const PLATFORM_WALLET_USER_ID = 1;
const REWARD_POINT_EXPIRATION_MONTHS = 1;
const VIP_ACCESS_PACKAGES = new Set([
  'vip_2_months',
  'vip_3_months',
  'vip_permanent',
  'permanent',
  'lifetime',
]);

function getRewardPointActiveCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - REWARD_POINT_EXPIRATION_MONTHS);
  return cutoff;
}

const VIP_PACKAGE_OPTIONS: Record<
  VipPackageType,
  {
    title: string;
    price: number;
    durationDays: number | null;
    displayDays: number | null;
    vipLevelId: number;
    isPermanent: boolean;
  }
> = {
  vip_2_months: {
    title: 'VIP 30 ngày',
    price: 299000,
    durationDays: 30,
    displayDays: 30,
    vipLevelId: 1,
    isPermanent: false,
  },
  vip_3_months: {
    title: 'VIP 60 ngày',
    price: 599000,
    durationDays: 60,
    displayDays: 60,
    vipLevelId: 1,
    isPermanent: false,
  },
  vip_permanent: {
    title: 'VIP vĩnh viễn',
    price: 999999,
    durationDays: null,
    displayDays: null,
    vipLevelId: 9,
    isPermanent: true,
  },
};

const WALLET_ACCOUNT_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  balance: true,
  kimTe: true,
  vipLevelId: true,
  currentVipLevelId: true,
  wallet: {
    select: {
      balance: true,
      depositedBalance: true,
      earnedBalance: true,
      totalDeposited: true,
    },
  },
  vipLevel: {
    select: {
      id: true,
      name: true,
      vndValue: true,
      colorCode: true,
      iconUrl: true,
    },
  },
  currentVipLevel: {
    select: {
      id: true,
      name: true,
      vndValue: true,
      colorCode: true,
      iconUrl: true,
    },
  },
});

type WalletAccountRecord = Prisma.UserGetPayload<{
  select: typeof WALLET_ACCOUNT_SELECT;
}>;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async initiateTopUp(userId: number, input: InitiateTopUpInput) {
    this.assertUserId(userId);
    this.assertMoney(input.amount, 'amount');

    if (!input.reference?.trim()) {
      throw new BadRequestException('reference is required');
    }

    const now = new Date();
    return {
      status: 'pending',
      provider: input.provider,
      reference: input.reference,
      amount: input.amount,
      redirectUrl: this.buildGatewayUrl(input.provider, input.reference),
      returnUrl: input.returnUrl ?? null,
      callbackUrl: input.callbackUrl ?? null,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    };
  }

  async initSePayCheckout(
    userId: number,
    input: InitSePayCheckoutInput,
  ): Promise<InitSePayCheckoutResponse> {
    this.assertUserId(userId);
    this.assertMoney(input.orderAmount, 'orderAmount');

    if (!input.orderInvoiceNumber?.trim()) {
      throw new BadRequestException('orderInvoiceNumber is required');
    }

    const merchantId = process.env.SEPAY_MERCHANT_ID;
    const secretKey = process.env.SEPAY_SECRET_KEY;
    const env =
      process.env.SEPAY_ENV === 'production' ? 'production' : 'sandbox';

    if (!merchantId || !secretKey) {
      throw new BadRequestException(
        'SEPAY_MERCHANT_ID and SEPAY_SECRET_KEY must be configured',
      );
    }

    const moduleRef = await import('sepay-pg-node');
    const client = new moduleRef.SePayPgClient({
      env,
      merchant_id: merchantId,
      secret_key: secretKey,
    });

    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';

    const checkoutFormFields = client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method: input.paymentMethod ?? 'BANK_TRANSFER',
      order_invoice_number: input.orderInvoiceNumber,
      order_amount: Math.floor(input.orderAmount),
      currency: input.currency ?? 'VND',
      order_description:
        input.orderDescription ??
        'Payment for order ' + input.orderInvoiceNumber,
      customer_id: String(userId),
      success_url: input.successUrl ?? webOrigin + '/payment/success',
      error_url: input.errorUrl ?? webOrigin + '/payment/error',
      cancel_url: input.cancelUrl ?? webOrigin + '/payment/cancel',
    });

    return {
      checkoutUrl: client.checkout.initCheckoutUrl(),
      checkoutFormFields,
    };
  }

  async verifyTopUp(userId: number, input: VerifyTopUpInput) {
    this.assertUserId(userId);
    this.assertMoney(input.amount, 'amount');

    if (!input.reference?.trim()) {
      throw new BadRequestException('reference is required');
    }

    if (!input.providerTransactionId?.trim()) {
      throw new BadRequestException('providerTransactionId is required');
    }

    const idempotencyKey = this.makeTopUpIdempotencyKey(
      input.provider,
      input.reference,
    );

    const existing = await this.prisma.transaction.findFirst({
      where: {
        userId,
        type: TransactionType.DEPOSIT,
        content: idempotencyKey,
      },
      select: {
        id: true,
        amountIn: true,
        accumulated: true,
      },
    });

    if (existing) {
      return {
        status: 'already_processed',
        reference: input.reference,
        transactionId: existing.id,
        amountIn: Number(existing.amountIn),
        accumulated: Number(existing.accumulated),
      };
    }

    if (!input.success) {
      return {
        status: 'failed',
        reference: input.reference,
      };
    }

    return this.settleVerifiedTopUp(userId, input, idempotencyKey);
  }

  async getWalletSummary(userId: number): Promise<WalletSummaryResponse> {
    this.assertUserId(userId);

    const [user, transactions, recentPurchases] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: WALLET_ACCOUNT_SELECT,
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        take: 20,
        select: {
          id: true,
          type: true,
          amountIn: true,
          amountOut: true,
          content: true,
          transactionDate: true,
        },
      }),
      this.prisma.purchasedChapter.findMany({
        where: { userId },
        orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }],
        take: 20,
        select: {
          pricePaid: true,
        },
      }),
    ]);

    const balances = this.toWalletBalances(user);
    const vipTier = this.toWalletVipTier(user);

    return {
      balances: {
        depositedBalance: balances.depositedBalance,
        earnedBalance: balances.earnedBalance,
        totalDeposited: balances.totalDeposited,
      },
      purchaseSummary: {
        recentActions: recentPurchases.length,
        recentSpent: recentPurchases.reduce(
          (sum, item) => sum + Number(item.pricePaid),
          0,
        ),
      },
      vipTier: vipTier
        ? {
            id: vipTier.id,
            name: vipTier.name,
            vndValue: vipTier.vndValue,
            colorCode: vipTier.colorCode,
            iconUrl: vipTier.iconUrl,
          }
        : null,
      transactions: transactions.map((item) => {
        const direction = item.amountIn.greaterThan(0) ? 'CREDIT' : 'DEBIT';
        const amount = Number(
          item.amountIn.greaterThan(0) ? item.amountIn : item.amountOut,
        );

        return {
          id: item.id,
          type: item.type,
          label: this.toTransactionLabel(item.type, item.content),
          direction,
          amount,
          content: item.content,
          transactionDate: item.transactionDate,
        };
      }),
    };
  }

  async listUserWalletTransactions(
    userId: number,
    query: UserWalletTransactionsQuery,
  ): Promise<UserWalletTransactionsResponse> {
    this.assertUserId(userId);

    const page =
      Number.isInteger(query.page) && (query.page as number) > 0
        ? (query.page as number)
        : 1;
    const requestedPageSize =
      Number.isInteger(query.pageSize) && (query.pageSize as number) > 0
        ? (query.pageSize as number)
        : 20;
    const pageSize = Math.min(requestedPageSize, 50);
    const skip = (page - 1) * pageSize;

    const [user, transactions, total] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: WALLET_ACCOUNT_SELECT,
      }),
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          transactionDate: true,
          amountIn: true,
          amountOut: true,
          accumulated: true,
          type: true,
          content: true,
          sepayCode: true,
          referenceCode: true,
          gateway: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const summary = this.toUserWalletSummary(user);

    return {
      summary,
      items: transactions.map((item) => {
        const amountIn = Number(item.amountIn);
        const amountOut = Number(item.amountOut);
        const direction = amountIn > 0 ? 'CREDIT' : 'DEBIT';

        return {
          transactionId: item.id,
          transactionDate: item.transactionDate,
          amountIn,
          amountOut,
          amount: direction === 'CREDIT' ? amountIn : -amountOut,
          direction,
          type: item.type,
          status: 'COMPLETED',
          description:
            item.content ?? item.sepayCode ?? item.referenceCode ?? null,
          sepayCode: item.sepayCode,
          referenceCode: item.referenceCode,
          gateway: item.gateway,
          balanceAfter: Number(item.accumulated),
        };
      }),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getVipPackages(userId: number): Promise<VipPackagesResponse> {
    this.assertUserId(userId);

    const [user, subscription] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: WALLET_ACCOUNT_SELECT,
      }),
      this.prisma.vipSubscription.findUnique({
        where: { userId },
        select: {
          packageType: true,
          vipLevelId: true,
          isActive: true,
          purchaseDate: true,
          expiresAt: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const balance = this.toWalletBalances(user).depositedBalance;
    const normalizedSubscription = this.toVipSubscriptionSummary(subscription);

    return {
      balance,
      subscription: normalizedSubscription,
      packages: Object.entries(VIP_PACKAGE_OPTIONS).map(
        ([packageType, option]) => ({
          packageType: packageType as VipPackageType,
          title: option.title,
          price: option.price,
          durationDays: option.durationDays,
          displayDays: option.displayDays,
          isPermanent: option.isPermanent,
          isActive: normalizedSubscription
            ? normalizedSubscription.isPermanent ||
              normalizedSubscription.packageType === packageType
            : false,
        }),
      ),
    };
  }

  async purchaseVipPackage(
    userId: number,
    packageType: VipPackageType,
  ): Promise<PurchaseVipPackageResponse> {
    this.assertUserId(userId);

    const option = VIP_PACKAGE_OPTIONS[packageType];
    if (!option) {
      throw new BadRequestException('Unsupported VIP package');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balance: true,
          kimTe: true,
          vipSubscription: {
            select: {
              packageType: true,
              vipLevelId: true,
              isActive: true,
              purchaseDate: true,
              expiresAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const currentSubscription = this.toVipSubscriptionSummary(
        user.vipSubscription,
      );
      if (currentSubscription?.isPermanent) {
        return {
          status: 'already_active',
          packageType,
          balance: Number(
            (
              await tx.wallet.upsert({
                where: { userId },
                create: {
                  userId,
                  balance: new Prisma.Decimal(0),
                  depositedBalance: new Prisma.Decimal(user.balance),
                  earnedBalance: new Prisma.Decimal(0),
                  totalDeposited: new Prisma.Decimal(
                    Math.max(user.balance, user.kimTe),
                  ),
                },
                update: {},
              })
            ).depositedBalance,
          ),
          subscription: currentSubscription,
        };
      }

      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(user.balance),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(
            Math.max(user.balance, user.kimTe),
          ),
        },
        update: {},
      });

      const price = new Prisma.Decimal(option.price);
      if (wallet.depositedBalance.lessThan(price)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const now = new Date();
      const expiresAt = option.isPermanent
        ? null
        : this.addDays(
            currentSubscription?.expiresAt &&
              currentSubscription.expiresAt.getTime() > now.getTime()
              ? currentSubscription.expiresAt
              : now,
            option.durationDays ?? 0,
          );

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          depositedBalance: wallet.depositedBalance.minus(price),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: Math.floor(Number(updatedWallet.depositedBalance)),
        },
      });

      const subscription = await tx.vipSubscription.upsert({
        where: { userId },
        create: {
          userId,
          vipLevelId: option.vipLevelId,
          packageType,
          isActive: true,
          purchaseDate: now,
          expiresAt,
        },
        update: {
          vipLevelId: option.vipLevelId,
          packageType,
          isActive: true,
          purchaseDate: now,
          expiresAt,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          amountIn: new Prisma.Decimal(0),
          amountOut: price,
          accumulated: updatedWallet.depositedBalance,
          type: TransactionType.PURCHASE_VIP,
          gateway: 'INTERNAL',
          referenceCode: packageType,
          content: `VIP_PACKAGE:${packageType}`,
        },
      });

      return {
        status: 'purchased',
        packageType,
        transactionId: transaction.id,
        balance: Number(updatedWallet.depositedBalance),
        subscription: this.toVipSubscriptionSummary(subscription)!,
      };
    });
  }

  async listPurchaseHistory(
    userId: number,
    query: PurchaseHistoryQuery,
  ): Promise<PurchaseHistoryResponse> {
    this.assertUserId(userId);

    const page =
      Number.isInteger(query.page) && (query.page as number) > 0
        ? (query.page as number)
        : 1;
    const pageSize =
      Number.isInteger(query.pageSize) &&
      (query.pageSize as number) > 0 &&
      (query.pageSize as number) <= 50
        ? (query.pageSize as number)
        : 20;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchasedChapter.findMany({
        where: { userId },
        orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          chapterId: true,
          novelId: true,
          purchasedAt: true,
          pricePaid: true,
          chapter: {
            select: {
              title: true,
            },
          },
          novel: {
            select: {
              title: true,
              uploader: {
                select: {
                  id: true,
                  nickname: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.purchasedChapter.count({ where: { userId } }),
    ]);

    return {
      items: rows.map((row) => ({
        purchasedChapterId: row.id,
        chapterId: row.chapterId,
        chapterTitle: row.chapter?.title ?? 'Chapter #' + row.chapterId,
        novelId: row.novelId,
        novelTitle: row.novel?.title ?? 'Novel #' + row.novelId,
        authorId: row.novel?.uploader.id ?? 0,
        authorDisplayName:
          row.novel?.uploader.nickname ??
          row.novel?.uploader.email ??
          'Unknown author',
        purchasedAt: row.purchasedAt,
        pricePaid: Number(row.pricePaid),
        unlockStatus: row.chapter ? 'UNLOCKED' : 'UNAVAILABLE',
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
  async listComboPurchaseHistory(
    userId: number,
    query: PurchaseHistoryQuery,
  ): Promise<ComboPurchaseHistoryResponse> {
    this.assertUserId(userId);

    const page =
      Number.isInteger(query.page) && (query.page as number) > 0
        ? (query.page as number)
        : 1;
    const pageSize =
      Number.isInteger(query.pageSize) &&
      (query.pageSize as number) > 0 &&
      (query.pageSize as number) <= 50
        ? (query.pageSize as number)
        : 20;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { userId, type: TransactionType.COMBO_PURCHASE },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          amountOut: true,
          content: true,
          transactionDate: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId, type: TransactionType.COMBO_PURCHASE },
      }),
    ]);

    // Parse novelId from content pattern COMBO_PURCHASE:{novelId}:chapters:{count}
    const novelIds = [
      ...new Set(
        rows
          .map((row) => this.parseComboNovelId(row.content))
          .filter((id): id is number => id !== null),
      ),
    ];

    const novels =
      novelIds.length > 0
        ? await this.prisma.novel.findMany({
            where: { id: { in: novelIds } },
            select: { id: true, title: true },
          })
        : [];

    const novelMap = new Map(novels.map((n) => [n.id, n.title]));

    return {
      items: rows.map((row) => {
        const novelId = this.parseComboNovelId(row.content) ?? 0;
        const chapterCount = this.parseComboChapterCount(row.content) ?? 0;
        return {
          transactionId: row.id,
          novelId,
          novelTitle: novelMap.get(novelId) ?? `Novel #${novelId}`,
          purchasedChapterCount: chapterCount,
          chargedAmount: Number(row.amountOut),
          purchasedAt: row.transactionDate,
        };
      }),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async purchaseChapter(userId: number, input: ChapterPurchaseInput) {
    this.assertUserId(userId);
    this.assertMoney(input.price, 'price');

    if (!Number.isInteger(input.chapterId) || input.chapterId <= 0) {
      throw new BadRequestException('chapterId must be a positive integer');
    }

    if (!Number.isInteger(input.novelId) || input.novelId <= 0) {
      throw new BadRequestException('novelId must be a positive integer');
    }

    return this.prisma.$transaction(async (tx) => {
      const chapter = await tx.chapter.findUnique({
        where: { id: input.chapterId },
        select: {
          id: true,
          novelId: true,
          novel: {
            select: {
              uploaderId: true,
            },
          },
        },
      });

      if (!chapter || chapter.novelId !== input.novelId) {
        throw new NotFoundException('Chapter not found for novel');
      }

      const existingPurchase = await tx.purchasedChapter.findUnique({
        where: {
          userId_chapterId: {
            userId,
            chapterId: input.chapterId,
          },
        },
      });

      if (existingPurchase) {
        return {
          status: 'already_owned',
          chapterId: input.chapterId,
          novelId: input.novelId,
          purchasedChapterId: existingPurchase.id,
        };
      }

      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const priceDecimal = new Prisma.Decimal(input.price);
      const buyerSpend = await this.spendBuyerCurrencyInTx(
        tx,
        userId,
        wallet,
        priceDecimal,
        `Mua chương #${input.chapterId}`,
        `chapter:${input.chapterId}`,
      );

      const split = this.calculateRevenueSplit(priceDecimal);
      const updatedBuyerWallet = buyerSpend.updatedWallet;

      const authorUserId = chapter.novel.uploaderId;
      const authorWallet = await tx.wallet.upsert({
        where: { userId: authorUserId },
        create: {
          userId: authorUserId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const updatedAuthorWallet = await tx.wallet.update({
        where: { userId: authorUserId },
        data: {
          earnedBalance: authorWallet.earnedBalance.plus(split.authorShare),
        },
      });

      const platformWallet = await tx.wallet.upsert({
        where: { userId: PLATFORM_WALLET_USER_ID },
        create: {
          userId: PLATFORM_WALLET_USER_ID,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const updatedPlatformWallet = await tx.wallet.update({
        where: { userId: PLATFORM_WALLET_USER_ID },
        data: {
          earnedBalance: platformWallet.earnedBalance.plus(split.platformFee),
        },
      });

      let purchasedChapter;
      try {
        purchasedChapter = await tx.purchasedChapter.create({
          data: {
            userId,
            novelId: input.novelId,
            chapterId: input.chapterId,
            pricePaid: priceDecimal,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return {
            status: 'already_owned',
            chapterId: input.chapterId,
            novelId: input.novelId,
            purchasedChapterId: null,
          };
        }

        throw error;
      }

      const buyerTransaction = await tx.transaction.create({
        data: {
          userId,
          amountIn: new Prisma.Decimal(0),
          amountOut: priceDecimal,
          accumulated: updatedBuyerWallet.depositedBalance,
          type: TransactionType.PURCHASE_CHAPTER,
          content:
            buyerSpend.pointsSpent > 0
              ? `PURCHASE_BUYER:${input.chapterId}:points:${buyerSpend.pointsSpent}`
              : `PURCHASE_BUYER:${input.chapterId}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: authorUserId,
          amountIn: split.authorShare,
          amountOut: new Prisma.Decimal(0),
          accumulated: updatedAuthorWallet.earnedBalance,
          type: TransactionType.PURCHASE_CHAPTER,
          content: `PURCHASE_AUTHOR_REVENUE:${input.chapterId}:buyer:${userId}`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: PLATFORM_WALLET_USER_ID,
          amountIn: split.platformFee,
          amountOut: new Prisma.Decimal(0),
          accumulated: updatedPlatformWallet.earnedBalance,
          type: TransactionType.PURCHASE_CHAPTER,
          content: `PURCHASE_PLATFORM_FEE:${input.chapterId}:buyer:${userId}`,
        },
      });

      return {
        status: 'purchased',
        chapterId: input.chapterId,
        novelId: input.novelId,
        purchasedChapterId: purchasedChapter.id,
        transactionId: buyerTransaction.id,
        depositedBalance: Number(updatedBuyerWallet.depositedBalance),
        pointsSpent: buyerSpend.pointsSpent,
        pointBalance: buyerSpend.pointBalanceAfter,
        revenueSplit: {
          authorUserId,
          authorShare: Number(split.authorShare),
          platformFee: Number(split.platformFee),
        },
      };
    });
  }

  async getNovelPricing(novelId: number, userId?: number) {
    if (!Number.isInteger(novelId) || novelId <= 0) {
      throw new BadRequestException('novelId must be a positive integer');
    }

    return this.prisma.$transaction(async (tx) => {
      const pricing = await this.buildNovelPricingInTx(tx, novelId, userId);
      const buyerWallet = userId
        ? await tx.wallet.findUnique({
            where: { userId },
            select: { depositedBalance: true },
          })
        : null;
      const pointBalance = userId
        ? await this.getPointBalanceInTx(tx, userId)
        : 0;
      const depositedBalance = Number(buyerWallet?.depositedBalance ?? 0);

      return {
        novelId: pricing.novelId,
        uploaderId: pricing.uploaderId,
        settings: {
          defaultChapterPrice: Number(pricing.defaultChapterPrice),
          freeChapterCount: pricing.freeChapterCount,
          comboDiscountPct: pricing.comboDiscountPct,
        },
        combo: {
          lockedChapterCount: pricing.lockedChapterCount,
          originalTotalPrice: Number(pricing.originalLockedTotal),
          discountedTotalPrice: Number(pricing.discountedLockedTotal),
        },
        chapters: pricing.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          chapterNumber: chapter.chapterNumber,
          isLocked: chapter.isLocked,
          effectivePrice: Number(chapter.effectivePrice),
          priceSource: chapter.priceSource,
        })),
        buyer: userId
          ? {
              depositedBalance,
              pointBalance,
              combinedBalance: depositedBalance + pointBalance,
            }
          : undefined,
      };
    });
  }

  async resolveChapterPurchaseQuote(
    novelId: number,
    chapterId: number,
    userId?: number,
  ) {
    if (!Number.isInteger(novelId) || novelId <= 0) {
      throw new BadRequestException('novelId must be a positive integer');
    }

    if (!Number.isInteger(chapterId) || chapterId <= 0) {
      throw new BadRequestException('chapterId must be a positive integer');
    }

    return this.prisma.$transaction(async (tx) => {
      const pricing = await this.buildNovelPricingInTx(tx, novelId, userId);
      const chapter = pricing.chapters.find((item) => item.id === chapterId);
      if (!chapter) {
        throw new NotFoundException('Chapter not found for novel');
      }
      return {
        ...chapter,
        effectivePrice: Number(chapter.effectivePrice),
      };
    });
  }

  async purchaseNovelCombo(userId: number, input: ComboPurchaseInput) {
    this.assertUserId(userId);

    if (!Number.isInteger(input.novelId) || input.novelId <= 0) {
      throw new BadRequestException('novelId must be a positive integer');
    }

    return this.prisma.$transaction(async (tx) => {
      const pricing = await this.buildNovelPricingInTx(
        tx,
        input.novelId,
        userId,
      );
      const lockedChapters = pricing.chapters.filter(
        (chapter) => chapter.isLocked,
      );

      if (lockedChapters.length === 0) {
        return {
          status: 'no_locked_chapters',
          novelId: input.novelId,
          purchasedChapterCount: 0,
          chargedAmount: 0,
        };
      }

      const existingPurchases = await tx.purchasedChapter.findMany({
        where: {
          userId,
          novelId: input.novelId,
          chapterId: { in: lockedChapters.map((chapter) => chapter.id) },
        },
        select: { chapterId: true },
      });

      const ownedChapterIds = new Set(
        existingPurchases.map((item) => item.chapterId),
      );
      const remainingLockedChapters = lockedChapters.filter(
        (chapter) => !ownedChapterIds.has(chapter.id),
      );

      if (remainingLockedChapters.length === 0) {
        return {
          status: 'already_owned',
          novelId: input.novelId,
          purchasedChapterCount: 0,
          chargedAmount: 0,
        };
      }

      const originalTotal = remainingLockedChapters.reduce(
        (acc, chapter) => acc.plus(chapter.effectivePrice),
        new Prisma.Decimal(0),
      );
      const discountFactor = new Prisma.Decimal(
        100 - pricing.comboDiscountPct,
      ).div(100);
      const payable = originalTotal.mul(discountFactor).toDecimalPlaces(2);

      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const buyerSpend = await this.spendBuyerCurrencyInTx(
        tx,
        userId,
        wallet,
        payable,
        `Mua combo truyện #${input.novelId}`,
        `combo:${input.novelId}`,
      );

      const split = this.calculateRevenueSplit(payable);
      const updatedBuyerWallet = buyerSpend.updatedWallet;

      const authorUserId = pricing.uploaderId;
      const authorWallet = await tx.wallet.upsert({
        where: { userId: authorUserId },
        create: {
          userId: authorUserId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const updatedAuthorWallet = await tx.wallet.update({
        where: { userId: authorUserId },
        data: {
          earnedBalance: authorWallet.earnedBalance.plus(split.authorShare),
        },
      });

      const platformWallet = await tx.wallet.upsert({
        where: { userId: PLATFORM_WALLET_USER_ID },
        create: {
          userId: PLATFORM_WALLET_USER_ID,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const updatedPlatformWallet = await tx.wallet.update({
        where: { userId: PLATFORM_WALLET_USER_ID },
        data: {
          earnedBalance: platformWallet.earnedBalance.plus(split.platformFee),
        },
      });

      const ratio = originalTotal.equals(0)
        ? new Prisma.Decimal(0)
        : payable.div(originalTotal);

      await tx.purchasedChapter.createMany({
        data: remainingLockedChapters.map((chapter) => ({
          userId,
          novelId: input.novelId,
          chapterId: chapter.id,
          pricePaid: chapter.effectivePrice.mul(ratio).toDecimalPlaces(2),
        })),
        skipDuplicates: true,
      });

      const comboContent =
        'COMBO_PURCHASE:' +
        input.novelId +
        ':chapters:' +
        remainingLockedChapters.length +
        (buyerSpend.pointsSpent > 0 ? ':points:' + buyerSpend.pointsSpent : '');

      const buyerTransaction = await tx.transaction.create({
        data: {
          userId,
          amountIn: new Prisma.Decimal(0),
          amountOut: payable,
          accumulated: updatedBuyerWallet.depositedBalance,
          type: TransactionType.COMBO_PURCHASE,
          content: comboContent,
        },
      });

      await tx.transaction.create({
        data: {
          userId: authorUserId,
          amountIn: split.authorShare,
          amountOut: new Prisma.Decimal(0),
          accumulated: updatedAuthorWallet.earnedBalance,
          type: TransactionType.COMBO_PURCHASE,
          content: 'COMBO_AUTHOR_REVENUE:' + input.novelId + ':buyer:' + userId,
        },
      });

      await tx.transaction.create({
        data: {
          userId: PLATFORM_WALLET_USER_ID,
          amountIn: split.platformFee,
          amountOut: new Prisma.Decimal(0),
          accumulated: updatedPlatformWallet.earnedBalance,
          type: TransactionType.COMBO_PURCHASE,
          content: 'COMBO_PLATFORM_FEE:' + input.novelId + ':buyer:' + userId,
        },
      });

      return {
        status: 'purchased',
        novelId: input.novelId,
        purchasedChapterCount: remainingLockedChapters.length,
        chargedAmount: Number(payable),
        discountPct: pricing.comboDiscountPct,
        transactionId: buyerTransaction.id,
        depositedBalance: Number(updatedBuyerWallet.depositedBalance),
        pointsSpent: buyerSpend.pointsSpent,
        pointBalance: buyerSpend.pointBalanceAfter,
      };
    });
  }

  async createWithdrawalRequest(userId: number, amount: number, note?: string) {
    this.assertUserId(userId);
    this.assertMoney(amount, 'amount');

    return this.prisma.$transaction(async (tx) => {
      const authorProfile = await tx.authorProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          userId: true,
          approvalStatus: true,
        },
      });

      if (!authorProfile) {
        throw new NotFoundException('Author profile not found');
      }

      if (authorProfile.approvalStatus !== AuthorApprovalStatus.APPROVED) {
        throw new BadRequestException('Author profile is not approved');
      }

      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const requestAmount = new Prisma.Decimal(amount);
      if (wallet.earnedBalance.lessThan(requestAmount)) {
        throw new BadRequestException('Insufficient earned balance');
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          earnedBalance: wallet.earnedBalance.minus(requestAmount),
        },
      });

      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          authorProfileId: authorProfile.id,
          amount: requestAmount,
          status: WithdrawalStatus.PENDING,
          note: note?.trim() || null,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          amountIn: new Prisma.Decimal(0),
          amountOut: requestAmount,
          accumulated: updatedWallet.earnedBalance,
          type: TransactionType.PURCHASE_CHAPTER,
          content: `WITHDRAWAL_FREEZE:${withdrawalRequest.id}`,
        },
      });

      return {
        id: withdrawalRequest.id,
        status: withdrawalRequest.status,
        amount: Number(withdrawalRequest.amount),
        authorProfileId: withdrawalRequest.authorProfileId,
        earnedBalance: Number(updatedWallet.earnedBalance),
        requestedAt: withdrawalRequest.requestedAt,
      };
    });
  }

  async getAuthorEarnings(userId: number): Promise<AuthorEarningsResponse> {
    this.assertUserId(userId);

    type ParsedRevenue = {
      type: 'CHAPTER' | 'COMBO';
      chapterId: number | null;
      novelId: number | null;
      buyerId: number | null;
    };
    type RevenueChapterRow = {
      id: number;
      title: string;
      novelId: number;
      novel: {
        title: string;
      };
    };
    type RevenueNovelRow = {
      id: number;
      title: string;
    };
    type RevenueBuyerRow = {
      id: number;
      username: string | null;
      nickname: string | null;
      email: string;
    };

    const chapterRevenueWhere: Prisma.TransactionWhereInput = {
      userId,
      content: {
        startsWith: 'PURCHASE_AUTHOR_REVENUE:',
      },
    };
    const comboRevenueWhere: Prisma.TransactionWhereInput = {
      userId,
      content: {
        startsWith: 'COMBO_AUTHOR_REVENUE:',
      },
    };
    const revenueWhere: Prisma.TransactionWhereInput = {
      userId,
      OR: [
        {
          content: {
            startsWith: 'PURCHASE_AUTHOR_REVENUE:',
          },
        },
        {
          content: {
            startsWith: 'COMBO_AUTHOR_REVENUE:',
          },
        },
      ],
    };

    const [
      authorProfile,
      wallet,
      lifetimeRevenue,
      chapterSalesCount,
      comboSalesCount,
      revenueRows,
    ] = await Promise.all([
      this.prisma.authorProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          penName: true,
          approvalStatus: true,
          rejectedReason: true,
          bankAccountName: true,
          bankAccountNumber: true,
          bankName: true,
          bankBranch: true,
        },
      }),
      this.prisma.wallet.findUnique({
        where: { userId },
        select: {
          earnedBalance: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: revenueWhere,
        _sum: {
          amountIn: true,
        },
      }),
      this.prisma.transaction.count({
        where: chapterRevenueWhere,
      }),
      this.prisma.transaction.count({
        where: comboRevenueWhere,
      }),
      this.prisma.transaction.findMany({
        where: revenueWhere,
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        take: 20,
        select: {
          id: true,
          transactionDate: true,
          amountIn: true,
          content: true,
        },
      }),
    ]);

    let pendingWithdrawalAmount = 0;
    let withdrawalRequests: AuthorEarningsResponse['withdrawalRequests'] = [];

    if (authorProfile) {
      const [pendingAggregate, requestRows] = await Promise.all([
        this.prisma.withdrawalRequest.aggregate({
          where: {
            authorProfileId: authorProfile.id,
            status: WithdrawalStatus.PENDING,
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.withdrawalRequest.findMany({
          where: {
            authorProfileId: authorProfile.id,
          },
          orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
          take: 10,
          select: {
            id: true,
            amount: true,
            status: true,
            note: true,
            requestedAt: true,
            processedAt: true,
          },
        }),
      ]);

      pendingWithdrawalAmount = Number(pendingAggregate._sum.amount ?? 0);
      withdrawalRequests = requestRows.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        status: item.status,
        note: item.note,
        requestedAt: item.requestedAt,
        processedAt: item.processedAt,
      }));
    }

    const parsedSales = revenueRows
      .map(
        (
          row,
        ): {
          row: (typeof revenueRows)[number];
          parsed: ParsedRevenue | null;
        } => ({
          row,
          parsed: this.parseAuthorRevenueContent(row.content),
        }),
      )
      .filter(
        (
          item,
        ): item is {
          row: (typeof revenueRows)[number];
          parsed: ParsedRevenue;
        } => item.parsed !== null,
      );

    const chapterIds = [
      ...new Set(
        parsedSales
          .map((item) => item.parsed.chapterId)
          .filter((value): value is number => value !== null),
      ),
    ];
    const comboNovelIds = [
      ...new Set(
        parsedSales
          .map((item) => item.parsed.novelId)
          .filter((value): value is number => value !== null),
      ),
    ];
    const buyerIds = [
      ...new Set(
        parsedSales
          .map((item) => item.parsed.buyerId)
          .filter((value): value is number => value !== null),
      ),
    ];

    const [chapters, novels, buyers] = await Promise.all([
      chapterIds.length > 0
        ? this.prisma.chapter.findMany({
            where: {
              id: {
                in: chapterIds,
              },
            },
            select: {
              id: true,
              title: true,
              novelId: true,
              novel: {
                select: {
                  title: true,
                },
              },
            },
          })
        : Promise.resolve<RevenueChapterRow[]>([]),
      comboNovelIds.length > 0
        ? this.prisma.novel.findMany({
            where: {
              id: {
                in: comboNovelIds,
              },
            },
            select: {
              id: true,
              title: true,
            },
          })
        : Promise.resolve<RevenueNovelRow[]>([]),
      buyerIds.length > 0
        ? this.prisma.user.findMany({
            where: {
              id: {
                in: buyerIds,
              },
            },
            select: {
              id: true,
              username: true,
              nickname: true,
              email: true,
            },
          })
        : Promise.resolve<RevenueBuyerRow[]>([]),
    ]);

    const chapterMap = new Map<number, RevenueChapterRow>(
      chapters.map((item) => [item.id, item] as const),
    );
    const novelMap = new Map<number, RevenueNovelRow>(
      novels.map((item) => [item.id, item] as const),
    );
    const buyerMap = new Map<number, string>(
      buyers.map(
        (item) =>
          [
            item.id,
            item.nickname ?? item.username ?? item.email ?? `User #${item.id}`,
          ] as const,
      ),
    );

    return {
      authorProfile: authorProfile
        ? {
            id: authorProfile.id,
            penName: authorProfile.penName,
            approvalStatus: authorProfile.approvalStatus,
            rejectedReason: authorProfile.rejectedReason,
            bankAccountName: authorProfile.bankAccountName,
            bankAccountNumber: authorProfile.bankAccountNumber,
            bankName: authorProfile.bankName,
            bankBranch: authorProfile.bankBranch,
          }
        : null,
      summary: {
        availableBalance: Number(wallet?.earnedBalance ?? 0),
        pendingWithdrawalAmount,
        lifetimeRevenue: Number(lifetimeRevenue._sum.amountIn ?? 0),
        chapterSalesCount,
        comboSalesCount,
        totalSalesCount: chapterSalesCount + comboSalesCount,
      },
      recentSales: parsedSales.map(({ row, parsed }) => {
        const chapter = parsed.chapterId
          ? chapterMap.get(parsed.chapterId)
          : null;
        const novel =
          parsed.type === 'COMBO' && parsed.novelId
            ? novelMap.get(parsed.novelId)
            : chapter?.novelId
              ? { id: chapter.novelId, title: chapter.novel.title }
              : null;

        return {
          transactionId: row.id,
          transactionDate: row.transactionDate,
          type: parsed.type,
          amount: Number(row.amountIn),
          novelId: novel?.id ?? null,
          novelTitle: novel?.title ?? null,
          chapterId: parsed.chapterId,
          chapterTitle: chapter?.title ?? null,
          buyerId: parsed.buyerId,
          buyerDisplayName:
            (parsed.buyerId ? buyerMap.get(parsed.buyerId) : null) ?? null,
        };
      }),
      withdrawalRequests,
    };
  }

  async listAdminWalletTransactions(
    query: AdminWalletTransactionsQuery,
  ): Promise<AdminWalletTransactionsResponse> {
    const page =
      Number.isInteger(query.page) && (query.page as number) > 0
        ? (query.page as number)
        : 1;

    const pageSize =
      Number.isInteger(query.pageSize) &&
      (query.pageSize as number) > 0 &&
      (query.pageSize as number) <= 100
        ? (query.pageSize as number)
        : 20;

    const sortOrder: Prisma.SortOrder =
      query.sortOrder === 'asc' ? 'asc' : 'desc';

    const sortBy =
      query.sortBy === 'amountIn' ||
      query.sortBy === 'username' ||
      query.sortBy === 'currentBalance' ||
      query.sortBy === 'transactionDate'
        ? query.sortBy
        : 'transactionDate';

    const search = query.search?.trim();

    const where: Prisma.TransactionWhereInput = {
      type: TransactionType.DEPOSIT,
      ...(search
        ? {
            user: {
              OR: [
                {
                  username: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  nickname: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          }
        : {}),
    };

    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
      sortBy === 'amountIn'
        ? [{ amountIn: sortOrder }, { id: sortOrder }]
        : sortBy === 'username'
          ? [{ user: { username: sortOrder } }, { id: sortOrder }]
          : sortBy === 'currentBalance'
            ? [
                { user: { wallet: { depositedBalance: sortOrder } } },
                { user: { wallet: { balance: sortOrder } } },
                { user: { balance: sortOrder } },
                { id: sortOrder },
              ]
            : [{ transactionDate: sortOrder }, { id: sortOrder }];

    const [items, total, aggregate, totalUsersWithBalance] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          transactionDate: true,
          amountIn: true,
          type: true,
          sepayCode: true,
          referenceCode: true,
          gateway: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              nickname: true,
              balance: true,
              wallet: {
                select: {
                  balance: true,
                  depositedBalance: true,
                  earnedBalance: true,
                  totalDeposited: true,
                },
              },
              vipLevel: {
                select: {
                  name: true,
                },
              },
              currentVipLevel: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where,
        _sum: { amountIn: true },
        _count: { id: true },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { balance: { gt: 0 } },
            {
              wallet: {
                is: {
                  OR: [
                    { balance: { gt: new Prisma.Decimal(0) } },
                    { depositedBalance: { gt: new Prisma.Decimal(0) } },
                    { totalDeposited: { gt: new Prisma.Decimal(0) } },
                  ],
                },
              },
            },
          ],
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        transactionId: item.id,
        transactionDate: item.transactionDate,
        username:
          item.user.username ??
          item.user.nickname ??
          item.user.email ??
          'unknown-user',
        amountIn: Number(item.amountIn),
        type: item.type,
        sepayCode: item.sepayCode,
        referenceCode: item.referenceCode,
        gateway: item.gateway,
        currentBalance: this.toWalletBalanceSnapshot(item.user)
          .depositedBalance,
        vipLevelName:
          item.user.currentVipLevel?.name ?? item.user.vipLevel?.name ?? null,
      })),
      summary: {
        totalRevenue: Number(aggregate._sum.amountIn ?? 0),
        totalUsersWithBalance,
        totalTransactions: aggregate._count.id ?? 0,
      },
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async listWithdrawalRequests(query: ListWithdrawalRequestsQuery) {
    const page =
      Number.isInteger(query.page) && (query.page as number) > 0
        ? (query.page as number)
        : 1;
    const pageSize =
      Number.isInteger(query.pageSize) &&
      (query.pageSize as number) > 0 &&
      (query.pageSize as number) <= 100
        ? (query.pageSize as number)
        : 20;

    const where: Prisma.WithdrawalRequestWhereInput = {};

    if (query.status) {
      if (
        !Object.values(WithdrawalStatus).includes(
          query.status as WithdrawalStatus,
        )
      ) {
        throw new BadRequestException('Invalid withdrawal status');
      }
      where.status = query.status as WithdrawalStatus;
    }

    if (query.authorProfileId !== undefined) {
      if (
        !Number.isInteger(query.authorProfileId) ||
        query.authorProfileId <= 0
      ) {
        throw new BadRequestException(
          'authorProfileId must be a positive integer',
        );
      }
      where.authorProfileId = query.authorProfileId;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where,
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          authorProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  nickname: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        status: item.status,
        note: item.note,
        requestedAt: item.requestedAt,
        processedAt: item.processedAt,
        authorProfile: {
          id: item.authorProfile.id,
          userId: item.authorProfile.user.id,
          email: item.authorProfile.user.email,
          nickname: item.authorProfile.user.nickname,
          penName: item.authorProfile.penName,
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  async resolveWithdrawalRequest(
    adminUserId: number,
    withdrawalRequestId: number,
    decision: WithdrawalDecision,
    note?: string,
  ) {
    this.assertUserId(adminUserId);

    if (!Number.isInteger(withdrawalRequestId) || withdrawalRequestId <= 0) {
      throw new BadRequestException(
        'withdrawal request id must be a positive integer',
      );
    }

    if (decision !== 'approve' && decision !== 'reject') {
      throw new BadRequestException('decision must be approve or reject');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalRequestId },
        include: {
          authorProfile: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!request) {
        throw new NotFoundException('Withdrawal request not found');
      }

      if (request.status !== WithdrawalStatus.PENDING) {
        throw new BadRequestException('Withdrawal request is already resolved');
      }

      const nextStatus =
        decision === 'approve'
          ? WithdrawalStatus.APPROVED
          : WithdrawalStatus.REJECTED;

      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: {
          status: nextStatus,
          processedAt: new Date(),
          note: note?.trim() || request.note,
        },
      });

      const amount = new Prisma.Decimal(request.amount);
      const authorUserId = request.authorProfile.userId;

      if (decision === 'reject') {
        const authorWallet = await tx.wallet.upsert({
          where: { userId: authorUserId },
          create: {
            userId: authorUserId,
            balance: new Prisma.Decimal(0),
            depositedBalance: new Prisma.Decimal(0),
            earnedBalance: new Prisma.Decimal(0),
            totalDeposited: new Prisma.Decimal(0),
          },
          update: {},
        });

        const refundedWallet = await tx.wallet.update({
          where: { userId: authorUserId },
          data: {
            earnedBalance: authorWallet.earnedBalance.plus(amount),
          },
        });

        await tx.transaction.create({
          data: {
            userId: authorUserId,
            amountIn: amount,
            amountOut: new Prisma.Decimal(0),
            accumulated: refundedWallet.earnedBalance,
            type: TransactionType.PURCHASE_CHAPTER,
            content: `WITHDRAWAL_REJECT_REFUND:${updatedRequest.id}:admin:${adminUserId}`,
          },
        });
      }

      await tx.transaction.create({
        data: {
          userId: authorUserId,
          amountIn: new Prisma.Decimal(0),
          amountOut: decision === 'approve' ? amount : new Prisma.Decimal(0),
          accumulated: new Prisma.Decimal(0),
          type: TransactionType.PURCHASE_CHAPTER,
          content: `WITHDRAWAL_${decision.toUpperCase()}:${updatedRequest.id}:admin:${adminUserId}`,
        },
      });

      return {
        id: updatedRequest.id,
        status: updatedRequest.status,
        amount: Number(updatedRequest.amount),
        processedAt: updatedRequest.processedAt,
        authorProfileId: updatedRequest.authorProfileId,
      };
    });
  }

  private async buildNovelPricingInTx(
    tx: Prisma.TransactionClient,
    novelId: number,
    userId?: number,
  ) {
    const novel = await tx.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        uploaderId: true,
        defaultChapterPrice: true,
        freeChapterCount: true,
        comboDiscountPct: true,
        chapters: {
          orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            title: true,
            chapterNumber: true,
            priceOverride: true,
          },
        },
      },
    });

    if (!novel) {
      throw new NotFoundException('Novel not found');
    }

    const vipSubscription =
      userId && userId > 0
        ? await tx.vipSubscription.findUnique({
            where: { userId },
            select: {
              packageType: true,
              isActive: true,
              expiresAt: true,
              vipLevelId: true,
            },
          })
        : null;

    const hasVipReaderAccess = Boolean(
      vipSubscription &&
      vipSubscription.isActive &&
      (() => {
        const pkgType = (vipSubscription.packageType ?? '').toLowerCase();
        const isPermanent =
          pkgType.includes('permanent') ||
          pkgType.includes('lifetime') ||
          vipSubscription.vipLevelId === 9;
        const isTimeBasedValid =
          VIP_ACCESS_PACKAGES.has(pkgType) &&
          vipSubscription.expiresAt !== null &&
          vipSubscription.expiresAt.getTime() > Date.now();
        return isPermanent || isTimeBasedValid;
      })(),
    );

    const comboDiscountPct = Math.max(0, Math.min(100, novel.comboDiscountPct));
    const freeChapterCount = Math.max(0, novel.freeChapterCount);

    const purchasedChapterIds =
      userId && userId > 0
        ? new Set(
            (
              await tx.purchasedChapter.findMany({
                where: {
                  userId,
                  novelId,
                },
                select: {
                  chapterId: true,
                },
              })
            ).map((item) => item.chapterId),
          )
        : new Set<number>();

    const chapters = sortChaptersByReadableOrder(novel.chapters).map(
      (chapter, index) => {
        const sequenceNumber = index + 1;
        const chapterNumber =
          getChapterNumberFromTitle(chapter.title) ?? sequenceNumber;
        const lockByTier = hasVipReaderAccess
          ? false
          : sequenceNumber > freeChapterCount;
        const isUnlockedByPurchase = purchasedChapterIds.has(chapter.id);
        const isLocked = lockByTier && !isUnlockedByPurchase;
        const effectivePrice = isLocked
          ? (chapter.priceOverride ?? novel.defaultChapterPrice)
          : new Prisma.Decimal(0);

        return {
          id: chapter.id,
          title: chapter.title,
          chapterNumber,
          isLocked,
          effectivePrice,
          priceSource: hasVipReaderAccess
            ? 'vip_subscription'
            : chapter.priceOverride
              ? 'chapter_override'
              : 'novel_default',
        };
      },
    );

    const originalLockedTotal = chapters
      .filter((chapter) => chapter.isLocked)
      .reduce(
        (acc, chapter) => acc.plus(chapter.effectivePrice),
        new Prisma.Decimal(0),
      );

    const discountedLockedTotal = originalLockedTotal
      .mul(new Prisma.Decimal(100 - comboDiscountPct).div(100))
      .toDecimalPlaces(2);

    return {
      novelId: novel.id,
      uploaderId: novel.uploaderId,
      defaultChapterPrice: novel.defaultChapterPrice,
      freeChapterCount,
      comboDiscountPct,
      chapters,
      lockedChapterCount: chapters.filter((chapter) => chapter.isLocked).length,
      originalLockedTotal: hasVipReaderAccess
        ? new Prisma.Decimal(0)
        : originalLockedTotal,
      discountedLockedTotal: hasVipReaderAccess
        ? new Prisma.Decimal(0)
        : discountedLockedTotal,
    };
  }

  private async settleVerifiedTopUp(
    userId: number,
    input: VerifyTopUpInput,
    idempotencyKey: string,
  ) {
    const amountDecimal = new Prisma.Decimal(input.amount);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: new Prisma.Decimal(0),
          depositedBalance: new Prisma.Decimal(0),
          earnedBalance: new Prisma.Decimal(0),
          totalDeposited: new Prisma.Decimal(0),
        },
        update: {},
      });

      const nextDepositedBalance = wallet.depositedBalance.plus(amountDecimal);
      const nextTotalDeposited = wallet.totalDeposited.plus(amountDecimal);

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          depositedBalance: nextDepositedBalance,
          totalDeposited: nextTotalDeposited,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          amountIn: amountDecimal,
          amountOut: new Prisma.Decimal(0),
          accumulated: updatedWallet.depositedBalance,
          type: TransactionType.DEPOSIT,
          content: idempotencyKey,
        },
      });

      const appliedVipLevel = await this.applyVipUpgrade(
        tx,
        userId,
        updatedWallet.totalDeposited,
      );

      return {
        status: 'success',
        reference: input.reference,
        transactionId: transaction.id,
        depositedBalance: Number(updatedWallet.depositedBalance),
        totalDeposited: Number(updatedWallet.totalDeposited),
        appliedVipLevelId: appliedVipLevel?.id ?? null,
      };
    });
  }

  private async applyVipUpgrade(
    tx: Prisma.TransactionClient,
    userId: number,
    totalDeposited: Prisma.Decimal,
  ): Promise<VipLevel | null> {
    const levels = await tx.vipLevel.findMany({
      orderBy: { vndValue: 'asc' },
    });

    let bestLevel: VipLevel | null = null;
    for (const level of levels) {
      if (
        totalDeposited.greaterThanOrEqualTo(new Prisma.Decimal(level.vndValue))
      ) {
        bestLevel = level;
      }
    }

    if (!bestLevel) {
      return null;
    }

    await tx.user.update({
      where: { id: userId },
      data: { currentVipLevelId: bestLevel.id },
    });

    return bestLevel;
  }

  private toWalletBalances(user: WalletAccountRecord | null) {
    return this.toWalletBalanceSnapshot(user);
  }

  private toWalletBalanceSnapshot(
    user: {
      balance?: number | null;
      wallet?: {
        balance?: Prisma.Decimal | null;
        depositedBalance?: Prisma.Decimal | null;
        earnedBalance?: Prisma.Decimal | null;
        totalDeposited?: Prisma.Decimal | null;
      } | null;
    } | null,
  ) {
    const userBalance = Number(user?.balance ?? 0);
    const walletBalance = Number(user?.wallet?.balance ?? 0);
    const walletDepositedBalance = Number(user?.wallet?.depositedBalance ?? 0);
    const walletEarnedBalance = Number(user?.wallet?.earnedBalance ?? 0);
    const walletTotalDeposited = Number(user?.wallet?.totalDeposited ?? 0);

    const depositedBalance =
      walletDepositedBalance > 0
        ? walletDepositedBalance
        : walletBalance > 0
          ? walletBalance
          : userBalance > 0
            ? userBalance
            : 0;
    const totalDeposited =
      walletTotalDeposited > 0 ? walletTotalDeposited : depositedBalance;

    return {
      depositedBalance,
      earnedBalance: walletEarnedBalance,
      totalDeposited,
    };
  }

  private toWalletVipTier(user: WalletAccountRecord | null) {
    return user?.currentVipLevel ?? user?.vipLevel ?? null;
  }

  private toUserWalletSummary(user: WalletAccountRecord) {
    const balances = this.toWalletBalances(user);
    const vipTier = this.toWalletVipTier(user);

    return {
      balance: balances.depositedBalance,
      kimTe:
        user.kimTe > 0 || balances.totalDeposited <= 0
          ? user.kimTe
          : Math.floor(balances.totalDeposited),
      vipLevelId: user.vipLevelId ?? user.currentVipLevelId,
      vipLevelName: vipTier?.name ?? null,
    };
  }

  private toVipSubscriptionSummary(
    subscription: {
      packageType: string;
      vipLevelId: number;
      isActive: boolean;
      purchaseDate: Date;
      expiresAt: Date | null;
    } | null,
  ) {
    if (!subscription) {
      return null;
    }

    const packageType = (subscription.packageType ?? '').toLowerCase();
    const isPermanent =
      packageType.includes('permanent') ||
      packageType.includes('lifetime') ||
      subscription.vipLevelId === 9;
    const isActive =
      subscription.isActive &&
      (isPermanent ||
        (subscription.expiresAt !== null &&
          subscription.expiresAt.getTime() > Date.now()));

    return {
      packageType: subscription.packageType,
      vipLevelId: subscription.vipLevelId,
      isActive,
      purchaseDate: subscription.purchaseDate,
      expiresAt: subscription.expiresAt,
      isPermanent,
    };
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private toTransactionLabel(type: TransactionType, content: string | null) {
    if (type === TransactionType.DEPOSIT) {
      if (content?.startsWith('TOPUP:')) {
        return 'Top-up settled';
      }

      return 'Wallet deposit';
    }

    if (type === TransactionType.COMBO_PURCHASE) {
      return 'Combo purchase';
    }

    if (type === TransactionType.PURCHASE_VIP) {
      return 'VIP package';
    }

    if (type === TransactionType.PURCHASE_CHAPTER) {
      if (content?.startsWith('PURCHASE_BUYER:')) {
        return 'Chapter purchase';
      }

      if (content?.startsWith('WITHDRAWAL_')) {
        return 'Withdrawal activity';
      }

      return 'Purchase ledger';
    }

    return String(type);
  }

  private async getPointBalanceInTx(
    tx: Prisma.TransactionClient,
    userId: number,
  ) {
    const pointTransactions = (
      tx as unknown as {
        pointTransaction?: {
          aggregate: Prisma.TransactionClient['pointTransaction']['aggregate'];
        };
      }
    ).pointTransaction;

    if (!pointTransactions) {
      return 0;
    }

    const balance = await pointTransactions.aggregate({
      where: {
        userId,
        createdAt: { gte: getRewardPointActiveCutoff() },
      },
      _sum: { amount: true },
    });

    return Math.max(0, balance._sum.amount ?? 0);
  }

  private async spendBuyerCurrencyInTx(
    tx: Prisma.TransactionClient,
    userId: number,
    wallet: {
      depositedBalance: Prisma.Decimal;
      balance: Prisma.Decimal;
      earnedBalance: Prisma.Decimal;
      totalDeposited: Prisma.Decimal;
    },
    amount: Prisma.Decimal,
    reason: string,
    referenceId: string,
  ) {
    const walletSpend = wallet.depositedBalance.lessThan(amount)
      ? wallet.depositedBalance
      : amount;
    const remaining = amount.minus(walletSpend);
    const currentPointBalance = await this.getPointBalanceInTx(tx, userId);
    const pointsSpent = remaining.greaterThan(0)
      ? Math.ceil(Number(remaining))
      : 0;

    if (pointsSpent > currentPointBalance) {
      throw new BadRequestException(
        'Insufficient deposited balance or reward points',
      );
    }

    const updatedWallet = walletSpend.greaterThan(0)
      ? await tx.wallet.update({
          where: { userId },
          data: {
            depositedBalance: wallet.depositedBalance.minus(walletSpend),
          },
        })
      : wallet;

    const pointBalanceAfter = currentPointBalance - pointsSpent;

    if (pointsSpent > 0) {
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -pointsSpent,
          balanceAfter: pointBalanceAfter,
          type: PointTransactionType.SPEND,
          reason,
          referenceId,
        },
      });
    }

    return {
      updatedWallet,
      walletSpent: Number(walletSpend),
      pointsSpent,
      pointBalanceAfter,
    };
  }

  private calculateRevenueSplit(price: Prisma.Decimal) {
    const authorShare = price.mul(95).div(100).toDecimalPlaces(2);
    const platformFee = price.minus(authorShare).toDecimalPlaces(2);
    return { authorShare, platformFee };
  }

  private makeTopUpIdempotencyKey(provider: string, reference: string) {
    return `TOPUP:${provider}:${reference}`;
  }

  private buildGatewayUrl(provider: string, reference: string) {
    return `https://sandbox.payments.local/${provider.toLowerCase()}/checkout?reference=${encodeURIComponent(reference)}`;
  }

  private assertUserId(userId: number) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'A valid authenticated user id is required',
      );
    }
  }

  private assertMoney(value: number, fieldName: string) {
    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }
  }

  /** Parse novelId from content pattern: COMBO_PURCHASE:{novelId}:chapters:{count} */
  private parseComboNovelId(content: string | null): number | null {
    if (!content) return null;
    const match = content.match(
      /^COMBO_PURCHASE:(\d+):chapters:\d+(?::points:\d+)?$/,
    );
    if (!match) return null;
    const id = parseInt(match[1], 10);
    return Number.isNaN(id) ? null : id;
  }

  /** Parse chapter count from content pattern: COMBO_PURCHASE:{novelId}:chapters:{count} */
  private parseComboChapterCount(content: string | null): number | null {
    if (!content) return null;
    const match = content.match(
      /^COMBO_PURCHASE:\d+:chapters:(\d+)(?::points:\d+)?$/,
    );
    if (!match) return null;
    const count = parseInt(match[1], 10);
    return Number.isNaN(count) ? null : count;
  }

  private parseAuthorRevenueContent(content: string | null) {
    if (!content) {
      return null;
    }

    const chapterMatch = content.match(
      /^PURCHASE_AUTHOR_REVENUE:(\d+):buyer:(\d+)$/,
    );
    if (chapterMatch) {
      return {
        type: 'CHAPTER' as const,
        chapterId: Number.parseInt(chapterMatch[1], 10),
        novelId: null,
        buyerId: Number.parseInt(chapterMatch[2], 10),
      };
    }

    const comboMatch = content.match(
      /^COMBO_AUTHOR_REVENUE:(\d+):buyer:(\d+)$/,
    );
    if (comboMatch) {
      return {
        type: 'COMBO' as const,
        chapterId: null,
        novelId: Number.parseInt(comboMatch[1], 10),
        buyerId: Number.parseInt(comboMatch[2], 10),
      };
    }

    return null;
  }
}
