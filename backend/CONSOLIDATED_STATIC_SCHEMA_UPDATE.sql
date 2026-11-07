-- ============================================================================
-- UPCDC Urvarak & Urvarak Setu - Consolidated Static Schema Migration
-- Purpose: Ensures all required columns and indexes exist statically in MySQL,
--          eliminating the need for any runtime DDL (ALTER TABLE / CREATE TABLE).
-- Safe to run multiple times (idempotent design where supported).
-- ============================================================================

-- 1. FARMER INFO TABLE: Ensure all modern columns exist
ALTER TABLE `farmer_info`
  ADD COLUMN IF NOT EXISTS `registry_id` VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `kisan_panjikaran_number` VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `kisan_panjikaran_photo` TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mpin` VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rejected_by` VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `approved_by` VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `approved_at` DATETIME NULL DEFAULT NULL;

-- 2. FARMER INFO INDEXES: Instant login and status checks
ALTER TABLE `farmer_info`
  ADD INDEX IF NOT EXISTS `idx_farmer_mobile` (`mobile`),
  ADD INDEX IF NOT EXISTS `idx_farmer_aadhaar` (`aadhaar`),
  ADD INDEX IF NOT EXISTS `idx_farmer_selected_retailer` (`selected_retailer_id`, `status`);

-- 3. PRODUCT BOOKINGS TABLE: Ensure cancellation, collection and extension columns exist
ALTER TABLE `product_bookings`
  ADD COLUMN IF NOT EXISTS `cancellation_reason` TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cancelled_by` VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cancelled_at` DATETIME NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `extended_at` DATETIME NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `extension_reason` TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `extended_by` VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `collected_at` DATETIME NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `original_quantity` INT NULL DEFAULT NULL;

-- 4. RETAILER INFO TABLE: Ensure public ID and capacity fields exist
ALTER TABLE `retailer_info`
  ADD COLUMN IF NOT EXISTS `retailer_id` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `login_ip` VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `district_id` VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `district_name` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `forced_setup` TINYINT(1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `total_bori_capacity` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `daily_visitor_capacity` INT DEFAULT 0;

ALTER TABLE `retailer_info`
  ADD UNIQUE INDEX IF NOT EXISTS `idx_retailer_public_id` (`retailer_id`),
  ADD INDEX IF NOT EXISTS `idx_retailer_mobile` (`mobile`);

-- 5. RETAILER STOCK TABLE: Ensure product stock columns and compound indexes exist
ALTER TABLE `retailer_stock`
  ADD COLUMN IF NOT EXISTS `UREA_stock` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `DAP_stock` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `NPK_stock` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `MOP_stock` INT DEFAULT 0;

ALTER TABLE `retailer_stock`
  ADD INDEX IF NOT EXISTS `idx_stock_retailer_date` (`retailer_id`, `date`);

-- 6. REGISTRATION OTPS TABLE: Persistent table structure
CREATE TABLE IF NOT EXISTS `registration_otps` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `mobile` VARCHAR(15) NOT NULL,
    `otp_code` VARCHAR(10) NOT NULL,
    `otp_expiry` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reg_otp_mobile` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. RETAILER STOCK REQUESTS TABLE: Persistent table structure
CREATE TABLE IF NOT EXISTS `retailer_stock_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `retailer_id` VARCHAR(100) NOT NULL,
    `product_type` VARCHAR(50) NOT NULL,
    `requested_quantity` INT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `ar_comment` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_req_retailer_created` (`retailer_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. APP CONTENT TABLE: Static app CMS table
CREATE TABLE IF NOT EXISTS `app_content` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `content_key` VARCHAR(100) NOT NULL UNIQUE,
    `content_value` TEXT NOT NULL,
    `content_type` VARCHAR(20) NOT NULL DEFAULT 'text',
    `category` VARCHAR(50) NOT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. APP LOGS TABLE: Persistent logging structure
CREATE TABLE IF NOT EXISTS `app_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `log_level` VARCHAR(10) NOT NULL DEFAULT 'INFO',
    `message` TEXT,
    `api_url` VARCHAR(500),
    `method` VARCHAR(10),
    `request_body` TEXT,
    `status_code` INT,
    `response` TEXT,
    `error_msg` TEXT,
    `farmer_id` VARCHAR(50),
    `retailer_id` VARCHAR(50),
    `device_info` VARCHAR(300),
    `app_version` VARCHAR(20),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_level` (`log_level`),
    INDEX `idx_farmer` (`farmer_id`),
    INDEX `idx_retailer` (`retailer_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

