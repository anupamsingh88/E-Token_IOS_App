login<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

ob_start();

require_once 'error_logger.php';
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['user_type']) || !isset($input['user_id']) || !isset($input['fcm_token'])) {
    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

$userType = $input['user_type']; // 'farmer' or 'retailer'
$userId = $input['user_id'];
$fcmToken = $input['fcm_token'];

try {
    if ($userType === 'farmer') {
        $stmt = $pdo->prepare("UPDATE farmer_info SET fcm_token = ? WHERE farmer_id = ?");
        $stmt->execute([$fcmToken, $userId]);
    } else if ($userType === 'retailer') {
        $stmt = $pdo->prepare("UPDATE retailer_info SET fcm_token = ? WHERE retailer_id = ?");
        $stmt->execute([$fcmToken, $userId]);
    } else {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid user type']);
        exit;
    }

    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => true, 'message' => 'FCM Token updated successfully']);

} catch (PDOException $e) {
    log_error($e);
    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
?>
