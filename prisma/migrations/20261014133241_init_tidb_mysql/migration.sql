-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_role_isActive_idx`(`role`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `eventDate` DATETIME(3) NULL,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Jakarta',
    `venue` VARCHAR(191) NULL,
    `theme` VARCHAR(191) NULL,
    `targetDurationMinutes` INTEGER NULL,
    `eventStatus` ENUM('DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `liturgicalFlowUrl` VARCHAR(191) NULL,
    `committeePicName` VARCHAR(191) NULL,
    `committeePicContact` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Event_eventStatus_eventDate_idx`(`eventStatus`, `eventDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `congregation` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Person_userId_key`(`userId`),
    INDEX `Person_isActive_isConfirmed_idx`(`isActive`, `isConfirmed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstrumentSkill` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InstrumentSkill_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonSkill` (
    `personId` VARCHAR(191) NOT NULL,
    `instrumentSkillId` VARCHAR(191) NOT NULL,
    `proficiencyNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`personId`, `instrumentSkillId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Song` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `artistOrAuthor` VARCHAR(191) NULL,
    `liturgicalFunction` VARCHAR(191) NULL,
    `key` VARCHAR(191) NULL,
    `bpm` INTEGER NULL,
    `timeSignature` VARCHAR(191) NULL,
    `estimatedDurationSeconds` INTEGER NULL,
    `originalReferenceUrl` VARCHAR(191) NULL,
    `arrangementNotes` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SOURCE_SHARED', 'ARRANGEMENT_IN_PROGRESS', 'REFERENCE_READY', 'PRACTICING', 'NEEDS_REVIEW', 'READY_FOR_REHEARSAL', 'REHEARSAL_READY', 'FINAL_LOCKED') NOT NULL DEFAULT 'DRAFT',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `isFinalLocked` BOOLEAN NOT NULL DEFAULT false,
    `activeArrangementVersionId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Song_eventId_status_idx`(`eventId`, `status`),
    INDEX `Song_eventId_isPublished_idx`(`eventId`, `isPublished`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SongBatch` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `releaseAt` DATETIME(3) NULL,
    `targetReviewAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'REVIEWING', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SongBatch_eventId_status_idx`(`eventId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SongBatchItem` (
    `songBatchId` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`songBatchId`, `songId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SongAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `instrumentSkillId` VARCHAR(191) NULL,
    `assignmentNote` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SongAssignment_personId_idx`(`personId`),
    UNIQUE INDEX `SongAssignment_songId_personId_key`(`songId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArrangementVersion` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `versionLabel` VARCHAR(191) NOT NULL,
    `changeSummary` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NULL,
    `bpm` INTEGER NULL,
    `grooveNotes` VARCHAR(191) NULL,
    `structureNotes` VARCHAR(191) NULL,
    `referenceUrl` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `isFinal` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ArrangementVersion_songId_isActive_idx`(`songId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SongMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `arrangementVersionId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` ENUM('ORIGINAL', 'ARRANGEMENT_REFERENCE', 'PART_GUIDE', 'CHORD_CHART', 'LYRICS', 'CLICK_CUE', 'SEQUENCER', 'REHEARSAL_RECORDING', 'FINAL_ASSET', 'OTHER') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `versionLabel` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SongMaterial_songId_category_isActive_idx`(`songId`, `category`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PracticeProgress` (
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'LEARNING', 'TRIED_WITH_REFERENCE', 'NEEDS_HELP', 'READY_FOR_REHEARSAL') NOT NULL DEFAULT 'NOT_STARTED',
    `note` VARCHAR(191) NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PracticeProgress_personId_status_idx`(`personId`, `status`),
    UNIQUE INDEX `PracticeProgress_songId_personId_key`(`songId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'TODO',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `dueAt` DATETIME(3) NULL,
    `assigneePersonId` VARCHAR(191) NULL,
    `relatedSongId` VARCHAR(191) NULL,
    `relatedRehearsalId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Task_eventId_status_idx`(`eventId`, `status`),
    INDEX `Task_assigneePersonId_status_idx`(`assigneePersonId`, `status`),
    INDEX `Task_eventId_dueAt_idx`(`eventId`, `dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rehearsal` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('ONLINE_MONITORING', 'ONSITE_SECTIONAL', 'FULL_REHEARSAL', 'TECHNICAL_REHEARSAL', 'EVENT_DAY_SOUNDCHECK', 'OTHER') NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `venueOrMeetingUrl` VARCHAR(191) NULL,
    `agenda` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED',
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Rehearsal_eventId_startsAt_idx`(`eventId`, `startsAt`),
    INDEX `Rehearsal_eventId_status_idx`(`eventId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RehearsalSong` (
    `rehearsalId` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`rehearsalId`, `songId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RehearsalAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `rehearsalId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `status` ENUM('EXPECTED', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL DEFAULT 'EXPECTED',
    `note` VARCHAR(191) NULL,

    INDEX `RehearsalAttendance_personId_idx`(`personId`),
    UNIQUE INDEX `RehearsalAttendance_rehearsalId_personId_key`(`rehearsalId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentItem` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('NOT_CHECKED', 'NEEDED', 'CONFIRMED', 'TESTED', 'BLOCKED', 'NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_CHECKED',
    `ownerOrSource` VARCHAR(191) NULL,
    `assigneePersonId` VARCHAR(191) NULL,
    `dueAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentItem_eventId_status_idx`(`eventId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DecisionLog` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `decisionType` ENUM('MUSICAL', 'EVENT', 'TECHNICAL', 'PERSONNEL', 'OTHER') NOT NULL,
    `decisionText` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `decidedBy` VARCHAR(191) NULL,
    `relatedSongId` VARCHAR(191) NULL,
    `relatedRehearsalId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DecisionLog_eventId_createdAt_idx`(`eventId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Person` ADD CONSTRAINT `Person_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonSkill` ADD CONSTRAINT `PersonSkill_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonSkill` ADD CONSTRAINT `PersonSkill_instrumentSkillId_fkey` FOREIGN KEY (`instrumentSkillId`) REFERENCES `InstrumentSkill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_activeArrangementVersionId_fkey` FOREIGN KEY (`activeArrangementVersionId`) REFERENCES `ArrangementVersion`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `SongBatch` ADD CONSTRAINT `SongBatch_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongBatchItem` ADD CONSTRAINT `SongBatchItem_songBatchId_fkey` FOREIGN KEY (`songBatchId`) REFERENCES `SongBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongBatchItem` ADD CONSTRAINT `SongBatchItem_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongAssignment` ADD CONSTRAINT `SongAssignment_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongAssignment` ADD CONSTRAINT `SongAssignment_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongAssignment` ADD CONSTRAINT `SongAssignment_instrumentSkillId_fkey` FOREIGN KEY (`instrumentSkillId`) REFERENCES `InstrumentSkill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArrangementVersion` ADD CONSTRAINT `ArrangementVersion_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongMaterial` ADD CONSTRAINT `SongMaterial_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongMaterial` ADD CONSTRAINT `SongMaterial_arrangementVersionId_fkey` FOREIGN KEY (`arrangementVersionId`) REFERENCES `ArrangementVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeProgress` ADD CONSTRAINT `PracticeProgress_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticeProgress` ADD CONSTRAINT `PracticeProgress_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assigneePersonId_fkey` FOREIGN KEY (`assigneePersonId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_relatedSongId_fkey` FOREIGN KEY (`relatedSongId`) REFERENCES `Song`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_relatedRehearsalId_fkey` FOREIGN KEY (`relatedRehearsalId`) REFERENCES `Rehearsal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rehearsal` ADD CONSTRAINT `Rehearsal_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RehearsalSong` ADD CONSTRAINT `RehearsalSong_rehearsalId_fkey` FOREIGN KEY (`rehearsalId`) REFERENCES `Rehearsal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RehearsalSong` ADD CONSTRAINT `RehearsalSong_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RehearsalAttendance` ADD CONSTRAINT `RehearsalAttendance_rehearsalId_fkey` FOREIGN KEY (`rehearsalId`) REFERENCES `Rehearsal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RehearsalAttendance` ADD CONSTRAINT `RehearsalAttendance_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentItem` ADD CONSTRAINT `EquipmentItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentItem` ADD CONSTRAINT `EquipmentItem_assigneePersonId_fkey` FOREIGN KEY (`assigneePersonId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DecisionLog` ADD CONSTRAINT `DecisionLog_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DecisionLog` ADD CONSTRAINT `DecisionLog_relatedSongId_fkey` FOREIGN KEY (`relatedSongId`) REFERENCES `Song`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DecisionLog` ADD CONSTRAINT `DecisionLog_relatedRehearsalId_fkey` FOREIGN KEY (`relatedRehearsalId`) REFERENCES `Rehearsal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
