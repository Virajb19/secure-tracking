/*
  Warnings:

  - You are about to drop the column `destination_place_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `source_latitude` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `source_longitude` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `source_place_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the `agent_current_locations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `agent_location_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "agent_current_locations" DROP CONSTRAINT "agent_current_locations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "agent_location_history" DROP CONSTRAINT "agent_location_history_task_id_fkey";

-- DropForeignKey
ALTER TABLE "agent_location_history" DROP CONSTRAINT "agent_location_history_user_id_fkey";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "destination_place_id",
DROP COLUMN "source_latitude",
DROP COLUMN "source_longitude",
DROP COLUMN "source_place_id",
ADD COLUMN     "geofence_radius" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "pickup_latitude" DECIMAL(10,7),
ADD COLUMN     "pickup_longitude" DECIMAL(10,7);

-- DropTable
DROP TABLE "agent_current_locations";

-- DropTable
DROP TABLE "agent_location_history";

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_hash" VARCHAR(64) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "is_within_geofence" BOOLEAN NOT NULL DEFAULT false,
    "distance_from_target" DECIMAL(10,2),
    "location_type" VARCHAR(20) NOT NULL,
    "server_timestamp" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_task_id_idx" ON "attendances"("task_id");

-- CreateIndex
CREATE INDEX "attendances_user_id_idx" ON "attendances"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_task_id_location_type_key" ON "attendances"("task_id", "location_type");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
