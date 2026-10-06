<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db_connect.php';

// Inputs: booking_id, new_date
$data = json_decode(file_get_contents('php://input'), true);

$booking_id = isset($data['booking_id']) ? intval($data['booking_id']) : 0;
$new_date = isset($data['new_date']) ? $data['new_date'] : '';

if (!$booking_id || !$new_date) {
    echo json_encode(['success' => false, 'message' => 'Missing booking ID or new date']);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Get current booking details
    $stmt = $conn->prepare("SELECT retailer_id, product, quantity, booking_date, status FROM product_bookings WHERE id = ?");
    $stmt->bind_param("i", $booking_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) throw new Exception("Booking not found");
    $booking = $res->fetch_assoc();

    if ($booking['status'] !== 'Booked') {
        throw new Exception("Only active bookings can be rescheduled");
    }

    $retailer_id = $booking['retailer_id'];
    $product = $booking['product'];
    $qty = $booking['quantity'];
    $old_date = $booking['booking_date'];

    if ($old_date === $new_date) {
        throw new Exception("New date is same as current date");
    }

    // 2. Check Stock for NEW DATE
    // Get stock for new date. If not found, get latest stock logic?
    // Reuse logic: We need to ensure retailer has enough stock on the new date.
    // However, since we are moving stock, we are essentially returning stock to OLD date and taking from NEW date.
    
    // Check available stock on new date
    $col_map = ['urea'=>'UREA_stock','dap'=>'DAP_stock','npk'=>'NPK_stock','mop'=>'MOP_stock'];
    $col_name = $col_map[strtolower($product)] ?? (strtoupper($product).'_stock');
    
    // First, check if stock record exists for new date
    $check_stmt = $conn->prepare("SELECT $col_name FROM retailer_stock WHERE retailer_id = ? AND date = ?");
    $check_stmt->bind_param("is", $retailer_id, $new_date);
    $check_stmt->execute();
    $check_res = $check_stmt->get_result();
    
    // If no record for new date, we might need to create it based on latest, OR for now, assume we can't book if explicitly no stock record.
    // BUT, based on previous fix, we want "carry over". 
    // Implementing carry over logic here is complex (creating a row). 
    // Strategy: If no row exists, we INSERT a new row for that date copying from the latest previous date.
    
    if ($check_res->num_rows === 0) {
        // Find latest stock
        $lat_stmt = $conn->prepare("SELECT UREA_stock, DAP_stock, NPK_stock, MOP_stock FROM retailer_stock WHERE retailer_id = ? AND date < ? ORDER BY date DESC LIMIT 1");
        $lat_stmt->bind_param("is", $retailer_id, $new_date);
        $lat_stmt->execute();
        $lat_res = $lat_stmt->get_result();
        
        if ($lat_row = $lat_res->fetch_assoc()) {
            // Insert new row for new_date
            $ins_stock = $conn->prepare("INSERT INTO retailer_stock (retailer_id, date, UREA_stock, DAP_stock, NPK_stock, MOP_stock) VALUES (?, ?, ?, ?, ?, ?)");
            $ins_stock->bind_param("isiiii", $retailer_id, $new_date, $lat_row['UREA_stock'], $lat_row['DAP_stock'], $lat_row['NPK_stock'], $lat_row['MOP_stock']);
            $ins_stock->execute();
            // Now we have stock
        } else {
            throw new Exception("No stock history found for this retailer to carry forward.");
        }
    }
    
    // Now re-fetch/updated check
    $check_stmt->execute();
    $avail_stock = $check_stmt->get_result()->fetch_assoc()[$col_name];
    
    if ($avail_stock < $qty) {
        throw new Exception("Insufficient stock on new date ($new_date). Available: $avail_stock, Required: $qty");
    }

    // 3. Update Stocks
    // A. Add back to OLD date (if we want to be precise, yes. If no record for old date? unlikely as it was booked)
    // Actually, if we just cancel and re-book.
    // Refund Old Stock
    $refund_stmt = $conn->prepare("UPDATE retailer_stock SET $col_name = $col_name + ? WHERE retailer_id = ? AND date = ?");
    $refund_stmt->bind_param("iis", $qty, $retailer_id, $old_date);
    $refund_stmt->execute();
    
    // Deduct New Stock
    $deduct_stmt = $conn->prepare("UPDATE retailer_stock SET $col_name = $col_name - ? WHERE retailer_id = ? AND date = ?");
    $deduct_stmt->bind_param("iis", $qty, $retailer_id, $new_date);
    $deduct_stmt->execute();

    // 4. Update Booking
    $up_bk_stmt = $conn->prepare("UPDATE product_bookings SET booking_date = ?, created_at = NOW() WHERE id = ?");
    $up_bk_stmt->bind_param("si", $new_date, $booking_id);
    $up_bk_stmt->execute();

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Rescheduled successfully']);

} catch (Exception $e) {
    if ($conn->errno) $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
