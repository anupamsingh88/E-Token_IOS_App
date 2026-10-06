<?php
include 'db_connect.php';
$res = $conn->query("SELECT id, retailer_id, name FROM retailer_info LIMIT 5");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
