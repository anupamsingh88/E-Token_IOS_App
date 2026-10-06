<?php
include 'db_connect.php';
$res = $conn->query("SHOW COLUMNS FROM farmer_info");
$cols = [];
while($row = $res->fetch_assoc()) {
    $cols[] = $row['Field'];
}
echo implode("\n", $cols);
?>
