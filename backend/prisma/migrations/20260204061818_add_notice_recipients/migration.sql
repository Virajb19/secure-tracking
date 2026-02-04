-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "is_targeted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notice_recipients" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notice_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notice_recipients_user_id_idx" ON "notice_recipients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_recipients_notice_id_user_id_key" ON "notice_recipients"("notice_id", "user_id");

-- CreateIndex
CREATE INDEX "notices_is_targeted_idx" ON "notices"("is_targeted");

-- AddForeignKey
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
