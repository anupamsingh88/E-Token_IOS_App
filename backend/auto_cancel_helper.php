<?php
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/firebase_helper.php';

/**
 * Auto-cancels expired bookings whose scheduled date (booking_date) has passed (booking_date < today):
 * 
 * 1. Pending/Booked (unapproved) bookings:
 *    When scheduled date passes and retailer did not approve the booking request.
 *    - Reason: "निर्धारित तारीख (DD-MM-YYYY) तक अप्रूव नहीं हुआ - सिस्टम द्वारा स्वतः रद्द"
 *    - cancelled_by: "SYSTEM_AUTO"
 *    - Note: No stock revert needed because stock is never deducted for pending bookings.
 * 
 * 2. Approved/Confirmed/Extended bookings:
 *    When scheduled date passes and farmer did not show up to collect fertilizer.
 *    - Reason: "निर्धारित तारीख (DD-MM-YYYY) पर किसान के न पहुँचने के कारण सिस्टम द्वारा स्वतः रद्द"
 *    - cancelled_by: "SYSTEM_AUTO"
 *    - Reverts stock to retailer_stock.
 *
 * Sends FCM push notification to farmer for all auto-cancelled bookings.
 *
 * @param mysqli $conn
 * @param string|null $retailer_id Optional filter for a specific retailer
 * @param string|null $farmer_id Optional filter for a specific farmer
 * @return int Number of booking items cancelled
 */
