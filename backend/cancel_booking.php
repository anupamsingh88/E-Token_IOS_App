<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

require_once 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);
$booking_id = isset($data['booking_id']) ? intval($data['booking_id']) : 0;
$farmer_id  = isset($data['farmer_id'])  ? $data['farmer_id']           : '';

if (!$booking_id || !$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'booking_id and farmer_id are required']);
    exit;
}

try {
    // Verify booking belongs to this farmer and is still Pending
    $check = $pdo->prepare("SELECT id, status, booking_date FROM product_bookings WHERE id = ? AND farmer_id = ?");
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

    echo json_encode(['success' => true, 'message' => 'Booking cancelled successfully']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
}
?>
