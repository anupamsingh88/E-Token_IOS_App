<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

try {
    // Fetch all districts from master_district table
    $stmt = $pdo->prepare("
        SELECT district_name, sno as id
        FROM master_district where in_app = '1'
        ORDER BY district_name ASC
    ");

    $stmt->execute();
    $rawDistricts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $districts = [];
    foreach ($rawDistricts as $row) {
        $rawName = trim($row['district_name'] ?? '');
        // First letter capital, rest lowercase (Title Case: e.g. "BIJNOR" -> "Bijnor", "RAE BARELI" -> "Rae Bareli")
        $formattedName = mb_convert_case($rawName, MB_CASE_TITLE, 'UTF-8');

        $districts[] = [
            'value' => $formattedName,
            'label' => $formattedName,
            'id'    => isset($row['id']) ? intval($row['id']) : null
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $districts,
        'count' => count($districts)
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>