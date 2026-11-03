-- docs/13 §4.2/§4.3 Q5 P1 (expand → migrate → contract; ADDITIVE ONLY):
-- Song = item Pustaka Lagu (eventId jadi nullable + arrangerCredits),
-- EventSong = setlist event, kolom eventSongId/eventId pada tabel anak.
-- Satu-satunya perubahan bentuk kolom lama: Song.eventId NOT NULL → NULL
-- (FK di-drop lalu dibuat ulang dengan ON DELETE SET NULL — sesuai
-- kecualian dalam prompt P1 #8). Tidak ada DROP kolom/RENAME/data.

-- DropForeignKey
ALTER TABLE `Song` DROP FOREIGN KEY `Song_eventId_fkey`;

-- AlterTable
ALTER TABLE `PracticeProgress` ADD COLUMN `eventSongId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RehearsalSong` ADD COLUMN `eventSongId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Song` ADD COLUMN `arrangerCredits` TEXT NULL,
    MODIFY `eventId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SongAssignment` ADD COLUMN `eventSongId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SongBatchItem` ADD COLUMN `eventSongId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SongMaterial` ADD COLUMN `eventId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `EventSong` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `eventKey` VARCHAR(16) NULL,
    `liturgicalFunction` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `status` ENUM('DRAFT', 'SOURCE_SHARED', 'ARRANGEMENT_IN_PROGRESS', 'REFERENCE_READY', 'PRACTICING', 'NEEDS_REVIEW', 'READY_FOR_REHEARSAL', 'REHEARSAL_READY', 'FINAL_LOCKED') NOT NULL DEFAULT 'DRAFT',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `isFinalLocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EventSong_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
    INDEX `EventSong_eventId_isPublished_idx`(`eventId`, `isPublished`),
    UNIQUE INDEX `EventSong_eventId_songId_key`(`eventId`, `songId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PracticeProgress_eventSongId_personId_key` ON `PracticeProgress`(`eventSongId`, `personId`);

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventSong` ADD CONSTRAINT `EventSong_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventSong` ADD CONSTRAINT `EventSong_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongBatchItem` ADD CONSTRAINT `SongBatchItem_eventSongId_fkey` FOREIGN KEY (`eventSongId`) REFERENCES `EventSong`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongAssignment` ADD CONSTRAINT `SongAssignment_eventSongId_fkey` FOREIGN KEY (`eventSongId`) REFERENCES `EventSong`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongMaterial` ADD CONSTRAINT `SongMaterial_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeProgress` ADD CONSTRAINT `PracticeProgress_eventSongId_fkey` FOREIGN KEY (`eventSongId`) REFERENCES `EventSong`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RehearsalSong` ADD CONSTRAINT `RehearsalSong_eventSongId_fkey` FOREIGN KEY (`eventSongId`) REFERENCES `EventSong`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (docs/13 §4.3 langkah 3, idempoten — aman dijalankan ulang):
-- 1) Setiap Song lama tetap jadi baris pustaka (id tak berubah); buat
--    EventSong pada event asalnya menyalin status/publish/lock,
--    liturgicalFunction, arrangementNotes → notes; sortOrder ambil
--    urutan batch saat ini; eventKey NULL = mengikuti Song.key.
INSERT INTO `EventSong` (`id`, `eventId`, `songId`, `sortOrder`, `eventKey`, `liturgicalFunction`, `notes`, `status`, `isPublished`, `isFinalLocked`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('es_', `Song`.`id`),
    `Song`.`eventId`,
    `Song`.`id`,
    COALESCE((SELECT MIN(`sbi`.`sortOrder`) FROM `SongBatchItem` `sbi` WHERE `sbi`.`songId` = `Song`.`id`), 0),
    NULL,
    `Song`.`liturgicalFunction`,
    `Song`.`arrangementNotes`,
    `Song`.`status`,
    `Song`.`isPublished`,
    `Song`.`isFinalLocked`,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Song`
WHERE `Song`.`eventId` IS NOT NULL
  AND NOT EXISTS (
        SELECT 1 FROM `EventSong` `es`
        WHERE `es`.`eventId` = `Song`.`eventId`
          AND `es`.`songId` = `Song`.`id`
    );

-- 2) Isi eventSongId pada tabel anak lewat join songId + Song.eventId.
UPDATE `SongAssignment` `sa`
JOIN `Song` `s` ON `s`.`id` = `sa`.`songId`
JOIN `EventSong` `es` ON `es`.`eventId` = `s`.`eventId` AND `es`.`songId` = `sa`.`songId`
SET `sa`.`eventSongId` = `es`.`id`
WHERE `sa`.`eventSongId` IS NULL;

UPDATE `PracticeProgress` `pp`
JOIN `Song` `s` ON `s`.`id` = `pp`.`songId`
JOIN `EventSong` `es` ON `es`.`eventId` = `s`.`eventId` AND `es`.`songId` = `pp`.`songId`
SET `pp`.`eventSongId` = `es`.`id`
WHERE `pp`.`eventSongId` IS NULL;

UPDATE `SongBatchItem` `bi`
JOIN `Song` `s` ON `s`.`id` = `bi`.`songId`
JOIN `EventSong` `es` ON `es`.`eventId` = `s`.`eventId` AND `es`.`songId` = `bi`.`songId`
SET `bi`.`eventSongId` = `es`.`id`
WHERE `bi`.`eventSongId` IS NULL;

UPDATE `RehearsalSong` `rs`
JOIN `Song` `s` ON `s`.`id` = `rs`.`songId`
JOIN `EventSong` `es` ON `es`.`eventId` = `s`.`eventId` AND `es`.`songId` = `rs`.`songId`
SET `rs`.`eventSongId` = `es`.`id`
WHERE `rs`.`eventSongId` IS NULL;

-- 3) SongMaterial: baris sekarang tetap materi pustaka (eventId NULL)
--    sesuai §4.3 — owner bisa menandai materi event-only belakangan.
