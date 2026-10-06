<?php
/**
 * Retailer Update Stock API
 * Handles daily stock updates. Updates existing day entry or inserts new one.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';

$response = ['success' => false, 'message' => ''];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $retailer_id = $input['retailer_id'] ?? null;
    $today = date('Y-m-d');
    $updates_received = [];

    // Handle both single update (old way) and multiple updates (new way)
    if (isset($input['product_type']) && isset($input['quantity'])) {
        $updates_received[] = [
            'product_type' => $input['product_type'],
            'quantity' => $input['quantity']
        ];
    } elseif (isset($input['updates']) && is_array($input['updates'])) {
        $updates_received = $input['updates'];
    }

    if (!$retailer_id || empty($updates_received)) {
        throw new Exception("Missing required parameters: retailer_id, updates");
    }

    // Fetch numeric internal ID
    $stmt_info = $pdo->prepare("SELECT id FROM retailer_info WHERE retailer_id = ? OR id = ?");
    $stmt_info->execute([$retailer_id, $retailer_id]);
    $retailer_info = $stmt_info->fetch();
    
    if (!$retailer_info) {
        throw new Exception("Retailer not found");
    }
    $numeric_id = $retailer_info['id'];

    $column_map = [
        'urea' => 'UREA_stock',
        'dap'  => 'DAP_stock',
        'npk'  => 'NPK_stock',
        'mop'  => 'MOP_stock',
    ];

    $pdo->beginTransaction();

    // Check if entry for today exists
    $stmt_check = $pdo->prepare("SELECT id FROM retailer_stock WHERE retailer_id = ? AND date = ? FOR UPDATE");
    $stmt_check->execute([$numeric_id, $today]);
    $existing = $stmt_check->fetch();

    if (!$existing) {
        // Create initial record for today
        $stmt_init = $pdo->prepare("INSERT INTO retailer_stock (retailer_id, date, created_at) VALUES (?, ?, NOW())");
        $stmt_init->execute([$numeric_id, $today]);
        $stock_id = $pdo->lastInsertId();
    } else {
        $stock_id = $existing['id'];
    }

    $success_products = [];
    foreach ($updates_received as $update) {
        $prod = strtolower($update['product_type'] ?? '');
        $qty = $update['quantity'];

        if (isset($column_map[$prod])) {
            $col_stock = $column_map[$prod];
            $sql = "UPDATE retailer_stock SET $col_stock = ?, updated_at = NOW() WHERE id = ?";
            $stmt_upd = $pdo->prepare($sql);
            $stmt_upd->execute([$qty, $stock_id]);
            $success_products[] = $prod;
        }
    }

    $pdo->commit();
    $response['success'] = true;
    $response['message'] = 'स्टॉक सफलतापूर्वक अपडेट किया गया: ' . implode(', ', $success_products);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
if (isset($pdo)) $pdo = null;
?>
