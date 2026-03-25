-- Multi-round placement support
-- Run in MySQL: USE smc_career_connect; then run below.

-- Add currentRoundNumber to applications (only if it does not exist)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'currentRoundNumber');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE applications ADD COLUMN currentRoundNumber INT UNSIGNED DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Per-drive rounds (1, 2, 3, ...)
CREATE TABLE IF NOT EXISTS drive_rounds (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  driveId INT UNSIGNED NOT NULL,
  roundNumber INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  isFinal TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driveId) REFERENCES drives(id) ON DELETE CASCADE,
  UNIQUE KEY uk_drive_round (driveId, roundNumber)
) ENGINE=InnoDB;

-- Per-application round status
CREATE TABLE IF NOT EXISTS application_rounds (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  applicationId INT UNSIGNED NOT NULL,
  roundId INT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'QUALIFIED', 'NOT_QUALIFIED') NOT NULL DEFAULT 'PENDING',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (roundId) REFERENCES drive_rounds(id) ON DELETE CASCADE,
  UNIQUE KEY uk_app_round (applicationId, roundId)
) ENGINE=InnoDB;

