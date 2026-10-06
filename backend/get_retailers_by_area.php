<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require 'db_connect.php';

$block_id = $_GET['block_id'] ?? null;
$district_id = $_GET['district_id'] ?? null;

if (!$block_id && !$district_id) {
    echo json_encode(['success' => false, 'message' => 'block_id or district_id is required']);
    exit;
}

try {
    if ($block_id && $district_id) {
        $stmt = $pdo->prepare("SELECT id, name, shop_name, mobile, address FROM retailer_info WHERE block_id = ? OR (block_id IS NULL AND district_id = ?)");
        $stmt->execute([$block_id, $district_id]);
    } else if ($block_id) {
        $stmt = $pdo->prepare("SELECT id, name, shop_name, mobile, address FROM retailer_info WHERE block_id = ?");
        $stmt->execute([$block_id]);
    } else {
        $stmt = $pdo->prepare("SELECT id, name, shop_name, mobile, address FROM retailer_info WHERE district_id = ?");
        $stmt->execute([$district_id]);
    }

    $retailers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $retailers]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>