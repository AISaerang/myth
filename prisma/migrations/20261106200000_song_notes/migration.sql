-- Catatan part per pemusik (POV) pada satu lagu di satu event.
-- Jangkar opsional ke ChartSection; balasan satu tingkat lewat parentId.
-- eventSongId + songId mempertahankan isolasi POV per event dan riwayat lagu.

-- CreateTable
CREATE TABLE `SongNote` (
    `id` VARCHAR(191) NOT NULL,
    `eventSongId` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NULL,
    `sectionLabel` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `partLabel` VARCHAR(80) NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `resolvedAt` DATETIME(3) NULL,
    `resolvedByUserId` VARCHAR(191) NULL,
    `editedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SongNote_eventSongId_status_createdAt_idx`(`eventSongId`, `status`, `createdAt`),
    INDEX `SongNote_songId_status_idx`(`songId`, `status`),
    INDEX `SongNote_sectionId_idx`(`sectionId`),
    INDEX `SongNote_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SongNote` ADD CONSTRAINT `SongNote_eventSongId_fkey` FOREIGN KEY (`eventSongId`) REFERENCES `EventSong`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongNote` ADD CONSTRAINT `SongNote_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongNote` ADD CONSTRAINT `SongNote_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `ChartSection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongNote` ADD CONSTRAINT `SongNote_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `SongNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
