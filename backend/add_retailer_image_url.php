<?php
require_once __DIR__ . '/db_connect.php';

echo "Checking fertilizer_products table for retailer_image_url...\n";

try {
    $res = $conn->query("SHOW COLUMNS FROM fertilizer_products LIKE 'retailer_image_url'");
    if ($res && $res->num_rows == 0) {
        if ($conn->query("ALTER TABLE fertilizer_products ADD COLUMN retailer_image_url VARCHAR(255) NULL DEFAULT NULL AFTER imageUrl")) {
            echo "SUCCESS: Added 'retailer_image_url' column to fertilizer_products.\n";
        } else {
            echo "ERROR: Could not add column: " . $conn->error . "\n";
        }
    } else {
        echo "INFO: 'retailer_image_url' already exists.\n";
    }
} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}

echo "Done.\n";
?>

