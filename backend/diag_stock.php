<?php
include 'db_connect.php';
echo "Columns:\n";
$res = $conn->query("SHOW COLUMNS FROM retailer_stock");
while($row = $res->fetch_assoc()) echo $row['Field'] . " ";
echo "\nData:\n";
$res = $conn->query("SELECT * FROM retailer_stock ORDER BY date DESC LIMIT 5");
while($row = $res->fetch_assoc()) {
    foreach($row as $k=>$v) echo "$k: $v | ";
    echo "\n";
}
?>
