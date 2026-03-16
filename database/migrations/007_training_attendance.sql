-- Training attendance support on event_registrations.
-- Run in MySQL: USE smc_career_connect; then run below.
--
-- Only TRAINING events linked to a drive (type = 'TRAINING' AND driveId IS NOT NULL)
-- will use these columns; other events can leave them NULL.

ALTER TABLE event_registrations
  ADD COLUMN attendanceStatus ENUM('PRESENT', 'ABSENT') DEFAULT NULL,
  ADD COLUMN attendanceMarkedAt TIMESTAMP NULL DEFAULT NULL,
  ADD INDEX idx_event_attendance (eventId, attendanceStatus);

