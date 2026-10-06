<?php
/**
 * App Log Collector Endpoint
 * Receives logs from React Native app and stores in DB
 * URL: /backend/save_log.php
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-App-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Simple secret key to prevent random people from spamming the log endpoint
// This should match APP_LOG_SECRET in your React Native app
define('LOG_SECRET', 'sfms_log_2026');

ob_start();
require 'db_connect.php'; // This now includes logger.php

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'POST required']);
    exit;
}

// Verify secret key
$secret = $_SERVER['HTTP_X_APP_SECRET'] ?? '';
if ($secret !== LOG_SECRET) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['logs'])) {
    echo json_encode(['success' => false, 'message' => 'No logs provided']);
    exit;
}

$logs = $input['logs'];
if (!is_array($logs) || empty($logs)) {
    echo json_encode(['success' => false, 'message' => 'Empty logs array']);
    exit;
}

$inserted = 0;
foreach ($logs as $log) {
    $level       = substr($log['level'] ?? 'INFO', 0, 20);
    $farmer_id   = $log['farmerId'] ?? null;
    
    // Determine category
    $source = 'farmer';
    if (!$farmer_id && (strpos($log['url'] ?? '', 'retailer') !== false)) {
        $source = 'retailer';
    }

    // Prepare log record
    $log_message_text = "MOBILE_BATCH: " . ($log['error'] ?? 'App Log');
    
    // Log to file using professional logger
    log_message($level, $log_message_text, $source, null, $log);
    $inserted++;
}

if (ob_get_length()) ob_clean();
echo json_encode(['success' => true, 'saved' => $inserted]);
?>

