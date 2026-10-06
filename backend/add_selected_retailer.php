<?php
header('Content-Type: text/plain');
require 'db_connect.php';

try {
    $sql = "ALTER TABLE farmer_info ADD COLUMN selected_retailer_id INT NULL DEFAULT NULL";
    $pdo->exec($sql);
    echo "Successfully added selected_retailer_id column to farmer_info\n";
} catch (PDOException $e) {
    echo "Error or Column already exists: " . $e->getMessage() . "\n";
}
?>