/*
  Warnings:

  - The `event_type` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SchoolEventType" AS ENUM ('MEETING', 'EXAM', 'HOLIDAY', 'SEMINAR', 'WORKSHOP', 'SPORTS', 'CULTURAL', 'OTHER');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "activity_type" VARCHAR(100),
ADD COLUMN     "event_end_date" DATE,
ADD COLUMN     "female_participants" INTEGER,
ADD COLUMN     "male_participants" INTEGER,
DROP COLUMN "event_type",
ADD COLUMN     "event_type" "SchoolEventType" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");
