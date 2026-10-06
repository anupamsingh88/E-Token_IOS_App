<?php
// Database Diagnostic Script
// Check if all required tables exist

header('Content-Type: text/html; charset=utf-8');
echo "<h1>Database Diagnostic Report</h1>";

require_once 'db_connect.php';

if (!isset($conn)) {
    echo "<p style='color: red;'>❌ Database connection FAILED!</p>";
    exit;
}

echo "<p style='color: green;'>✅ Database connection successful</p>";
echo "<p><strong>Database:</strong> " . $conn->query("SELECT DATABASE()")->fetch_row()[0] . "</p>";

// Check required tables
$requiredTables = [
    'app_settings',
    'seasonal_settings',
    'advisory_tips',
    'farmer_info',
    'retailers'
];

echo "<h2>Table Status:</h2>";
echo "<table border='1' cellpadding='10'>";
echo "<tr><th>Table Name</th><th>Status</th><th>Row Count</th></tr>";

foreach ($requiredTables as $table) {
    $checkQuery = "SHOW TABLES LIKE '$table'";
    $result = $conn->query($checkQuery);

    if ($result->num_rows > 0) {
        // Table exists, count rows
        $countQuery = "SELECT COUNT(*) as count FROM `$table`";
        $countResult = $conn->query($countQuery);
        $count = $countResult->fetch_assoc()['count'];

        echo "<tr>";
        echo "<td>$table</td>";
        echo "<td style='color: green;'>✅ EXISTS</td>";
        echo "<td>$count rows</td>";
        echo "</tr>";
    } else {
        echo "<tr>";
        echo "<td>$table</td>";
        echo "<td style='color: red;'>❌ MISSING</td>";
        echo "<td>-</td>";
        echo "</tr>";
    }
}

echo "</table>";

echo "<h2>Required Actions:</h2>";
echo "<ol>";
echo "<li>Open <strong>phpMyAdmin</strong> (http://localhost/phpmyadmin)</li>";
echo "<li>Select your database</li>";
echo "<li>Click on <strong>SQL</strong> tab</li>";
echo "<li>Open file: <code>h:\\htdocs\\backend\\setup_superadmin_complete.sql</code></li>";
echo "<li>Copy all content and paste in SQL tab</li>";
echo "<li>Click <strong>Go</strong> button</li>";
echo "<li>Refresh this page to verify</li>";
echo "</ol>";

$conn->close();
?>