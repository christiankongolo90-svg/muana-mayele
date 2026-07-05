-- Migration: Add schedule columns to quiz_settings
-- Run this on existing databases to add game scheduling support

ALTER TABLE quiz_settings
  ADD COLUMN schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether schedule-based access is active' AFTER is_open,
  ADD COLUMN schedule_days JSON DEFAULT NULL COMMENT 'Array of day numbers (0=Sunday..6=Saturday)' AFTER schedule_enabled,
  ADD COLUMN schedule_start_time TIME DEFAULT NULL COMMENT 'Daily start time for quiz access' AFTER schedule_days,
  ADD COLUMN schedule_end_time TIME DEFAULT NULL COMMENT 'Daily end time for quiz access' AFTER schedule_start_time,
  ADD COLUMN schedule_timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Kinshasa' COMMENT 'Timezone for schedule' AFTER schedule_end_time;
