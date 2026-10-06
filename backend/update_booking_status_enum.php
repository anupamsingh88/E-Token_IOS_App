<?php
require_once 'db_connect.php';

$query = "ALTER TABLE product_bookings MODIFY COLUMN status ENUM('Pending', 'Booked', 'Collected', 'Cancelled') DEFAULT 'Pending'";

if ($conn->query($query)) {
    echo "Status ENUM updated successfully.";
} else {
    echo "Error updating ENUM: " . $conn->error;
}
?>