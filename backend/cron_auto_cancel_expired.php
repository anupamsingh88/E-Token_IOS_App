<?php
header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/auto_cancel_helper.php';

try {
    $cancelled = autoCancelExpiredBookings($conn);
    echo json_encode([
        'status' => 'success',
        'message' => "Auto-cancelled {$cancelled} expired bookings.",
        'cancelled_count' => $cancelled,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
