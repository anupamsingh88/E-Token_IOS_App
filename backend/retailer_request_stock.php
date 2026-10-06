<?php
/**
 * Retailer Request Stock API
 * Handles fertilizer stock requests to AR.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/db_connect.php';

global $conn;

if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed internally']);
    exit;
}

$response = ['success' => false, 'message' => ''];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $retailer_id = $input['retailer_id'] ?? null;
    $product_type = $input['product_type'] ?? null; // urea, dap, npk, mop
    $quantity = $input['quantity'] ?? null;

    if (!$retailer_id || !$product_type || $quantity === null || $quantity <= 0) {
        throw new Exception("Missing or invalid parameters: retailer_id, product_type, quantity");
    }

    $valid_products = ['urea', 'dap', 'npk', 'mop'];
    if (!in_array(strtolower($product_type), $valid_products)) {
        throw new Exception("Invalid product type: $product_type");
    }

    // Ensure retailer_stock_requests table exists
    $conn->query("
        CREATE TABLE IF NOT EXISTS `retailer_stock_requests` (
            `id`                 INT AUTO_INCREMENT PRIMARY KEY,
            `retailer_id`        VARCHAR(100) NOT NULL,
            `product_type`       VARCHAR(50) NOT NULL,
            `requested_quantity` INT NOT NULL,
            `status`             ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            `ar_comment`         TEXT DEFAULT NULL,
            `created_at`         DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at`         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Check for existing pending request for today
    $today = date('Y-m-d');
    $p_type = strtolower($product_type);
    $sql_check = "SELECT id FROM retailer_stock_requests 
                  WHERE retailer_id = ? AND product_type = ? 
                  AND status = 'pending' AND DATE(created_at) = ?";
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bind_param("sss", $retailer_id, $p_type, $today);
    $stmt_check->execute();
    $existing = $stmt_check->get_result()->fetch_assoc();

    if ($existing) {
        // Update existing pending request
        $sql = "UPDATE retailer_stock_requests SET requested_quantity = ?, updated_at = NOW() WHERE id = ?";
        $stmt_update = $conn->prepare($sql);
        $stmt_update->bind_param("ii", $quantity, $existing['id']);
        $stmt_update->execute();
        $response['message'] = ucfirst($product_type) . ' के लिए आपका अनुरोध अपडेट कर दिया गया है।';
    } else {
        // Insert new request
        $sql = "INSERT INTO retailer_stock_requests (retailer_id, product_type, requested_quantity, status, created_at) 
                VALUES (?, ?, ?, 'pending', NOW())";
        $p_type = strtolower($product_type);
        $stmt_insert = $conn->prepare($sql);
        $stmt_insert->bind_param("ssi", $retailer_id, $p_type, $quantity);
        $stmt_insert->execute();
        $response['message'] = ucfirst($product_type) . ' के लिए आपका अनुरोध भेज दिया गया है।';
    }

    $response['success'] = true;

} catch (Throwable $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
$conn->close();
?>
