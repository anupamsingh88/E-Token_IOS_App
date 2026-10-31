<?php
/**
 * clear_dummy_data.php
 * Cleans up all generated dummy farmers and bookings from the database
 */
include 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

// 1. Delete dummy bookings
$b_res = $conn->query("DELETE FROM product_bookings WHERE order_id LIKE 'ORD_DUMMY_%'");
$b_deleted = $conn->affected_rows;

// 2. Delete dummy farmers
$f_res = $conn->query("DELETE FROM farmer_info WHERE farmer_id LIKE 'FARMER_DUMMY_%'");
$f_deleted = $conn->affected_rows;

// 3. Get remaining counts for retailer 689483
$retailer_id = '689483';
$remaining_f = $conn->query("SELECT COUNT(*) as c FROM farmer_info WHERE selected_retailer_id = '$retailer_id'")->fetch_assoc()['c'];
$remaining_b = $conn->query("SELECT COUNT(*) as c FROM product_bookings WHERE retailer_id = '$retailer_id'")->fetch_assoc()['c'];

echo json_encode([
    "success" => true,
    "message" => "All dummy data removed successfully!",
    "deleted_farmers" => $f_deleted,
    "deleted_bookings" => $b_deleted,
    "remaining_farmers_for_retailer_689483" => (int) $remaining_f,
    "remaining_bookings_for_retailer_689483" => (int) $remaining_b
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
