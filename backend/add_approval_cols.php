<?php
include 'db_connect.php';

$queries = [
    "ALTER TABLE farmer_info ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50) DEFAULT NULL",
    "ALTER TABLE farmer_info ADD COLUMN IF NOT EXISTS approved_at DATETIME DEFAULT NULL"
];

foreach ($queries as $sql) {
    if ($conn->query($sql)) {
        echo "Success: $sql\n";
    } else {
        echo "Error: " . $conn->error . "\n";
    }
}
?>
