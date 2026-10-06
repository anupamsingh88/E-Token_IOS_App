<?php
require_once __DIR__ . '/db_connect.php';
try {
    $sql = "ALTER TABLE farmer_info MODIFY COLUMN khatauni_photo TEXT;";
    $pdo->exec($sql);
    echo "Successfully updated khatauni_photo column to TEXT.\n";
} catch (PDOException $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
}
?>
