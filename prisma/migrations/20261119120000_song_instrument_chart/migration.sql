CREATE TABLE `SongInstrumentChart` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `capo` INTEGER NOT NULL DEFAULT 0,
    `data` JSON NOT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SongInstrumentChart_songId_key`(`songId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SongInstrumentChart_songId_fkey`
      FOREIGN KEY (`songId`) REFERENCES `Song`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
