CREATE TABLE `MedleyTransition` (
    `id` VARCHAR(191) NOT NULL,
    `songBatchId` VARCHAR(191) NOT NULL,
    `fromSongId` VARCHAR(191) NOT NULL,
    `toSongId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedleyTransition_songBatchId_fromSongId_key`(`songBatchId`, `fromSongId`),
    INDEX `MedleyTransition_songBatchId_toSongId_idx`(`songBatchId`, `toSongId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MedleyTransition`
ADD CONSTRAINT `MedleyTransition_songBatchId_fromSongId_fkey`
FOREIGN KEY (`songBatchId`, `fromSongId`) REFERENCES `SongBatchItem`(`songBatchId`, `songId`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MedleyTransition`
ADD CONSTRAINT `MedleyTransition_songBatchId_toSongId_fkey`
FOREIGN KEY (`songBatchId`, `toSongId`) REFERENCES `SongBatchItem`(`songBatchId`, `songId`)
ON DELETE CASCADE ON UPDATE CASCADE;
