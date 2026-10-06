<?php
/**
 * ==================== BATCH LOG PROCESSOR ====================
 * Processes Redis queue of logs in batches
 * 
 * Run via cron: */5 * * * * /usr/bin/php /var/www/html/backend/process_logs_batch.php
 * Or via supervisor: See supervisor config below
 * 
 * Benefits:
 * - 1000 logs inserted in ~100ms (vs 1000 * 1s if synchronous)
 * - Frees up app servers to handle more requests
 * - Graceful failure handling with retry
 */

require_once 'db_connect.php';

// Config
$BATCH_SIZE = 1000;      // Process max 1000 logs per batch
$REDIS_HOST = '127.0.0.1';
$REDIS_PORT = 6379;
$REDIS_TIMEOUT = 5;
$QUEUE_KEY = 'app_logs:queue';

// Logging
$log_file = '/var/log/app_logs_processor.log';

function log_message($msg) {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$timestamp] $msg\n", FILE_APPEND);
    echo "$msg\n";
}

try {
    log_message("=== Starting batch log processor ===");
    
    // Connect to Redis
    $redis = new Redis();
    $redis->connect($REDIS_HOST, $REDIS_PORT, $REDIS_TIMEOUT);
    
    // Check queue size
    $queue_length = $redis->lLen($QUEUE_KEY);
    log_message("Queue size: $queue_length logs");
    
    if ($queue_length === 0) {
        log_message("Queue is empty, nothing to process");
        exit(0);
    }
    
    // Pop logs from queue
    $batch = [];
    for ($i = 0; $i < $BATCH_SIZE; $i++) {
        $item = $redis->rPop($QUEUE_KEY);
        if (!$item) break;
        
        $log = json_decode($item, true);
        if ($log) {
            $batch[] = $log;
        }
    }
    
    if (empty($batch)) {
        log_message("No valid logs in batch");
        exit(0);
    }
    
    log_message("Processing " . count($batch) . " logs...");
    
    // Prepare batch insert
    $values = [];
    $placeholders = [];
    $types = '';
    $params = [];
    
    foreach ($batch as $log) {
        $placeholders[] = "(?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))";
        $types .= "ssssssssis";
        
        $params[] = $log['log_level'] ?? 'INFO';
        $params[] = $log['message'] ?? '';
        $params[] = $log['api_url'] ?? '';
        $params[] = $log['method'] ?? '';
        $params[] = $log['status_code'] ?? 0;
        $params[] = $log['farmer_id'] ?? null;
        $params[] = $log['retailer_id'] ?? null;
        $params[] = $log['device_info'] ?? '';
        $params[] = $log['app_version'] ?? '';
        $params[] = $log['timestamp'] ?? time();
    }
    
    $sql = "INSERT INTO app_logs 
            (log_level, message, api_url, method, status_code, farmer_id, retailer_id, device_info, app_version, created_at)
            VALUES " . implode(',', $placeholders);
    
    // Execute bulk insert
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    // Bind parameters - use call_user_func_array for dynamic binding
    $bind_params = [$types];
    foreach ($params as &$param) {
        $bind_params[] = &$param;
    }
    
    if (!call_user_func_array([$stmt, 'bind_param'], $bind_params)) {
        throw new Exception("Bind failed: " . $stmt->error);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    $affected = $stmt->affected_rows;
    log_message("✅ Successfully inserted $affected logs in one batch");
    
    // Clean up detail keys from Redis (optional)
    foreach ($batch as $log) {
        $redis->del("log_detail:{$log['id']}");
    }
    
    $stmt->close();
    $conn->close();
    $redis->close();
    
    log_message("=== Batch processor completed successfully ===");
    exit(0);
    
} catch (Exception $e) {
    log_message("❌ ERROR: " . $e->getMessage());
    
    // On error, push failed logs back to queue for retry
    try {
        foreach ($batch as $log) {
            $redis->lPush($QUEUE_KEY, json_encode($log));
        }
        log_message("Re-queued " . count($batch) . " logs for retry");
    } catch (Exception $retry_error) {
        log_message("Failed to re-queue logs: " . $retry_error->getMessage());
    }
    
    exit(1);
}
?>
