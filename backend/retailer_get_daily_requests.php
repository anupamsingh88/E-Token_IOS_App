<?php
/**
 * Retailer Get Daily Requests API
 * Fetches today's fertilizer requests for a specific retailer with status and time.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/db_connect.php';

global $conn;

if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed internally']);
    exit;
}

$response = ['success' => false, 'data' => []];

try {
    $retailer_id = $_GET['retailer_id'] ?? null;
    $date = date('Y-m-d');

    if (!$retailer_id) {
        throw new Exception("retailer_id is required");
    }

    // Check if table exists
    $table_check = $conn->query("SHOW TABLES LIKE 'retailer_stock_requests'");
    $requests = [];
    if ($table_check && $table_check->num_rows > 0) {
        $query = "SELECT product_type, requested_quantity, status, ar_comment, created_at 
                  FROM retailer_stock_requests 
                  WHERE retailer_id = ? AND DATE(created_at) = ?
                  ORDER BY created_at DESC";
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param("ss", $retailer_id, $date);
            $stmt->execute();
            $requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        }
    }

    $formatted_data = [
        'urea' => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null],
        'dap'  => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null],
        'npk'  => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null],
        'mop'  => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null]
    ];

    foreach ($requests as $req) {
        $type = strtolower($req['product_type']);
        if ($formatted_data[$type]['status'] === null) {
            $formatted_data[$type] = [
                'quantity' => (int)$req['requested_quantity'],
                'status' => $req['status'],
                'comment' => $req['ar_comment'],
                'time' => date('h:i A', strtotime($req['created_at']))
            ];
        }
    }

    $response['success'] = true;
    $response['data'] = $formatted_data;

} catch (Throwable $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
