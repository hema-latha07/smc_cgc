-- Add password_hash to students (for student-chosen password after first login).
-- Run in MySQL: USE smc_career_connect; then run below.
--
-- If you get "Duplicate column" error, the column already exists.

ALTER TABLE students ADD COLUMN password_hash VARCHAR(255) NULL DEFAULT NULL;

