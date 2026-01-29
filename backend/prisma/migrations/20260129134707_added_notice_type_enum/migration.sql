/*
  Warnings:

  - The `type` column on the `notices` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('GENERAL', 'PAPER_SETTER', 'PAPER_CHECKER', 'INVITATION', 'PUSH_NOTIFICATION');

-- AlterTable
ALTER TABLE "notices" DROP COLUMN "type",
ADD COLUMN     "type" "NoticeType" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "notices_type_idx" ON "notices"("type");
