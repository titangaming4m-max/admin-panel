-- ZYRO HUB™ - COMPLETE DATABASE SCHEMA FOR MYSQL
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS `zyro_hub_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `zyro_hub_db`;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `remember_token` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Services Table
CREATE TABLE IF NOT EXISTS `services` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `icon_type` TEXT NOT NULL, -- Storing pre-defined slug or base64/URL image
  `verified` TINYINT(1) DEFAULT 0,
  `status` ENUM('Enabled', 'Disabled') DEFAULT 'Enabled',
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_service_status` (`status`),
  INDEX `idx_service_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Plans Table
CREATE TABLE IF NOT EXISTS `plans` (
  `id` VARCHAR(50) PRIMARY KEY,
  `service_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL, -- e.g. "7 DAYS", "14 DAYS"
  `duration` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `old_price` DECIMAL(10,2) NOT NULL,
  `qty` INT NOT NULL DEFAULT 1,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  INDEX `idx_plan_service` (`service_id`),
  INDEX `idx_plan_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Banners Table
CREATE TABLE IF NOT EXISTS `banners` (
  `id` VARCHAR(50) PRIMARY KEY,
  `image` LONGTEXT NOT NULL, -- Base64 encoded image or public URL
  `type` ENUM('homepage', 'offer', 'popup') NOT NULL,
  `status` ENUM('Enabled', 'Disabled') DEFAULT 'Enabled',
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_banner_type` (`type`),
  INDEX `idx_banner_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customer_name` VARCHAR(100) NOT NULL,
  `whatsapp` VARCHAR(30) NOT NULL,
  `service_id` INT NOT NULL,
  `plan_id` VARCHAR(50) NOT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `plan_name` VARCHAR(150) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `transaction_id` VARCHAR(100) NOT NULL UNIQUE,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending', 'Processing', 'Completed', 'Cancelled') DEFAULT 'Pending',
  `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE RESTRICT,
  INDEX `idx_order_status` (`status`),
  INDEX `idx_order_customer` (`customer_name`),
  INDEX `idx_order_whatsapp` (`whatsapp`),
  INDEX `idx_order_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value_data` LONGTEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL,
  `upi_id` VARCHAR(100) NOT NULL,
  `payee_name` VARCHAR(100) NOT NULL,
  `status` ENUM('Success', 'Failed', 'Pending') DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Users Table (Simulating logged-in users / sessions counter)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NOT NULL,
  `last_active` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_active` (`last_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Activity Logs Table
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  INDEX `idx_log_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Sessions Table
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) PRIMARY KEY,
  `admin_id` INT NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `login_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  INDEX `idx_session_last` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_unread` (`is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default Admin
-- Default password is "admin123" encrypted with bcrypt-compatible placeholder (hash of password)
INSERT INTO `admins` (`id`, `username`, `password`, `email`) 
VALUES (1, 'admin', '$2y$10$TKh8H1.PfQx37YgCzwiKb.ZgQD6.Mh5z3C6D1lqM3tC8vN1yO1LNu', 'admin@zyrohub.com')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 12. Wallets Table
CREATE TABLE IF NOT EXISTS `wallets` (
  `whatsapp` VARCHAR(30) PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_added` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_spent` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `last_recharge` TIMESTAMP NULL,
  `status` ENUM('Active', 'Frozen') DEFAULT 'Active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wallet_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `whatsapp` VARCHAR(30) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `type` ENUM('Credit', 'Debit') NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `status` ENUM('Success', 'Failed', 'Pending') DEFAULT 'Pending',
  `balance_after` DECIMAL(10,2) NOT NULL,
  `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`whatsapp`) REFERENCES `wallets` (`whatsapp`) ON DELETE CASCADE,
  INDEX `idx_wallet_txn_whatsapp` (`whatsapp`),
  INDEX `idx_wallet_txn_status` (`status`),
  INDEX `idx_wallet_txn_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Wallet Settings Table
CREATE TABLE IF NOT EXISTS `wallet_settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value_data` LONGTEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Wallet Logs Table
CREATE TABLE IF NOT EXISTS `wallet_logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `whatsapp` VARCHAR(30) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wallet_log_whatsapp` (`whatsapp`),
  INDEX `idx_wallet_log_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Wallet Recharge Requests Table
CREATE TABLE IF NOT EXISTS `wallet_recharge_requests` (
  `id` VARCHAR(50) PRIMARY KEY,
  `user_id` VARCHAR(30) NOT NULL,
  `recharge_amount` DECIMAL(10,2) NOT NULL,
  `utr_number` VARCHAR(50) NOT NULL UNIQUE,
  `contact_mobile` VARCHAR(20) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `remarks` TEXT NULL,
  `admin_remarks` TEXT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `approved_at` TIMESTAMP NULL,
  `approved_by` VARCHAR(50) NULL,
  FOREIGN KEY (`user_id`) REFERENCES `wallets` (`whatsapp`) ON DELETE CASCADE,
  INDEX `idx_recharge_user` (`user_id`),
  INDEX `idx_recharge_utr` (`utr_number`),
  INDEX `idx_recharge_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


