<?php
/**
 * log_client_error.php
 * Receives errors from the frontend application and stores them in the system log.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'db_connect.php';
// Note: logger.php is already included via db_connect.php

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['message'])) {
    echo json_encode(["success" => false, "message" => "Invalid payload"]);
    exit;
}

$level = $data['level'] ?? 'ERROR';
$message = $data['message'];
$stack = $data['stack'] ?? null;
$context = $data['context'] ?? [];

// Log the frontend error
log_message($level, $message, 'frontend', $stack, $context);

echo json_encode(["success" => true, "message" => "Log received"]);
?>