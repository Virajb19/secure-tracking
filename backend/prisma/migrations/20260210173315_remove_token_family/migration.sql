/*
  Warnings:

  - You are about to drop the column `is_revoked` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `token_family` on the `refresh_tokens` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "refresh_tokens_token_family_idx";

-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "is_revoked",
DROP COLUMN "token_family";
