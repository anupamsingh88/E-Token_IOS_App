<?php
/**
 * Unified App Logger API
 * Endpoint for both Farmer App and Retailer App logs.
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit();
}

// Extract fields safely
$log_level    = $data['log_level'] ?? 'INFO';
$message      = $data['message'] ?? 'No message';
$farmer_id    = $data['farmer_id'] ?? null;
$retailer_id  = $data['retailer_id'] ?? null;

// Basic sanity check to avoid massive payload crashes
if (isset($data['request_body']) && strlen($data['request_body']) > 10000) $data['request_body'] = substr($data['request_body'], 0, 10000) . '...[TRUNCATED]';
if (isset($data['response']) && strlen($data['response']) > 10000) $data['response'] = substr($data['response'], 0, 10000) . '...[TRUNCATED]';

try {
    // Determine category based on IDs
    $source = 'backend';
    if ($farmer_id) $source = 'farmer';
    elseif ($retailer_id) $source = 'retailer';
    elseif (strpos($data['api_url'] ?? '', 'retailer') !== false) $source = 'retailer';
    elseif (strpos($data['api_url'] ?? '', 'farmer') !== false) $source = 'farmer';

    // Log to file using professional logger
    log_message($log_level, "MOBILE_APP: " . $message, $source, null, $data);
    
    echo json_encode(['success' => true]);
    
} catch (Exception $e) {
    // Even if logging fails, don't crash the API
    echo json_encode(['success' => false, 'message' => 'Log Error: ' . $e->getMessage()]);
}

if (isset($conn)) $conn->close();
?>

