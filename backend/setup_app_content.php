<?php
// Script to create app_content table
require_once 'db_connect.php';

// Read SQL file
$sql = file_get_contents('app_content.sql');

// Execute multi-query
if ($conn->multi_query($sql)) {
    echo "✅ App content table created successfully!\n";

    // Clear results
    while ($conn->more_results()) {
        $conn->next_result();
        if ($result = $conn->store_result()) {
            $result->free();
        }
    }
} else {
    echo "❌ Error creating table: " . $conn->error . "\n";
}

$conn->close();
?>