<?php
include 'db_connect.php';
$res = $conn->query("SELECT selected_retailer_id FROM farmer_info LIMIT 5");
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
