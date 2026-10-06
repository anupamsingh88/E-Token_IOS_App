<?php
/**
 * migrate_booking_dates.php
 * Adds cancelled_at, extended_at, and ensures collected_at exists in product_bookings.
 */

include 'db_connect.php';

echo "<h1>Starting Booking Dates Migration</h1>";

try {
    // 1. Add cancelled_at
    echo "<p>Checking for cancelled_at column...</p>";
    $res = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'cancelled_at'");
    if ($res->num_rows === 0) {
        $conn->query("ALTER TABLE product_bookings ADD COLUMN cancelled_at DATETIME AFTER approved_date");
        echo "<p style='color:green;'>Added cancelled_at column.</p>";
    } else {
        echo "<p>column exists.</p>";
    }

    // 2. Add extended_at
    echo "<p>Checking for extended_at column...</p>";
    $res = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'extended_at'");
    if ($res->num_rows === 0) {
        $conn->query("ALTER TABLE product_bookings ADD COLUMN extended_at DATETIME AFTER cancelled_at");
        echo "<p style='color:green;'>Added extended_at column.</p>";
    } else {
        echo "<p>column exists.</p>";
    }

    // 3. Add collected_at
    echo "<p>Checking for collected_at column...</p>";
    $res = $conn->query("SHOW COLUMNS FROM product_bookings LIKE 'collected_at'");
    if ($res->num_rows === 0) {
        $conn->query("ALTER TABLE product_bookings ADD COLUMN collected_at DATETIME AFTER extended_at");
        echo "<p style='color:green;'>Added collected_at column.</p>";
    } else {
        echo "<p>column exists.</p>";
    }

    echo "<h3>Migration completed successfully!</h3>";

} catch (Exception $e) {
    echo "<h3 style='color:red;'>Migration failed: " . $e->getMessage() . "</h3>";
}

$conn->close();
?>