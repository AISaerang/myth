-- Keep note author POV (partLabel) separate from the musical audience.
ALTER TABLE `SongNote`
    ADD COLUMN `targetInstrumentSkillId` VARCHAR(191) NULL;

CREATE INDEX `SongNote_eventSongId_targetInstrumentSkillId_idx`
    ON `SongNote`(`eventSongId`, `targetInstrumentSkillId`);

ALTER TABLE `SongNote`
    ADD CONSTRAINT `SongNote_targetInstrumentSkillId_fkey`
    FOREIGN KEY (`targetInstrumentSkillId`) REFERENCES `InstrumentSkill`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
