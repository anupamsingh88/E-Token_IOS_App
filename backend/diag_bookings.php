<?php
include 'db_connect.php';
$table = 'product_bookings';
$res = $conn->query("DESCRIBE $table");
while($row = $res->fetch_assoc()) {
    echo $row['Field'] . " " . $row['Type'] . "\n";
}
echo "\nSample Data:\n";
$res = $conn->query("SELECT retailer_id FROM $table LIMIT 1");
if ($row = $res->fetch_assoc()) print_r($row);
?>
