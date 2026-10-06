<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->farmer_id) || !isset($data->current_retailer_id) || !isset($data->requested_retailer_id) || !isset($data->reason)) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

$farmer_id = $data->farmer_id;
$current_retailer_id = $data->current_retailer_id;
$requested_retailer_id = $data->requested_retailer_id;
$current_retailer_name = isset($data->current_retailer_name) ? $data->current_retailer_name : '';
$requested_retailer_name = isset($data->requested_retailer_name) ? $data->requested_retailer_name : '';
$requested_retailer_address = isset($data->requested_retailer_address) ? $data->requested_retailer_address : '';
$retailer_id = $requested_retailer_id; 
$reason = $data->reason;
$other_reason_text = isset($data->other_reason_text) ? $data->other_reason_text : null;

try {
    // Check if there is already a pending request
    $checkStmt = $pdo->prepare("SELECT id FROM retailer_change_requests WHERE farmer_id = ? AND status = 'Pending'");
    $checkStmt->execute([$farmer_id]);

    if ($checkStmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'You already have a pending retailer change request.']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO retailer_change_requests (farmer_id, current_retailer_id, requested_retailer_id, current_retailer_name, requested_retailer_name, requested_retailer_address, retailer_id, reason, other_reason_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if ($stmt->execute([$farmer_id, $current_retailer_id, $requested_retailer_id, $current_retailer_name, $requested_retailer_name, $requested_retailer_address, $retailer_id, $reason, $other_reason_text])) {
        echo json_encode(['success' => true, 'message' => 'Request submitted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to submit request']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>