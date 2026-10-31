<?php
require_once 'db_connect.php';

$res = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'extension_reason'");
if ($res && $res->num_rows == 0) {
    $sql = "ALTER TABLE product_bookings ADD COLUMN extension_reason TEXT NULL DEFAULT NULL AFTER extended_at";
    if ($conn->query($sql)) {
        echo "Successfully added 'extension_reason' column.\n";
    } else {
        echo "Error adding 'extension_reason': " . $conn->error . "\n";
    }
} else {
    echo "'extension_reason' already exists.\n";
}

$res2 = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'extended_by'");
if ($res2 && $res2->num_rows == 0) {
    $sql2 = "ALTER TABLE product_bookings ADD COLUMN extended_by VARCHAR(50) NULL DEFAULT NULL AFTER extension_reason";
    if ($conn->query($sql2)) {
        echo "Successfully added 'extended_by' column.\n";
    } else {
        echo "Error adding 'extended_by': " . $conn->error . "\n";
    }
} else {
    echo "'extended_by' already exists.\n";
}

$conn->close();
?>
