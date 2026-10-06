<?php
require_once 'db_connect.php';
$res = $conn->query("SHOW COLUMNS FROM retailer_info");
$cols = [];
while($row = $res->fetch_assoc()) $cols[] = $row['Field'];
echo json_encode($cols);
?>
