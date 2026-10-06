<?php
require_once 'db_connect.php';
$res = $conn->query("SELECT name_en, name_hi FROM villages LIMIT 10");
while ($row = $res->fetch_assoc()) {
    echo "HI: " . $row['name_hi'] . " | EN: " . $row['name_en'] . "\n";
}
?>