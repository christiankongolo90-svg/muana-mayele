-- Migration: Add quiz_settings table, passcodes table, role and country_code columns
-- Run this on the production database

-- Add country_code column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT '+243' AFTER phone;

-- Add role column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user' AFTER neighborhood;

-- Create passcodes table if missing
CREATE TABLE IF NOT EXISTS passcodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    country_code VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    passcode VARCHAR(10) NOT NULL,
    type ENUM('login', 'register') DEFAULT 'login',
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_phone_code (country_code, phone),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Create quiz_settings table
CREATE TABLE IF NOT EXISTS quiz_settings (
    id INT PRIMARY KEY DEFAULT 1,
    time_limit INT NOT NULL DEFAULT 1200 COMMENT 'Quiz time limit in seconds',
    is_open BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Whether the quiz is open for players',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert default settings (ignore if already exists)
INSERT IGNORE INTO quiz_settings (id, time_limit, is_open) VALUES (1, 1200, TRUE);

-- Make your user an admin
UPDATE users SET role = 'admin' WHERE phone = '96716561' AND country_code = '+47';
