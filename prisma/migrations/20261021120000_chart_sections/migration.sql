-- CreateTable
CREATE TABLE `ChartSection` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `type` ENUM('INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 'BRIDGE', 'INTERLUDE', 'INSTRUMENTAL', 'TAG', 'ENDING', 'CODA', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `label` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChartSection_songId_label_key`(`songId`, `label`),
    INDEX `ChartSection_songId_sortOrder_idx`(`songId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChartArrangement` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChartArrangement_songId_name_key`(`songId`, `name`),
    INDEX `ChartArrangement_songId_isActive_idx`(`songId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChartArrangementItem` (
    `id` VARCHAR(191) NOT NULL,
    `arrangementId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `labelOverride` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ChartArrangementItem_arrangementId_sortOrder_key`(`arrangementId`, `sortOrder`),
    INDEX `ChartArrangementItem_arrangementId_sortOrder_idx`(`arrangementId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ChartSection` ADD CONSTRAINT `ChartSection_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChartArrangement` ADD CONSTRAINT `ChartArrangement_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChartArrangementItem` ADD CONSTRAINT `ChartArrangementItem_arrangementId_fkey` FOREIGN KEY (`arrangementId`) REFERENCES `ChartArrangement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChartArrangementItem` ADD CONSTRAINT `ChartArrangementItem_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `ChartSection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
