<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$farmer_id = $input['farmer_id'] ?? null;
$name = trim($input['name'] ?? '');

if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'Farmer ID is required']);
    exit;
}

if (empty($name)) {
    echo json_encode(['success' => false, 'message' => 'Name cannot be empty']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE farmer_info SET name = ? WHERE farmer_id = ?");
    $stmt->execute([$name, $farmer_id]);

    if ($stmt->rowCount() === 0) {
        echo json_encode(['success' => false, 'message' => 'Farmer not found or no change made']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>