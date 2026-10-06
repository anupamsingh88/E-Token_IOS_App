<?php
header('Content-Type: text/html; charset=utf-8');
require_once 'db_connect.php';
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h2>Seeding Farmer Bookings...</h2>";

$farmer_id = 'FARMER_698d0a38b391f';
$retailer_id = 1;

// Clear existing for this farmer
$conn->query("DELETE FROM product_bookings WHERE farmer_id = '$farmer_id'");

// Insert bookings
$queries = [
    // Active Booking (Tomorrow)
    "INSERT INTO product_bookings (retailer_id, farmer_id, booking_date, product, quantity, status, token_number) 
     VALUES ($retailer_id, '$farmer_id', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Urea', 10, 'Booked', 'TKN1001')",
     
    // Collected Booking (Yesterday)
    "INSERT INTO product_bookings (retailer_id, farmer_id, booking_date, product, quantity, status, token_number) 
     VALUES ($retailer_id, '$farmer_id', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'DAP', 5, 'Collected', 'TKN0999')"
];

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "<p style='color:green'>✅ Booking Inserted</p>";
    } else {
        echo "<p style='color:red'>❌ Error: " . $conn->error . "</p>";
    }
}

echo "<h3>Bookings Seeded!</h3>";
echo "<p><a href='get_farmer_bookings.php?farmer_id=$farmer_id'>Check Bookings API</a></p>";
?>
