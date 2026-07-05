-- Add country code to users table
ALTER TABLE users ADD COLUMN country_code VARCHAR(5) DEFAULT '+243' AFTER phone;

-- Update phone to not require unique (country + phone will be unique)
ALTER TABLE users DROP INDEX phone;
ALTER TABLE users ADD UNIQUE INDEX idx_country_phone (country_code, phone);

-- Create passcodes table for OTP verification
CREATE TABLE IF NOT EXISTS passcodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    phone VARCHAR(20) NOT NULL,
    country_code VARCHAR(5) NOT NULL,
    passcode VARCHAR(6) NOT NULL,
    type ENUM('register', 'login') NOT NULL DEFAULT 'login',
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_code (country_code, phone, passcode),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
