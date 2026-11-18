-- AlterTable
ALTER TABLE `SongBatchItem` ADD COLUMN `medleyGroupId` VARCHAR(64) NULL,
    ADD COLUMN `medleyLabel` VARCHAR(80) NULL;

-- CreateIndex
CREATE INDEX `SongBatchItem_medleyGroupId_idx` ON `SongBatchItem`(`medleyGroupId`);
