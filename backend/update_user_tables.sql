-- Update existing farmer_info table to add approval and activation fields
-- Run this after the initial schema.sql

ALTER TABLE farmer_info 
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER status,
ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 0 AFTER approval_status,
ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER is_active,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD INDEX idx_approval_status (approval_status),
ADD INDEX idx_is_active (is_active);

-- Update existing records to have proper approval status
UPDATE farmer_info 
SET approval_status = CASE 
    WHEN status = 1 THEN 'approved'
    ELSE 'pending'
END,
is_active = status
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Create retailers table if it doesn't exist
CREATE TABLE IF NOT EXISTS retailers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    retailer_id VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    shop_name VARCHAR(200),
    address TEXT,
    district VARCHAR(100),
    tehsil VARCHAR(100),
    block VARCHAR(100),
    license_number VARCHAR(100),
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    is_active TINYINT(1) DEFAULT 0,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_approval_status (approval_status),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
