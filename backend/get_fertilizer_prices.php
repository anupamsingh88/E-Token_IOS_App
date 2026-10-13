<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

try {
    // Fetch all fertilizer prices from database
    $stmt = $pdo->query("SELECT type_id as id, type_id as type, name, nameHindi, pricePerBag, imageUrl FROM fertilizer_products");
    $prices = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $row['pricePerBag'] = (float)$row['pricePerBag'];
        $prices[] = $row;
    }

    echo json_encode([
        'success' => true,
        'prices' => $prices,
        'lastUpdated' => date('Y-m-d H:i:s')
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>