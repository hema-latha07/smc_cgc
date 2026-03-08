-- Soft delete support: keep rows, mark as deleted for recycle bin and restore.
-- Run in MySQL: USE smc_career_connect; then run below.

-- Students
ALTER TABLE students ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE students ADD COLUMN deletedBy INT UNSIGNED NULL;
ALTER TABLE students ADD INDEX idx_students_deleted (deletedAt);

-- Companies
ALTER TABLE companies ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE companies ADD COLUMN deletedBy INT UNSIGNED NULL;
ALTER TABLE companies ADD INDEX idx_companies_deleted (deletedAt);

-- Drives
ALTER TABLE drives ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE drives ADD COLUMN deletedBy INT UNSIGNED NULL;
ALTER TABLE drives ADD INDEX idx_drives_deleted (deletedAt);

-- Events
ALTER TABLE events ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE events ADD COLUMN deletedBy INT UNSIGNED NULL;
ALTER TABLE events ADD INDEX idx_events_deleted (deletedAt);
