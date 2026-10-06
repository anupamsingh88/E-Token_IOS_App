-- Retailer Information Table
CREATE TABLE IF NOT EXISTS retailer_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    shop_name VARCHAR(150),
    mobile VARCHAR(15) UNIQUE NOT NULL,
    retailer_id VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    login_ip VARCHAR(45),
    address TEXT,
    district_id INT,
    district_name VARCHAR(100),
    block_id INT,
    license_number VARCHAR(50),
    total_bori_capacity INT DEFAULT 0,
    daily_visitor_capacity INT DEFAULT 0,
    forced_setup TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Retailer Daily Stock Table
CREATE TABLE IF NOT EXISTS retailer_daily_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    retailer_id INT NOT NULL,
    date DATE NOT NULL,
    
    -- Urea
    api_urea_stock INT DEFAULT 0,
    manual_urea_stock INT DEFAULT NULL,
    
    -- DAP
    api_dap_stock INT DEFAULT 0,
    manual_dap_stock INT DEFAULT NULL,
    
    -- NPK
    api_npk_stock INT DEFAULT 0,
    manual_npk_stock INT DEFAULT NULL,
    
    -- MOP
    api_mop_stock INT DEFAULT 0,
    manual_mop_stock INT DEFAULT NULL,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_retailer_date (retailer_id, date)
);

-- Product Bookings Table (Slots)
CREATE TABLE IF NOT EXISTS product_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    retailer_id INT NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    order_id VARCHAR(50),
    booking_date DATE NOT NULL,
    product ENUM('Urea', 'DAP', 'NPK', 'MOP') NOT NULL,
    quantity INT NOT NULL,
    original_quantity INT,
    price_per_bag DECIMAL(10, 2),
    status ENUM('Pending','Collected', 'Cancelled', 'Approved', 'Extended') DEFAULT 'Pending',
    token_number VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date DATETIME,
    cancelled_at DATETIME,
    extended_at DATETIME,
    collected_at DATETIME
);


-- Help Center Information Table
CREATE TABLE IF NOT EXISTS retailer_helpcenter_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    help_key VARCHAR(50) UNIQUE NOT NULL,
    label_hi VARCHAR(100) NOT NULL,
    label_en VARCHAR(100),
    value VARCHAR(255) NOT NULL,
    icon_name VARCHAR(50),
    help_type ENUM('phone', 'whatsapp', 'link', 'text') DEFAULT 'text',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmer Information Table
CREATE TABLE IF NOT EXISTS farmer_info (
    farmer_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    aadhaar VARCHAR(12) UNIQUE NOT NULL,
    village_id INT,
    status TINYINT DEFAULT 0, -- 0: Pending, 1: Approved, 2: Rejected
    selected_retailer_id VARCHAR(50),
    khatauni_number VARCHAR(50),
    khasra_rukba DECIMAL(10, 2),
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retailer Change Requests Table
CREATE TABLE IF NOT EXISTS retailer_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id VARCHAR(50) NOT NULL,
    current_retailer_id VARCHAR(50),
    requested_retailer_id VARCHAR(50) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Help Center Data
INSERT IGNORE INTO retailer_helpcenter_info (help_key, label_hi, label_en, value, icon_name, help_type) VALUES
('primary_support', 'सहायता हेल्पलाइन', 'Support Helpline', '+91 9876543210', 'call', 'phone'),
('whatsapp_support', 'व्हाट्सएप सहायता', 'WhatsApp Support', '+91 9876543210', 'logo-whatsapp', 'whatsapp'),
('office_address', 'मुख्य कार्यालय', 'Head Office', 'Bahadurganj, Hapur, Uttar Pradesh', 'location', 'text');

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') DEFAULT 'INFO',
    source ENUM('backend', 'frontend') DEFAULT 'backend',
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
