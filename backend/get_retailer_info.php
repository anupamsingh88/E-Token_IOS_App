<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require 'db_connect.php';

$retailer_id = $_GET['retailer_id'] ?? null;

if (!$retailer_id) {
    echo json_encode(['success' => false, 'message' => 'retailer_id is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, shop_name, mobile, address FROM retailer_info WHERE id = ? LIMIT 1");
    $stmt->execute([$retailer_id]);
    $retailer = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($retailer) {
        echo json_encode([
            'success' => true,
            'data' => [
                'id'          => $retailer['id'],
                'name'        => $retailer['name'],
                'agency_name' => $retailer['shop_name'], // same key upsfms API used
                'shop_name'   => $retailer['shop_name'],
                'mobile'      => $retailer['mobile'],
                'address'     => $retailer['address'],
            ]
        ]);
    } else {
        // Retailer not in local DB — return just the ID so UI doesn't break
        echo json_encode([
            'success' => true,
            'data' => [
                'id'          => $retailer_id,
                'name'        => "Samiti $retailer_id",
                'agency_name' => "Samiti $retailer_id",
                'shop_name'   => "Samiti $retailer_id",
                'address'     => '',
            ]
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
}
?>
