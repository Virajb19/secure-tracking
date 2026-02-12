/*
  Warnings:

  - A unique constraint covering the columns `[exam_date,class,subject,exam_center_id]` on the table `exam_schedules` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `exam_center_id` to the `exam_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "exam_schedules_exam_date_class_subject_key";

-- AlterTable
ALTER TABLE "exam_schedules" ADD COLUMN     "exam_center_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "exam_schedules_exam_center_id_idx" ON "exam_schedules"("exam_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_schedules_exam_date_class_subject_exam_center_id_key" ON "exam_schedules"("exam_date", "class", "subject", "exam_center_id");

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_exam_center_id_fkey" FOREIGN KEY ("exam_center_id") REFERENCES "exam_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
