<?php
include 'db_connect.php';
$res = $conn->query("DESCRIBE farmer_info");
while($row = $res->fetch_assoc()) {
    echo $row['Field'] . "\n";
}
