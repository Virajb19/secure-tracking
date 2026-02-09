/*
  Warnings:

  - You are about to drop the column `coordinator_class` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "coordinator_class",
ADD COLUMN     "coordinator_class_group" VARCHAR(10);
