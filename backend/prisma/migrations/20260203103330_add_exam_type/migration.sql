-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('REGULAR', 'COMPARTMENTAL');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "exam_type" "ExamType" NOT NULL DEFAULT 'REGULAR';
