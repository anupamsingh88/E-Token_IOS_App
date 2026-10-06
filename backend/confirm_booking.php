<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$booking_id = isset($data['booking_id']) ? intval($data['booking_id']) : 0;
$retailer_id = isset($data['retailer_id']) ? $data['retailer_id'] : '';
$token = isset($data['token']) ? $data['token'] : '';

if (!$booking_id || !$retailer_id || !$token) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields: booking_id, retailer_id, token']);
    exit;
}

$conn->begin_transaction();

try {
    // Get booking details
    $stmt = $conn->prepare("SELECT retailer_id, status, token_number FROM product_bookings WHERE id = ?");
    $stmt->bind_param("i", $booking_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        throw new Exception("Booking not found");
    }

    $booking = $res->fetch_assoc();

    // Verification Checks
    if ($booking['retailer_id'] !== $retailer_id) {
        throw new Exception("Unauthorized: This booking belongs to a different retailer.");
    }

    if ($booking['status'] !== 'Booked') {
        throw new Exception("Invalid status for collection. Current status: " . $booking['status']);
    }

    if ($booking['token_number'] !== $token) {
        throw new Exception("Invalid Token Number.");
    }

    // Confirm Booking
    $upd_stmt = $conn->prepare("UPDATE product_bookings SET status = 'Collected', confirmation_date = CURRENT_TIMESTAMP WHERE id = ?");
    $upd_stmt->bind_param("i", $booking_id);

    if (!$upd_stmt->execute()) {
        throw new Exception("Failed to confirm booking");
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Booking Successfully Collected and Confirmed.']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
