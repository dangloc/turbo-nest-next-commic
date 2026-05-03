-- AlterTable
ALTER TABLE "ad_settings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "novel_recommendation_votes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "term_submissions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "gif_assets" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gif_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gif_assets_isActive_idx" ON "gif_assets"("isActive");

-- CreateIndex
CREATE INDEX "gif_assets_category_idx" ON "gif_assets"("category");

-- CreateIndex
CREATE INDEX "gif_assets_keyword_idx" ON "gif_assets"("keyword");
