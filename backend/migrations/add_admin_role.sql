-- Add admin role to users table
-- Run this migration to enable admin functionality

-- Add role column
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER neighborhood;

-- Add index for role-based queries
ALTER TABLE users ADD INDEX idx_role (role);

-- To assign admin role to a user, run:
-- UPDATE users SET role = 'admin' WHERE id = <user_id>;
-- Or by phone: UPDATE users SET role = 'admin' WHERE phone = '<phone_number>';
