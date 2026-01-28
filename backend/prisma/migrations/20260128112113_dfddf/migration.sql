/*
  Warnings:

  - You are about to drop the column `priority` on the `notices` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('INVITED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'PICKUP_POLICE_STATION';
ALTER TYPE "EventType" ADD VALUE 'ARRIVAL_EXAM_CENTER';
ALTER TYPE "EventType" ADD VALUE 'OPENING_SEAL';
ALTER TYPE "EventType" ADD VALUE 'SEALING_ANSWER_SHEETS';
ALTER TYPE "EventType" ADD VALUE 'SUBMISSION_POST_OFFICE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUBJECT_COORDINATOR';
ALTER TYPE "UserRole" ADD VALUE 'DEALING_ASSISTANT';

-- AlterTable
ALTER TABLE "circulars" ADD COLUMN     "district_id" UUID;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "district_id" UUID,
ADD COLUMN     "flyer_url" TEXT;

-- AlterTable
ALTER TABLE "notices" DROP COLUMN "priority",
ADD COLUMN     "event_date" DATE,
ADD COLUMN     "event_time" VARCHAR(20),
ADD COLUMN     "file_name" VARCHAR(255),
ADD COLUMN     "file_url" TEXT,
ADD COLUMN     "subject" VARCHAR(100),
ADD COLUMN     "type" VARCHAR(50) NOT NULL DEFAULT 'General',
ADD COLUMN     "venue" VARCHAR(255);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "expected_travel_time" INTEGER,
ADD COLUMN     "is_double_shift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shift_type" VARCHAR(20);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coordinator_class" INTEGER,
ADD COLUMN     "coordinator_subject" VARCHAR(100),
ADD COLUMN     "push_token" TEXT;

-- CreateTable
CREATE TABLE "event_invitations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "responded_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_tickets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpdesk_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_setter_selections" (
    "id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "coordinator_id" UUID NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "class_level" INTEGER NOT NULL,
    "selection_type" VARCHAR(50) NOT NULL,
    "status" "SelectionStatus" NOT NULL DEFAULT 'INVITED',
    "official_order_url" TEXT,
    "invitation_message" TEXT,
    "accepted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_setter_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_number" VARCHAR(30) NOT NULL,
    "account_name" VARCHAR(255) NOT NULL,
    "ifsc_code" VARCHAR(15) NOT NULL,
    "bank_name" VARCHAR(150) NOT NULL,
    "branch_name" VARCHAR(150),
    "upi_id" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stars" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "starred_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "submitted_by" UUID NOT NULL,
    "form_type" VARCHAR(10) NOT NULL,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" TEXT,
    "approved_by" UUID,
    "submitted_at" TIMESTAMP,
    "approved_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_invitations_event_id_idx" ON "event_invitations"("event_id");

-- CreateIndex
CREATE INDEX "event_invitations_user_id_idx" ON "event_invitations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_invitations_event_id_user_id_key" ON "event_invitations"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "helpdesk_tickets_user_id_idx" ON "helpdesk_tickets"("user_id");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_idx" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "paper_setter_selections_teacher_id_idx" ON "paper_setter_selections"("teacher_id");

-- CreateIndex
CREATE INDEX "paper_setter_selections_coordinator_id_idx" ON "paper_setter_selections"("coordinator_id");

-- CreateIndex
CREATE INDEX "paper_setter_selections_subject_class_level_idx" ON "paper_setter_selections"("subject", "class_level");

-- CreateIndex
CREATE UNIQUE INDEX "paper_setter_selections_teacher_id_subject_class_level_key" ON "paper_setter_selections"("teacher_id", "subject", "class_level");

-- CreateIndex
CREATE UNIQUE INDEX "bank_details_user_id_key" ON "bank_details"("user_id");

-- CreateIndex
CREATE INDEX "user_stars_admin_id_idx" ON "user_stars"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stars_admin_id_starred_user_id_key" ON "user_stars"("admin_id", "starred_user_id");

-- CreateIndex
CREATE INDEX "form_submissions_school_id_idx" ON "form_submissions"("school_id");

-- CreateIndex
CREATE INDEX "form_submissions_submitted_by_idx" ON "form_submissions"("submitted_by");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_school_id_form_type_key" ON "form_submissions"("school_id", "form_type");

-- CreateIndex
CREATE INDEX "circulars_district_id_idx" ON "circulars"("district_id");

-- CreateIndex
CREATE INDEX "events_district_id_idx" ON "events"("district_id");

-- CreateIndex
CREATE INDEX "notices_type_idx" ON "notices"("type");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_invitations" ADD CONSTRAINT "event_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circulars" ADD CONSTRAINT "circulars_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_setter_selections" ADD CONSTRAINT "paper_setter_selections_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_setter_selections" ADD CONSTRAINT "paper_setter_selections_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stars" ADD CONSTRAINT "user_stars_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stars" ADD CONSTRAINT "user_stars_starred_user_id_fkey" FOREIGN KEY ("starred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
