<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once 'db_connect.php';
require_once 'firebase_helper.php';

$data = json_decode(file_get_contents('php://input'), true);
$booking_id = isset($data['booking_id']) ? intval($data['booking_id']) : 0;
$farmer_id  = isset($data['farmer_id'])  ? $data['farmer_id']           : '';

if (!$booking_id || !$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'booking_id and farmer_id are required']);
    exit;
}

try {
    // Verify booking belongs to this farmer and is still Pending
    $check = $pdo->prepare("SELECT b.id, b.status, b.booking_date, b.order_id, b.retailer_id, r.fcm_token as retailer_fcm_token, f.name as farmer_name 
                            FROM product_bookings b 
                            LEFT JOIN retailer_info r ON b.retailer_id = r.retailer_id 
                            LEFT JOIN farmer_info f ON b.farmer_id = f.farmer_id 
                            WHERE b.id = ? AND b.farmer_id = ?");
    $check->execute([$booking_id, $farmer_id]);
    $booking = $check->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        echo json_encode(['success' => false, 'message' => 'Booking not found']);
        exit;
    }

    if ($booking['status'] !== 'Pending') {
        echo json_encode(['success' => false, 'message' => 'Only pending bookings can be cancelled']);
        exit;
    }

    // Cancel it
    $stmt = $pdo->prepare("UPDATE product_bookings SET status = 'Cancelled' WHERE id = ? AND farmer_id = ?");
    $stmt->execute([$booking_id, $farmer_id]);

    // Send push notification to retailer if token is available
    if (!empty($booking['retailer_fcm_token'])) {
        try {
            $fcm_title = "किसान द्वारा बुकिंग रद्द ❌";
            $farmer_label = !empty($booking['farmer_name']) ? $booking['farmer_name'] : $farmer_id;
            $fcm_body = "किसान $farmer_label ने ऑर्डर #" . ($booking['order_id'] ?? $booking_id) . " की बुकिंग रद्द कर दी है।";
            $fcm_payload = [
                'type' => 'booking_cancelled_by_farmer',
                'booking_id' => (string)$booking_id,
                'order_id' => (string)($booking['order_id'] ?? $booking_id),
                'status' => 'Cancelled'
            ];
            sendFirebaseNotification($booking['retailer_fcm_token'], $fcm_title, $fcm_body, $fcm_payload);
        } catch (Exception $e) {
            error_log("FCM notify retailer error: " . $e->getMessage());
        }
    }

    echo json_encode(['success' => true, 'message' => 'Booking cancelled successfully']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
}
?>
