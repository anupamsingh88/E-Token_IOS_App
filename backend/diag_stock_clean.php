<?php
include 'db_connect.php';
$res = $conn->query("SELECT retailer_id, date, UREA_stock FROM retailer_stock LIMIT 5");
while($row = $res->fetch_assoc()) {
    echo "ID: " . $row['retailer_id'] . " | Date: " . $row['date'] . " | Urea: " . $row['UREA_stock'] . "\n";
}
?>
