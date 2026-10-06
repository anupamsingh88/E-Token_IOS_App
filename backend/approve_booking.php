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
$action = isset($data['action']) ? $data['action'] : ''; // 'Approve' or 'Reject'

if (!$booking_id || !in_array($action, ['Approve', 'Reject'])) {
    echo json_encode(['success' => false, 'message' => 'Missing or invalid fields']);
    exit;
}

$conn->begin_transaction();

try {
    // Get booking details including order_id
    $stmt = $conn->prepare("SELECT retailer_id, booking_date, product, quantity, status, order_id FROM product_bookings WHERE id = ?");
    $stmt->bind_param("i", $booking_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        throw new Exception("Booking not found");
    }

    $booking = $res->fetch_assoc();
    $order_id = $booking['order_id'];

    if ($booking['status'] !== 'Pending') {
        throw new Exception("Only pending bookings can be approved or rejected.");
    }

    if ($action === 'Approve') {
        // Generate Token
        // For multi-item, we use 'MIX' or the first product's first letter
        $token_prefix = $order_id ? 'T' : strtoupper(substr($booking['product'], 0, 1));
        $token = $token_prefix . rand(1000, 9999);

        if ($order_id) {
            // Approve all items in this order
            $upd_stmt = $conn->prepare("UPDATE product_bookings SET status = 'Booked', token_number = ?, approval_date = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'Pending'");
            $upd_stmt->bind_param("ss", $token, $order_id);
        } else {
            // Legacy single item approval
            $upd_stmt = $conn->prepare("UPDATE product_bookings SET status = 'Booked', token_number = ?, approval_date = CURRENT_TIMESTAMP WHERE id = ?");
            $upd_stmt->bind_param("si", $token, $booking_id);
        }

        if (!$upd_stmt->execute()) {
            throw new Exception("Failed to approve booking(s)");
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Booking Approved', 'token' => $token, 'order_id' => $order_id]);

    } else if ($action === 'Reject') {
        if ($order_id) {
            // Get all items in this order to refund stock
            $items_stmt = $conn->prepare("SELECT product, quantity FROM product_bookings WHERE order_id = ? AND status = 'Pending'");
            $items_stmt->bind_param("s", $order_id);
            $items_stmt->execute();
            $items_res = $items_stmt->get_result();

            while ($item = $items_res->fetch_assoc()) {
                $col_map = ['urea'=>'UREA_stock','dap'=>'DAP_stock','npk'=>'NPK_stock','mop'=>'MOP_stock'];
                $col_name = $col_map[strtolower($item['product'])] ?? (strtoupper($item['product']).'_stock');
                $ref_stock = $conn->prepare("UPDATE retailer_stock SET {$col_name} = {$col_name} + ? WHERE retailer_id = ? AND date = ?");
                $ref_stock->bind_param("iis", $item['quantity'], $booking['retailer_id'], $booking['booking_date']);
                $ref_stock->execute();
            }

            // Reject all items
            $upd_stmt = $conn->prepare("UPDATE product_bookings SET status = 'Cancelled' WHERE order_id = ? AND status = 'Pending'");
            $upd_stmt->bind_param("s", $order_id);
        } else {
            // Legacy single item rejection
            $upd_stmt = $conn->prepare("UPDATE product_bookings SET status = 'Cancelled' WHERE id = ?");
            $upd_stmt->bind_param("i", $booking_id);
            
            // Refund Stock for the single item
            $col_map = ['urea'=>'UREA_stock','dap'=>'DAP_stock','npk'=>'NPK_stock','mop'=>'MOP_stock'];
            $col_name = $col_map[strtolower($booking['product'])] ?? (strtoupper($booking['product']).'_stock');
            $ref_stock = $conn->prepare("UPDATE retailer_stock SET {$col_name} = {$col_name} + ? WHERE retailer_id = ? AND date = ?");
            $ref_stock->bind_param("iis", $booking['quantity'], $booking['retailer_id'], $booking['booking_date']);
            $ref_stock->execute();
        }

        if (!$upd_stmt->execute()) {
            throw new Exception("Failed to reject booking(s)");
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Booking Rejected and stock refunded']);
    }

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>