<?php
require_once 'db_connect.php';

echo "Checking product_bookings columns...\n";

$res = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'cancellation_reason'");
if ($res && $res->num_rows == 0) {
    if ($conn->query("ALTER TABLE product_bookings ADD COLUMN cancellation_reason TEXT NULL DEFAULT NULL AFTER cancelled_at")) {
        echo "Successfully added 'cancellation_reason' to product_bookings.\n";
    } else {
        echo "Error adding cancellation_reason: " . $conn->error . "\n";
    }
} else {
    echo "'cancellation_reason' column already exists.\n";
}

$res = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'cancelled_by'");
if ($res && $res->num_rows == 0) {
    if ($conn->query("ALTER TABLE product_bookings ADD COLUMN cancelled_by VARCHAR(50) NULL DEFAULT NULL AFTER cancellation_reason")) {
        echo "Successfully added 'cancelled_by' to product_bookings.\n";
    } else {
        echo "Error adding cancelled_by: " . $conn->error . "\n";
    }
} else {
    echo "'cancelled_by' column already exists.\n";
}

echo "Done.\n";
?>
