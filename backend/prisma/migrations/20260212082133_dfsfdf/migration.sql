-- CreateEnum
CREATE TYPE "SubjectCategory" AS ENUM ('CORE', 'VOCATIONAL');

-- CreateEnum
CREATE TYPE "ExamClass" AS ENUM ('CLASS_10', 'CLASS_12');

-- CreateTable
CREATE TABLE "exam_schedules" (
    "id" UUID NOT NULL,
    "exam_date" DATE NOT NULL,
    "class" "ExamClass" NOT NULL,
    "subject" VARCHAR(150) NOT NULL,
    "subject_category" "SubjectCategory" NOT NULL,
    "exam_start_time" VARCHAR(10) NOT NULL,
    "exam_end_time" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_schedules_exam_date_idx" ON "exam_schedules"("exam_date");

-- CreateIndex
CREATE INDEX "exam_schedules_class_idx" ON "exam_schedules"("class");

-- CreateIndex
CREATE UNIQUE INDEX "exam_schedules_exam_date_class_subject_key" ON "exam_schedules"("exam_date", "class", "subject");
