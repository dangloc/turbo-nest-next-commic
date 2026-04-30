-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "gateway" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "rawBody" JSONB,
ADD COLUMN     "referenceCode" TEXT,
ADD COLUMN     "sepayCode" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kimTe" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vipLevelId" INTEGER;

-- AlterTable
ALTER TABLE "vip_levels" ADD COLUMN     "requiredKimTe" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "transactions_sepayCode_idx" ON "transactions"("sepayCode");

-- CreateIndex
CREATE INDEX "transactions_referenceCode_idx" ON "transactions"("referenceCode");

-- CreateIndex
CREATE INDEX "users_vipLevelId_idx" ON "users"("vipLevelId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_vipLevelId_fkey" FOREIGN KEY ("vipLevelId") REFERENCES "vip_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
