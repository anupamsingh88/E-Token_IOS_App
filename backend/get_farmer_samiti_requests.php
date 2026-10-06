<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

$farmer_id = $_GET['farmer_id'] ?? null;

if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'farmer_id is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT rcr.*, 
               COALESCE(ri.name, rcr.requested_retailer_name, rcr.requested_retailer_id) as requested_retailer_name, 
               COALESCE(ri.shop_name, rcr.requested_retailer_name, rcr.requested_retailer_id) as requested_shop_name
        FROM retailer_change_requests rcr
        LEFT JOIN retailer_info ri ON (rcr.requested_retailer_id = ri.id OR rcr.requested_retailer_id = ri.name OR rcr.requested_retailer_id = ri.shop_name)
        WHERE rcr.farmer_id = ? 
        ORDER BY rcr.created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$farmer_id]);

    $request = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($request) {
        echo json_encode(['success' => true, 'data' => $request]);
    } else {
        echo json_encode(['success' => true, 'data' => null]);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>