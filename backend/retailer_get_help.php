<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once 'db_connect.php';

try {
    $stmt = $pdo->query("SELECT * FROM retailer_helpcenter_info WHERE is_active = 1 ORDER BY id ASC");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $data,
        'message' => 'Help center information retrieved successfully'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching help information: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>