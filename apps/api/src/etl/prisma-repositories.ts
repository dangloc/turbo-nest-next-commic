import { Prisma, PrismaClient } from '@prisma/client';
import type { PurchasedChapterWrite } from './migrate-purchased-chapters';
import type { TransactionUpsertInput } from './migrate-transactions';
import type {
  SourceChapterContentRow,
  SourceNovelRow,
  SourceTermRow,
  SourceUserRow,
  SourceVipLevelRow,
} from './types';
import type { VipUpsertInput } from './migrate-vip';

export function createPrismaRepositories(prisma: PrismaClient) {
  return {
    userRepo: {
      async upsert(user: SourceUserRow): Promise<void> {
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            password: user.password,
            nickname: user.nickname,
            avatar: user.avatar,
            role: user.role,
          },
          create: {
            id: user.id,
            email: user.email,
            password: user.password,
            nickname: user.nickname,
            avatar: user.avatar,
            role: user.role,
          },
        });
      },
    },

    providerRepo: {
      async upsert(input: {
        userId: number;
        provider: string;
        providerId: string;
      }): Promise<void> {
        await prisma.userProvider.upsert({
          where: {
            provider_providerId: {
              provider: input.provider,
              providerId: input.providerId,
            },
          },
          update: {
            userId: input.userId,
          },
          create: {
            userId: input.userId,
            provider: input.provider,
            providerId: input.providerId,
          },
        });
      },
    },

    walletRepo: {
      async upsert(input: { userId: number; balance: number }): Promise<void> {
        const balance = input.balance.toFixed(2);
        await prisma.wallet.upsert({
          where: { userId: input.userId },
          update: { balance },
          create: {
            userId: input.userId,
            balance,
          },
        });
      },
    },

    vipLevelRepo: {
      async upsert(input: SourceVipLevelRow): Promise<void> {
        await prisma.vipLevel.upsert({
          where: { id: input.id },
          update: {
            name: input.name,
            vndValue: input.vndValue,
            kimTe: input.kimTe,
            colorCode: input.colorCode,
            iconUrl: input.iconUrl,
          },
          create: {
            id: input.id,
            name: input.name,
            vndValue: input.vndValue,
            kimTe: input.kimTe,
            colorCode: input.colorCode,
            iconUrl: input.iconUrl,
          },
        });
      },
    },

    walletBackfillRepo: {
      async backfillFromLegacyBalance(input: {
        userId: number;
        legacyBalance: number;
      }): Promise<number> {
        const baseline = new Prisma.Decimal(input.legacyBalance.toFixed(2));

        const wallet = await prisma.wallet.upsert({
          where: { userId: input.userId },
          update: {},
          create: {
            userId: input.userId,
            balance: baseline,
            depositedBalance: baseline,
            totalDeposited: baseline,
          },
        });

        const nextDepositedBalance = wallet.depositedBalance.lessThan(baseline)
          ? baseline
          : wallet.depositedBalance;
        const nextTotalDeposited = wallet.totalDeposited.lessThan(baseline)
          ? baseline
          : wallet.totalDeposited;

        const shouldUpdateWallet =
          !nextDepositedBalance.equals(wallet.depositedBalance) ||
          !nextTotalDeposited.equals(wallet.totalDeposited);

        if (!shouldUpdateWallet) {
          return 0;
        }

        await prisma.$transaction(async (tx) => {
          await tx.wallet.update({
            where: { userId: input.userId },
            data: {
              depositedBalance: nextDepositedBalance,
              totalDeposited: nextTotalDeposited,
            },
          });

          await tx.user.update({
            where: { id: input.userId },
            data: {
              balance: Math.floor(Number(nextDepositedBalance)),
              kimTe: Math.floor(Number(nextTotalDeposited)),
            },
          });
        });

        return 1;
      },
    },

    vipRepo: {
      async upsert(input: VipUpsertInput): Promise<void> {
        await prisma.vipSubscription.upsert({
          where: { userId: input.userId },
          update: {
            vipLevelId: input.vipLevelId,
            packageType: input.packageType,
            isActive: input.isActive,
            purchaseDate: input.purchaseDate,
            expiresAt: input.expiresAt,
          },
          create: {
            userId: input.userId,
            vipLevelId: input.vipLevelId,
            packageType: input.packageType,
            isActive: input.isActive,
            purchaseDate: input.purchaseDate,
            expiresAt: input.expiresAt,
          },
        });
      },
    },

    transactionRepo: {
      async upsert(input: TransactionUpsertInput): Promise<void> {
        const existing = await prisma.transaction.findFirst({
          where: {
            userId: input.userId,
            transactionDate: input.transactionDate,
            type: input.type,
            amountIn: input.amountIn.toFixed(2),
            amountOut: input.amountOut.toFixed(2),
            content: input.content,
          },
          select: { id: true },
        });

        if (existing) {
          return;
        }

        await prisma.transaction.create({
          data: {
            userId: input.userId,
            amountIn: input.amountIn.toFixed(2),
            amountOut: input.amountOut.toFixed(2),
            accumulated: input.accumulated.toFixed(2),
            type: input.type,
            transactionDate: input.transactionDate,
            content: input.content,
          },
        });
      },
    },

    userFinancialRepo: {
      async upsertFinancialSnapshot(input: {
        userId: number;
        balance: number | null;
        vipLevelId: number | null;
      }): Promise<void> {
        await prisma.$transaction(async (tx) => {
          if (input.balance !== null) {
            const currentBalance = new Prisma.Decimal(
              input.balance.toFixed(2),
            );
            const wallet = await tx.wallet.upsert({
              where: { userId: input.userId },
              update: {},
              create: {
                userId: input.userId,
                balance: currentBalance,
                depositedBalance: currentBalance,
                totalDeposited: currentBalance,
              },
            });
            const nextTotalDeposited = wallet.totalDeposited.lessThan(
              currentBalance,
            )
              ? currentBalance
              : wallet.totalDeposited;

            await tx.wallet.update({
              where: { userId: input.userId },
              data: {
                balance: currentBalance,
                depositedBalance: currentBalance,
                totalDeposited: nextTotalDeposited,
              },
            });

            await tx.user.update({
              where: { id: input.userId },
              data: {
                balance: Math.floor(Number(currentBalance)),
                kimTe: Math.floor(Number(nextTotalDeposited)),
                vipLevelId: input.vipLevelId,
                currentVipLevelId: input.vipLevelId,
              },
            });
            return;
          }

          await tx.user.update({
            where: { id: input.userId },
            data: {
              vipLevelId: input.vipLevelId,
              currentVipLevelId: input.vipLevelId,
            },
          });
        });
      },

      async createManyPurchasedChapters(
        rows: PurchasedChapterWrite[],
        options: { skipDuplicates: boolean },
      ): Promise<number> {
        if (rows.length === 0) {
          return 0;
        }

        const chapterIds = Array.from(
          new Set(rows.map((row) => row.chapterId).filter((id) => id > 0)),
        );

        if (chapterIds.length === 0) {
          return 0;
        }

        const chapters = await prisma.chapter.findMany({
          where: { id: { in: chapterIds } },
          select: { id: true, novelId: true },
        });

        const chapterNovelById = new Map(
          chapters.map((chapter) => [chapter.id, chapter.novelId]),
        );

        const data = rows
          .map((row) => {
            const canonicalNovelId = chapterNovelById.get(row.chapterId);
            if (!canonicalNovelId) {
              return null;
            }

            return {
              userId: row.userId,
              novelId: canonicalNovelId,
              chapterId: row.chapterId,
              pricePaid: row.pricePaid.toFixed(2),
              purchasedAt: row.purchasedAt,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (data.length === 0) {
          return 0;
        }

        try {
          const result = await prisma.purchasedChapter.createMany({
            data,
            skipDuplicates: options.skipDuplicates,
          });

          return result.count;
        } catch (error) {
          // Fallback path: isolate and skip FK-invalid rows instead of aborting ETL.
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== 'P2003'
          ) {
            throw error;
          }

          let inserted = 0;
          for (const row of data) {
            try {
              await prisma.purchasedChapter.create({ data: row });
              inserted += 1;
            } catch (rowError) {
              if (
                rowError instanceof Prisma.PrismaClientKnownRequestError &&
                (rowError.code === 'P2003' ||
                  (options.skipDuplicates && rowError.code === 'P2002'))
              ) {
                continue;
              }

              throw rowError;
            }
          }

          return inserted;
        }
      },
    },

    purchasedChapterRepo: {
      async createMany(
        rows: PurchasedChapterWrite[],
        options: { skipDuplicates: boolean },
      ): Promise<number> {
        const result = await prisma.purchasedChapter.createMany({
          data: rows.map((row) => ({
            userId: row.userId,
            novelId: row.novelId,
            chapterId: row.chapterId,
            pricePaid: row.pricePaid.toFixed(2),
            purchasedAt: row.purchasedAt,
          })),
          skipDuplicates: options.skipDuplicates,
        });

        return result.count;
      },
    },

    termRepo: {
      async upsert(term: SourceTermRow): Promise<void> {
        await prisma.term.upsert({
          where: { id: term.id },
          update: {
            name: term.name,
            slug: term.slug,
            taxonomy: term.taxonomy,
          },
          create: {
            id: term.id,
            name: term.name,
            slug: term.slug,
            taxonomy: term.taxonomy,
          },
        });
      },
    },

    novelTermRepo: {
      async createMany(
        rows: { novelId: number; termId: number }[],
        options: { skipDuplicates: boolean },
      ): Promise<number> {
        const uniqueRows = options.skipDuplicates
          ? Array.from(
              new Map(
                rows.map((row) => [`${row.novelId}:${row.termId}`, row]),
              ).values(),
            )
          : rows;

        let inserted = 0;

        for (const row of uniqueRows) {
          if (row.novelId <= 0 || row.termId <= 0) {
            continue;
          }

          const result = options.skipDuplicates
            ? await prisma.$executeRaw`
                INSERT INTO "_NovelToTerm" ("A", "B")
                VALUES (${row.novelId}, ${row.termId})
                ON CONFLICT DO NOTHING
              `
            : await prisma.$executeRaw`
                INSERT INTO "_NovelToTerm" ("A", "B")
                VALUES (${row.novelId}, ${row.termId})
              `;

          inserted += Number(result);
        }

        return inserted;
      },
    },

    novelRepo: {
      async upsert(novel: SourceNovelRow): Promise<void> {
        await prisma.novel.upsert({
          where: { id: novel.id },
          update: {
            title: novel.title,
            postContent: novel.postContent,
            defaultChapterPrice: novel.defaultChapterPrice ?? 0,
            freeChapterCount: novel.freeChapterCount ?? 0,
            comboDiscountPct: novel.comboDiscountPct ?? 0,
            updatedAt: new Date(),
          },
          create: {
            id: novel.id,
            title: novel.title,
            postContent: novel.postContent,
            defaultChapterPrice: novel.defaultChapterPrice ?? 0,
            freeChapterCount: novel.freeChapterCount ?? 0,
            comboDiscountPct: novel.comboDiscountPct ?? 0,
            createdAt: novel.createdAt,
          },
        });
      },
    },

    chapterRepo: {
      async upsert(chapter: SourceChapterContentRow): Promise<void> {
        await prisma.chapter.upsert({
          where: { id: chapter.id },
          update: {
            novelId: chapter.novelId,
            title: chapter.title,
            postContent: chapter.postContent,
            updatedAt: new Date(),
          },
          create: {
            id: chapter.id,
            novelId: chapter.novelId,
            title: chapter.title,
            postContent: chapter.postContent,
            createdAt: chapter.createdAt,
          },
        });
      },
    },
  };
}
