/*
  Warnings:

  - Added the required column `token_family` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "is_revoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token_family" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_token_family_idx" ON "refresh_tokens"("token_family");
