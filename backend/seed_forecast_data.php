<?php
header('Content-Type: text/html; charset=utf-8');
require_once 'db_connect.php';

echo "<h2>Creating Dummy Data for Testing</h2>";

$retailer_id = 1;

// 1. Insert Dummy Products Bookings
$query1 = "INSERT INTO product_bookings (retailer_id, farmer_id, booking_date, product, quantity, status) VALUES 
(1, 'FARMER_1', CURDATE(), 'Urea', 50, 'Booked'),
(1, 'FARMER_2', CURDATE(), 'DAP', 20, 'Booked'),
(1, 'FARMER_3', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Urea', 100, 'Booked'),
(1, 'FARMER_4', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Urea', 400, 'Booked')";

if ($conn->query($query1) === TRUE) {
    echo "<p style='color:green'>✅ Dummy Bookings Inserted</p>";
} else {
    echo "<p style='color:red'>❌ Error Inserting Bookings: " . $conn->error . "</p>";
}

echo "<h3>Now check the API: <a href='get_retailer_forecast.php?retailer_id=1'>Click Here</a></h3>";
?>
