<?php
require_once 'db_connect.php';
$res = $conn->query("SELECT id, retailer_id, mobile FROM retailer_info LIMIT 5");
$rows = [];
while($row = $res->fetch_assoc()) $rows[] = $row;
echo json_encode($rows);
?>
