<?php
include 'db_connect.php';

$queries = [
    "ALTER TABLE retailer_info ADD COLUMN forced_setup TINYINT(1) DEFAULT 1",
    "ALTER TABLE retailer_info ADD COLUMN urea_stock INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN dap_stock INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN npk_stock INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN mop_stock INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN urea_capacity INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN dap_capacity INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN npk_capacity INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN mop_capacity INT DEFAULT 0",
    "ALTER TABLE retailer_info ADD COLUMN daily_visitor_capacity INT DEFAULT 0"
];

foreach ($queries as $sql) {
    try {
        if ($conn->query($sql)) {
            echo "Success: $sql\n";
        }
    } catch (Exception $e) {
        echo "Skipped/Error: " . $e->getMessage() . "\n";
    }
}
?>