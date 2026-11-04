-- docs/13 §4.1/§4.3 P1 (expand → migrate → contract; ADDITIVE ONLY):
-- jenis event + label region + kolom penutupan akses + EventMembership.
-- Tanpa DROP/RENAME; kolom baru nullable atau dengan default.

-- AlterTable
ALTER TABLE `Event` ADD COLUMN `accessClosedAt` DATETIME(3) NULL,
    ADD COLUMN `accessClosedById` VARCHAR(191) NULL,
    ADD COLUMN `eventType` ENUM('REGIONAL', 'INTERNAL_GEHC') NOT NULL DEFAULT 'REGIONAL',
    ADD COLUMN `region` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `EventMembership` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('EVENT_ADMIN', 'MEMBER', 'OBSERVER') NOT NULL DEFAULT 'MEMBER',
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EventMembership_userId_idx`(`userId`),
    UNIQUE INDEX `EventMembership_eventId_userId_key`(`eventId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Event_eventType_eventStatus_idx` ON `Event`(`eventType`, `eventStatus`);

-- AddForeignKey
ALTER TABLE `EventMembership` ADD CONSTRAINT `EventMembership_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventMembership` ADD CONSTRAINT `EventMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (docs/13 §4.3, idempoten — aman dijalankan ulang):
-- 1) Event lama otomatis REGIONAL (default) + region label Jabodetabek–Bandung.
UPDATE `Event` SET `region` = 'JABODETABEK_BANDUNG' WHERE `region` IS NULL AND `eventType` = 'REGIONAL';

-- 2) Semua akun aktif diberi membership pada event regional aktif yang
--    sama dengan getCurrentEvent() (terbaru, non-CANCELLED): ADMIN →
--    EVENT_ADMIN, USER → MEMBER, OBSERVER → OBSERVER. Jangan memberi
--    akses otomatis ke event regional lama yang bukan event aktif.
--    Membership mengaitkan User (identitas login), bukan Person.
INSERT INTO `EventMembership` (`id`, `eventId`, `userId`, `role`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('em_', `Event`.`id`, '_', `User`.`id`),
    `Event`.`id`,
    `User`.`id`,
    CASE `User`.`role` WHEN 'ADMIN' THEN 'EVENT_ADMIN' WHEN 'OBSERVER' THEN 'OBSERVER' ELSE 'MEMBER' END,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `Event`
INNER JOIN `User` ON `User`.`isActive` = true
WHERE `Event`.`eventType` = 'REGIONAL'
  AND `Event`.`id` = (
        SELECT `currentEvent`.`id`
        FROM `Event` `currentEvent`
        WHERE `currentEvent`.`eventType` = 'REGIONAL'
          AND `currentEvent`.`eventStatus` <> 'CANCELLED'
        ORDER BY `currentEvent`.`eventDate` DESC, `currentEvent`.`updatedAt` DESC
        LIMIT 1
    )
  AND NOT EXISTS (
        SELECT 1 FROM `EventMembership` `em`
        WHERE `em`.`eventId` = `Event`.`id`
          AND `em`.`userId` = `User`.`id`
    );
