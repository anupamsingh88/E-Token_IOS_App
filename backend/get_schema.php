<?php
include 'db_connect.php';
$res = $conn->query("SHOW CREATE TABLE farmer_info");
$row = $res->fetch_assoc();
echo $row['Create Table'];
?>
