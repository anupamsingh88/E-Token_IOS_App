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

    $requests = [];
    if (true) {
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

    $formatted_data = [];
    $prod_res = $conn->query("SELECT type_id FROM fertilizer_products");
    if ($prod_res && $prod_res->num_rows > 0) {
        while ($p = $prod_res->fetch_assoc()) {
            $formatted_data[strtolower($p['type_id'])] = [
                'quantity' => 0,
                'status' => null,
                'comment' => null,
                'time' => null
            ];
        }
    } else {
        $formatted_data = [
            'urea' => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null],
            'dap'  => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null],
            'npk'  => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null],
            'mop'  => ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null]
        ];
    }

    foreach ($requests as $req) {
        $type = strtolower($req['product_type']);
        if (!isset($formatted_data[$type])) {
            $formatted_data[$type] = ['quantity' => 0, 'status' => null, 'comment' => null, 'time' => null];
        }
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
