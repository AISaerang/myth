-- AlterEnum: add OBSERVER read-only monitor role (docs/06, docs/11).
-- Observer sees published progress + suggests via tasks; no mutations.
ALTER TABLE `User` MODIFY COLUMN `role` ENUM('ADMIN', 'USER', 'OBSERVER') NOT NULL DEFAULT 'USER';
