<?php
/**
 * ==================== ASYNC APP LOGGER ====================
 * Non-blocking logging with Redis queue + batch processing
 * 
 * Problem: Each log write is synchronous, blocking under high load
 * Solution: Push to Redis queue (~1ms) → Process in batches (async)
 * 
 * Replace current app_logger.php with this optimized version
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
$message      = $data['message'] ?? '';
$api_url      = $data['api_url'] ?? '';
$method       = $data['method'] ?? '';
$request_body = $data['request_body'] ?? '';
$status_code  = isset($data['status_code']) ? (int)$data['status_code'] : null;
$response     = $data['response'] ?? '';
$error_msg    = $data['error_msg'] ?? '';
$farmer_id    = $data['farmer_id'] ?? null;
$retailer_id  = $data['retailer_id'] ?? null;
$device_info  = $data['device_info'] ?? '';
$app_version  = $data['app_version'] ?? '';

try {
    // ===== METHOD 1: Redis Queue (Preferred - Non-blocking) =====
    try {
        $redis = new Redis();
        $redis->connect('127.0.0.1', 6379, 1);  // 1 second timeout
        
        // Log request ID for tracking
        $log_id = uniqid();
        $log_data = [
            'id' => $log_id,
            'log_level' => $log_level,
            'message' => $message,
            'api_url' => $api_url,
            'method' => $method,
            'status_code' => $status_code,
            'farmer_id' => $farmer_id,
            'retailer_id' => $retailer_id,
            'device_info' => $device_info,
            'app_version' => $app_version,
            'timestamp' => time()
        ];
        
        // Push to Redis queue - VERY FAST (~1ms)
        $queue_key = 'app_logs:queue';
        $redis->lPush($queue_key, json_encode($log_data));
        
        // Set expiry on queue (auto-cleanup if not processed within 24h)
        $redis->expire($queue_key, 86400);
        
        // Also push larger data to separate key for later retrieval
        $redis->setex("log_detail:{$log_id}", 86400, json_encode([
            'request_body' => substr($request_body, 0, 5000),
            'response' => substr($response, 0, 5000),
            'error_msg' => $error_msg
        ]));
        
        http_response_code(202);  // 202 Accepted
        echo json_encode([
            'success' => true,
            'queued' => true,
            'log_id' => $log_id,
            'message' => 'Log queued for processing'
        ]);
        
        $redis->close();
        exit;
        
    } catch (Exception $redis_error) {
        // Fallback if Redis is down
        error_log("Redis unavailable, falling back to direct insert: " . $redis_error->getMessage());
    }
    
    // ===== METHOD 2: Direct Insert (Fallback - Slower but reliable) =====
    // Only log essential fields to minimize write time
    
    $stmt = $conn->prepare("INSERT INTO app_logs 
        (log_level, message, api_url, method, status_code, farmer_id, retailer_id, device_info, app_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB Error: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("sssssssis",
        $log_level,
        $message,
        $api_url,
        $method,
        $status_code,
        $farmer_id,
        $retailer_id,
        $device_info,
        $app_version
    );
    
    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(['success' => true, 'queued' => false, 'message' => 'Log saved directly']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB Error: ' . $stmt->error]);
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>
