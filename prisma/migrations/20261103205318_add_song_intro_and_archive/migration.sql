-- AlterTable
ALTER TABLE `Song` ADD COLUMN `archivedAt` DATETIME(3) NULL,
    ADD COLUMN `archivedById` VARCHAR(191) NULL,
    ADD COLUMN `introChords` VARCHAR(191) NULL,
    ADD COLUMN `introNotation` TEXT NULL,
    ADD COLUMN `introNote` TEXT NULL;
