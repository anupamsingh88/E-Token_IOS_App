<?php
require_once 'db_connect.php';
$res = $conn->query("SHOW COLUMNS FROM farmer_info");
$cols = [];
while($row = $res->fetch_assoc()) $cols[] = $row['Field'];
echo "COLUMNS IN farmer_info:\n";
echo implode(", ", $cols) . "\n";

$count = $conn->query("SELECT COUNT(*) as c FROM farmer_info")->fetch_assoc()['c'];
echo "TOTAL RECORDS: $count\n";

if($count > 0) {
    $row = $conn->query("SELECT * FROM farmer_info LIMIT 1")->fetch_assoc();
    echo "SAMPLE ROW DATA:\n";
    foreach($row as $k=>$v) {
        if(strpos($k, 'photo') !== false || strpos($k, 'aadhaar') !== false) {
            echo "$k => $v\n";
        }
    }
}
?>
