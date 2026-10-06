<?php
require_once 'db_connect.php';
$r = $conn->query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE '%price%'");
while($row = $r->fetch_assoc()) echo $row['setting_key'] . " = " . $row['setting_value'] . "\n";
?>
