<?php
header('Content-Type: text/html');
require_once 'db_connect.php';

$date = date('Y-m-d');
echo "<h2>Stock & Quota Debug for Date: $date</h2>";

// 1. Check Farmer Quota Manually (Avoid including API script)
$farmer_id = 'FARMER_698d0a38b391f'; // Vinayak
echo "<h3>1. Farmer Quota Check ($farmer_id)</h3>";

$stmt = $conn->prepare("SELECT khasra_rukba FROM farmer_info WHERE farmer_id = ?");
$stmt->bind_param("s", $farmer_id);
$stmt->execute();
$res = $stmt->get_result();
if ($row = $res->fetch_assoc()) {
    echo "Land Area: " . $row['khasra_rukba'] . " Ha<br>";
} else {
    echo "Farmer Not Found<br>";
}

echo "<h4>Fertilizer Bookings for this farmer:</h4>";
$b_stmt = $conn->query("SELECT * FROM product_bookings WHERE farmer_id = '$farmer_id'");
if ($b_stmt->num_rows > 0) {
    while ($b = $b_stmt->fetch_assoc()) {
        echo "Booking: {$b['product']} - {$b['quantity']} bags ({$b['status']})<br>";
    }
} else {
    echo "No bookings found.<br>";
}

// 2. Check Retailer Stock
echo "<h3>2. Retailer Stock Check</h3>";
$s_stmt = $conn->prepare("SELECT * FROM retailer_stock WHERE date = ?");
$s_stmt->bind_param("s", $date);
$s_stmt->execute();
$s_res = $s_stmt->get_result();

if ($s_res->num_rows > 0) {
    while ($stock = $s_res->fetch_assoc()) {
        echo "Retailer ID: {$stock['retailer_id']}<br>";
        echo "Urea: {$stock['UREA_stock']}<br>";
        echo "DAP: {$stock['DAP_stock']}<br>";
        echo "NPK: {$stock['NPK_stock']}<br>";
        echo "MOP: {$stock['MOP_stock']}<br><hr>";
    }
} else {
    echo "<p style='color:red'>No stock records found for today ($date)!</p>";
    echo "<p>Running Insert for test data...</p>";
    // Insert test data for specific Retailer ID 1 (Ram Prasad)
    // Make sure Retailer 1 exists or check retailer table
    $r_check = $conn->query("SELECT id FROM retailer_info LIMIT 1");
    if ($r_row = $r_check->fetch_assoc()) {
        $r_id = $r_row['id'];
        $conn->query("INSERT INTO retailer_stock (retailer_id, date, UREA_stock, DAP_stock, NPK_stock, MOP_stock) VALUES ($r_id, '$date', 500, 300, 200, 100) ON DUPLICATE KEY UPDATE UREA_stock=500");
        echo "Inserted stock for Retailer ID $r_id. <br><b>Please reload this page to verify.</b>";
    } else {
        echo "No retailers found in database to attach stock to!";
    }
}
?>
