<?php
include 'db_connect.php';
$res = $conn->query("SELECT retailer_id FROM product_bookings LIMIT 5");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
