-- Perluas tipe bagian lagu (standar komprehensif section lagu).
-- TiDB/MySQL: ENUM harus ditulis ulang penuh saat menambah nilai.
ALTER TABLE `ChartSection` MODIFY COLUMN `type` ENUM('INTRO', 'VERSE', 'PRE_CHORUS', 'CHORUS', 'POST_CHORUS', 'PRE_BRIDGE', 'BRIDGE', 'INTERLUDE', 'INSTRUMENTAL', 'SOLO', 'HOOK', 'BREAKDOWN', 'VAMP', 'TAG', 'TURNAROUND', 'KEY_CHANGE', 'ADLIB', 'SPOKEN', 'TRANSITION', 'REPRISE', 'ENDING', 'CODA', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- Data fix: section "Modulation/Modulasi/Key Change" yang sebelumnya jatuh ke OTHER
-- (cth. lagu Joyful Gathering) dipetakan ke KEY_CHANGE.
UPDATE `ChartSection` SET `type` = 'KEY_CHANGE' WHERE `type` = 'OTHER' AND `label` REGEXP '^(modulasi|modulation|key[ -]?change|transpos)';
