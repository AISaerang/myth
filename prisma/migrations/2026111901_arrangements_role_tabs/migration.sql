-- Add nullable expand columns and relations first.
ALTER TABLE `ChartArrangement`
  ADD COLUMN `defaultKey` VARCHAR(16) NULL;

ALTER TABLE `EventSong`
  ADD COLUMN `chartArrangementId` VARCHAR(191) NULL;

ALTER TABLE `SongInstrumentChart`
  ADD COLUMN `arrangementId` VARCHAR(191) NULL;

CREATE TABLE `ArrangementRoleTab` (
  `id` VARCHAR(191) NOT NULL,
  `arrangementId` VARCHAR(191) NOT NULL,
  `role` VARCHAR(32) NOT NULL,
  `data` JSON NOT NULL,
  `updatedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ArrangementRoleTab_arrangementId_role_key` (`arrangementId`, `role`),
  INDEX `ArrangementRoleTab_arrangementId_idx` (`arrangementId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Default only for songs that have no named arrangement.
INSERT INTO `ChartArrangement`
  (`id`, `songId`, `name`, `isActive`, `createdById`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('arr-default-', `s`.`id`),
  `s`.`id`,
  'Default',
  1,
  `s`.`createdById`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Song` `s`
WHERE NOT EXISTS (
  SELECT 1 FROM `ChartArrangement` `ca` WHERE `ca`.`songId` = `s`.`id`
);

-- Existing active arrangement is the default. Otherwise choose the oldest.
UPDATE `ChartArrangement` `ca`
JOIN (
  SELECT `x`.`songId`,
         COALESCE(
           (SELECT `active`.`id`
              FROM `ChartArrangement` `active`
             WHERE `active`.`songId` = `x`.`songId`
               AND `active`.`isActive` = 1
             ORDER BY `active`.`createdAt` ASC
             LIMIT 1),
           (SELECT `oldest`.`id`
              FROM `ChartArrangement` `oldest`
             WHERE `oldest`.`songId` = `x`.`songId`
             ORDER BY `oldest`.`createdAt` ASC
             LIMIT 1)
         ) AS `defaultId`
  FROM `ChartArrangement` `x`
  GROUP BY `x`.`songId`
) `chosen`
  ON `chosen`.`songId` = `ca`.`songId`
SET `ca`.`isActive` =
  CASE WHEN `ca`.`id` = `chosen`.`defaultId` THEN 1 ELSE 0 END;

-- Point each event setlist row at the song default arrangement.
UPDATE `EventSong` `es`
JOIN `ChartArrangement` `ca`
  ON `ca`.`songId` = `es`.`songId`
 AND `ca`.`isActive` = 1
SET `es`.`chartArrangementId` = `ca`.`id`
WHERE `es`.`chartArrangementId` IS NULL;

-- Move each existing instrument chart onto the song default arrangement.
UPDATE `SongInstrumentChart` `sic`
JOIN `ChartArrangement` `ca`
  ON `ca`.`songId` = `sic`.`songId`
 AND `ca`.`isActive` = 1
SET `sic`.`arrangementId` = `ca`.`id`
WHERE `sic`.`arrangementId` IS NULL;

-- Add relation indexes and foreign keys after backfill.
ALTER TABLE `EventSong`
  ADD INDEX `EventSong_chartArrangementId_idx` (`chartArrangementId`);

ALTER TABLE `EventSong`
  ADD CONSTRAINT `EventSong_chartArrangementId_fkey`
  FOREIGN KEY (`chartArrangementId`) REFERENCES `ChartArrangement`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SongInstrumentChart`
  ADD UNIQUE INDEX `SongInstrumentChart_arrangementId_key` (`arrangementId`);

ALTER TABLE `SongInstrumentChart`
  ADD CONSTRAINT `SongInstrumentChart_arrangementId_fkey`
  FOREIGN KEY (`arrangementId`) REFERENCES `ChartArrangement`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ArrangementRoleTab`
  ADD CONSTRAINT `ArrangementRoleTab_arrangementId_fkey`
  FOREIGN KEY (`arrangementId`) REFERENCES `ChartArrangement`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Contract the backfilled nullable columns only after every existing row is linked.
ALTER TABLE `EventSong`
  MODIFY COLUMN `chartArrangementId` VARCHAR(191) NOT NULL;

ALTER TABLE `SongInstrumentChart`
  ADD INDEX `SongInstrumentChart_songId_idx` (`songId`);

ALTER TABLE `SongInstrumentChart`
  MODIFY COLUMN `arrangementId` VARCHAR(191) NOT NULL,
  DROP INDEX `SongInstrumentChart_songId_key`;