function autoCancelExpiredBookings($conn, $retailer_id = null, $farmer_id = null) {
    if (!$conn) {
        return 0;
    }

    $today = date('Y-m-d');

    // 1. Fetch expired active bookings
    // Both Approved/Extended (uncollected) and Pending/Booked (unapproved) where booking_date < today
    $sql = "SELECT b.id, b.order_id, b.farmer_id, b.retailer_id, b.product, b.quantity, b.booking_date, b.status,
                   f.fcm_token as farmer_fcm_token
            FROM product_bookings b
            LEFT JOIN farmer_info f ON b.farmer_id = f.farmer_id
            WHERE b.booking_date < ?
              AND b.status IN ('Pending', 'Booked', 'Approved', 'Confirmed', 'Extended')";

    $params = [$today];
    $types = "s";

    if (!empty($retailer_id)) {
        $sql .= " AND (b.retailer_id = ? OR b.retailer_id IN (SELECT retailer_id FROM retailer_info WHERE id = ?))";
        $params[] = (string)$retailer_id;
        $params[] = (string)$retailer_id;
        $types .= "ss";
    }

    if (!empty($farmer_id)) {
        $sql .= " AND b.farmer_id = ?";
        $params[] = (string)$farmer_id;
        $types .= "s";
    }

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res = $stmt->get_result();

    $expired_rows = [];
    while ($row = $res->fetch_assoc()) {
        $expired_rows[] = $row;
    }
    $stmt->close();

    if (empty($expired_rows)) {
        return 0;
    }

    // 2. Separate bookings: Pending vs Approved/Extended (stock revert only for approved)
    $col_map = ['urea' => 'UREA_stock', 'dap' => 'DAP_stock', 'npk' => 'NPK_stock', 'mop' => 'MOP_stock'];
    $stock_increments = [];
    $approved_ids = [];
    $pending_ids = [];
    $orders_to_notify = []; // order_id => [farmer_fcm_token, booking_date, id, status]

    foreach ($expired_rows as $row) {
        $bid = (int)$row['id'];
        $status = $row['status'];
        $ret_id = (string)$row['retailer_id'];
        $bdate = $row['booking_date'];
        $prod = strtolower($row['product']);
        $qty = (int)$row['quantity'];

        if (in_array($status, ['Approved', 'Confirmed', 'Extended'])) {
            $approved_ids[] = $bid;

            $col = $col_map[$prod] ?? (strtoupper($prod) . '_stock');
            $key = "{$ret_id}|{$bdate}|{$col}";
            if (!isset($stock_increments[$key])) {
                $stock_increments[$key] = [
                    'retailer_id' => $ret_id,
                    'date' => $bdate,
                    'col' => $col,
                    'qty' => 0
                ];
            }
            $stock_increments[$key]['qty'] += $qty;
        } else {
            // Pending or unapproved Booked
            $pending_ids[] = $bid;
        }

        $oid = $row['order_id'] ?: ('ORD_' . $bid);
        if (!empty($row['farmer_fcm_token']) && !isset($orders_to_notify[$oid])) {
            $orders_to_notify[$oid] = [
                'fcm_token' => $row['farmer_fcm_token'],
                'booking_date' => $bdate,
                'booking_id' => $bid,
                'status' => $status
            ];
        }
    }

    // 3. Revert stock in batches (ONLY for Approved/Confirmed/Extended bookings)
    foreach ($stock_increments as $item) {
        $ret_id = $item['retailer_id'];
        $bdate = $item['date'];
        $col = $item['col'];
        $qty = $item['qty'];

        $upd_stock = $conn->prepare("UPDATE retailer_stock SET $col = $col + ? WHERE retailer_id = ? AND date = ?");
        if ($upd_stock) {
            $upd_stock->bind_param("iss", $qty, $ret_id, $bdate);
            $upd_stock->execute();
            $upd_stock->close();
        }
    }

    $total_cancelled = 0;

    // 4. Update Approved/Extended bookings: Cancelled due to farmer not showing up on scheduled date
    if (!empty($approved_ids)) {
        $approved_chunks = array_chunk($approved_ids, 500);
        foreach ($approved_chunks as $chunk) {
            $id_list = implode(',', $chunk);
            $update_sql = "UPDATE product_bookings 
                           SET status = 'Cancelled', 
                               cancelled_at = NOW(), 
                               cancellation_reason = CONCAT('निर्धारित तारीख (', DATE_FORMAT(booking_date, '%d-%m-%Y'), ') पर किसान के न पहुँचने के कारण सिस्टम द्वारा स्वतः रद्द'), 
                               cancelled_by = 'SYSTEM_AUTO' 
                           WHERE id IN ($id_list)";
            if ($conn->query($update_sql)) {
                $total_cancelled += count($chunk);
            }
        }
    }

    // 5. Update Pending bookings: Cancelled due to not being approved by scheduled date
    if (!empty($pending_ids)) {
        $pending_chunks = array_chunk($pending_ids, 500);
        foreach ($pending_chunks as $chunk) {
            $id_list = implode(',', $chunk);
            $update_sql = "UPDATE product_bookings 
                           SET status = 'Cancelled', 
                               cancelled_at = NOW(), 
                               cancellation_reason = CONCAT('निर्धारित तारीख (', DATE_FORMAT(booking_date, '%d-%m-%Y'), ') तक अप्रूव नहीं हुआ - सिस्टम द्वारा स्वतः रद्द'), 
                               cancelled_by = 'SYSTEM_AUTO' 
                           WHERE id IN ($id_list)";
            if ($conn->query($update_sql)) {
                $total_cancelled += count($chunk);
            }
        }
    }

    // 6. Send FCM Push Notifications for auto-cancelled bookings
    $notify_count = 0;
    foreach ($orders_to_notify as $oid => $info) {
        if ($notify_count >= 25) break;
        $formatted_date = date('d-m-Y', strtotime($info['booking_date']));
        $is_pending = in_array($info['status'], ['Pending', 'Booked']);

        if ($is_pending) {
            $fcm_title = "🚫 अनुरोध स्वतः रद्द: #$oid";
            $fcm_body = "निर्धारित तारीख ($formatted_date) तक अप्रूव न होने के कारण आपकी बुकिंग सिस्टम द्वारा स्वतः रद्द हुई है।";
            $reason = "निर्धारित तारीख ($formatted_date) तक अप्रूव नहीं हुआ - सिस्टम द्वारा स्वतः रद्द";
        } else {
            $fcm_title = "🚫 बुकिंग स्वतः रद्द: #$oid";
            $fcm_body = "निर्धारित तारीख ($formatted_date) पर न पहुँचने के कारण आपकी खाद बुकिंग सिस्टम द्वारा स्वतः रद्द हुई है।";
            $reason = "निर्धारित तारीख ($formatted_date) पर किसान के न पहुँचने के कारण सिस्टम द्वारा स्वतः रद्द";
        }

        try {
            $fcm_payload = [
                'type' => 'booking_cancelled',
                'order_id' => (string)$oid,
                'booking_id' => (string)$info['booking_id'],
                'status' => 'Cancelled',
                'cancelled_by' => 'SYSTEM_AUTO',
                'reason' => (string)$reason
            ];
            sendFirebaseNotification($info['fcm_token'], $fcm_title, $fcm_body, $fcm_payload);
            $notify_count++;
        } catch (Exception $e) {
            // Ignore push failure
        }
    }

    return $total_cancelled;
}
?>