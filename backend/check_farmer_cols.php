<?php
include 'db_connect.php';
$res = $conn->query("DESC farmer_info");
while($row = $res->fetch_assoc()) echo $row['Field'] . "\n";
?>
