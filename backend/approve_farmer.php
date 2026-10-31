<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['farmer_id'])) {
    echo json_encode(['success' => false, 'message' => 'Farmer ID is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE farmer_info SET status = 1 WHERE farmer_id = ?");
    $stmt->execute([$input['farmer_id']]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Farmer approved successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Farmer not found or already approved']);
    }

} catch (PDOException $e) {
    error_log("approve_farmer error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'स्वीकृति प्रक्रिया में तकनीकी समस्या आई।']);
}
?>
