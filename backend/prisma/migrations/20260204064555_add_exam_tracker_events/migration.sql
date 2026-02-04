-- CreateEnum
CREATE TYPE "ExamTrackerEventType" AS ENUM ('TREASURY_ARRIVAL', 'CUSTODIAN_HANDOVER', 'OPENING_MORNING', 'PACKING_MORNING', 'DELIVERY_MORNING', 'OPENING_AFTERNOON', 'PACKING_AFTERNOON', 'DELIVERY_AFTERNOON');

-- CreateTable
CREATE TABLE "exam_tracker_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "event_type" "ExamTrackerEventType" NOT NULL,
    "exam_date" DATE NOT NULL,
    "shift" VARCHAR(20),
    "image_url" TEXT NOT NULL,
    "image_hash" VARCHAR(64) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "captured_at" TIMESTAMP NOT NULL,
    "submitted_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMP,

    CONSTRAINT "exam_tracker_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_tracker_events_school_id_idx" ON "exam_tracker_events"("school_id");

-- CreateIndex
CREATE INDEX "exam_tracker_events_exam_date_idx" ON "exam_tracker_events"("exam_date");

-- CreateIndex
CREATE UNIQUE INDEX "exam_tracker_events_user_id_school_id_event_type_exam_date_key" ON "exam_tracker_events"("user_id", "school_id", "event_type", "exam_date");

-- AddForeignKey
ALTER TABLE "exam_tracker_events" ADD CONSTRAINT "exam_tracker_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_tracker_events" ADD CONSTRAINT "exam_tracker_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
