<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

require_once __DIR__ . '/db_connect.php';
include 'retailer_sms_helper.php';
require_once __DIR__ . '/firebase_helper.php';

global $conn;

if (!$conn) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed internally']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['booking_id']) || !isset($data['action']) || !isset($data['retailer_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

$booking_id = $data['booking_id'];
$action = $data['action']; // 'confirm', 'cancel', or 'extend'
$retailer_id_input = $data['retailer_id'];

// 0. Resolve the correct retailer_id from retailer_info
$retailer_id_str = "";
$res_query = "SELECT retailer_id FROM retailer_info WHERE id = ? OR retailer_id = ?";
$res_stmt = $conn->prepare($res_query);
if ($res_stmt) {
    $res_stmt->bind_param("ss", $retailer_id_input, $retailer_id_input);
    $res_stmt->execute();
    $res_result = $res_stmt->get_result();
    if ($r_row = $res_result->fetch_assoc()) {
        $retailer_id_str = $r_row['retailer_id'];
    }
    $res_stmt->close();
}

if (empty($retailer_id_str)) {
    echo json_encode(["status" => "error", "message" => "Retailer not found"]);
    exit;
}

// We need to find details for this booking to update the whole group and send SMS
$order_id = "";
$farmer_id = "";
$farmer_name = "";
$farmer_mobile = "";
$farmer_fcm_token = "";
$current_booking_date = "";

// First try: Direct match
$find_query = "SELECT b.order_id, b.farmer_id, b.booking_date, f.name as farmer_name, f.mobile as farmer_mobile, f.fcm_token as farmer_fcm_token 
              FROM product_bookings b 
              LEFT JOIN farmer_info f ON b.farmer_id = f.farmer_id 
              WHERE b.id = ? AND b.retailer_id = ?";
$find_stmt = $conn->prepare($find_query);
if ($find_stmt) {
    $find_stmt->bind_param("ss", $booking_id, $retailer_id_str);
    $find_stmt->execute();
    $res = $find_stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $order_id = $row['order_id'];
        $farmer_id = $row['farmer_id'];
        $current_booking_date = $row['booking_date'];
        $farmer_name = $row['farmer_name'];
        $farmer_mobile = $row['farmer_mobile'];
        $farmer_fcm_token = $row['farmer_fcm_token'] ?? '';
    }
    $find_stmt->close();
}

// Second try: If not found, try joining with retailer_info to resolve ID mismatch
if (empty($order_id)) {
    $alt_query = "SELECT b.order_id, b.farmer_id, b.booking_date, f.name as farmer_name, f.mobile as farmer_mobile, f.fcm_token as farmer_fcm_token 
                  FROM product_bookings b 
                  JOIN farmer_info f ON b.farmer_id = f.farmer_id 
                  JOIN retailer_info r ON b.retailer_id = r.retailer_id 
                  WHERE b.id = ? AND (r.id = ? OR r.retailer_id = ?)";
    $alt_stmt = $conn->prepare($alt_query);
    if ($alt_stmt) {
        $alt_stmt->bind_param("sss", $booking_id, $retailer_id_str, $retailer_id_str);
        $alt_stmt->execute();
        $res = $alt_stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $order_id = $row['order_id'];
            $farmer_id = $row['farmer_id'];
            $current_booking_date = $row['booking_date'];
            $farmer_name = $row['farmer_name'];
            $farmer_mobile = $row['farmer_mobile'];
            $farmer_fcm_token = $row['farmer_fcm_token'] ?? '';
        }
        $alt_stmt->close();
    }
}

if (empty($order_id)) {
    echo json_encode(["status" => "error", "message" => "Booking or Order not found"]);
    exit;
}

$token_number = null;
$new_booking_date = null;

if ($action === 'confirm') {
    $new_status = 'Approved';
} else if ($action === 'cancel') {
    $new_status = 'Cancelled';
} else if ($action === 'extend') {
    $new_status = 'Extended';
    $new_booking_date = $data['new_date'] ?? date('Y-m-d', strtotime('+2 days'));
} else if ($action === 'collect') {
    $new_status = 'Collected';
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action"]);
    exit;
}

// 1. Handle stock revert for Cancel or Extend
$product_summary = "";
if ($action === 'cancel' || $action === 'extend') {
    // Fetch products and original date to revert stock
    $fetch_items = "SELECT product, quantity, booking_date FROM product_bookings WHERE order_id = ? AND retailer_id = ?";
    $f_stmt = $conn->prepare($fetch_items);
    if ($f_stmt) {
        $f_stmt->bind_param("ss", $order_id, $retailer_id_str);
        $f_stmt->execute();
        $items_res = $f_stmt->get_result();
        $items_list = [];
        while ($item = $items_res->fetch_assoc()) {
            $items_list[] = $item['quantity'] . " " . $item['product'];
            $col_map = ['urea' => 'UREA_stock', 'dap' => 'DAP_stock', 'npk' => 'NPK_stock', 'mop' => 'MOP_stock'];
            $prod_col = $col_map[strtolower($item['product'])] ?? (strtoupper($item['product']) . '_stock');
            $qty = (int) $item['quantity'];
            $old_date = $item['booking_date'];

            // 1. Increment back the stock for the original booking date
            $revert_sql = "UPDATE retailer_stock SET $prod_col = $prod_col + ? WHERE retailer_id = ? AND date = ?";
            $rev_stmt = $conn->prepare($revert_sql);
            if ($rev_stmt) {
                $rev_stmt->bind_param("iss", $qty, $retailer_id_str, $old_date);
                $rev_stmt->execute();
                $rev_stmt->close();
            }

            // 2. Deduct stock for the NEW booking date to reserve it
            if ($action === 'extend' && !empty($new_booking_date)) {
                $reserve_sql = "UPDATE retailer_stock SET $prod_col = $prod_col - ? WHERE retailer_id = ? AND date = ?";
                $res_stmt = $conn->prepare($reserve_sql);
                if ($res_stmt) {
                    $res_stmt->bind_param("iss", $qty, $retailer_id_str, $new_booking_date);
                    $res_stmt->execute();
                    $res_stmt->close();
                }
            }
        }
        $product_summary = implode(", ", $items_list);
        $f_stmt->close();
    }
} else if ($action === 'confirm' || $action === 'collect') {
    // Need summary for SMS
    $fetch_items = "SELECT product, quantity FROM product_bookings WHERE order_id = ? AND retailer_id = ?";
    $f_stmt = $conn->prepare($fetch_items);
    if ($f_stmt) {
        $f_stmt->bind_param("ss", $order_id, $retailer_id_str);
        $f_stmt->execute();
        $items_res = $f_stmt->get_result();
        $items_list = [];
        while ($item = $items_res->fetch_assoc()) {
            $items_list[] = $item['quantity'] . " " . $item['product'];
        }
        $product_summary = implode(", ", $items_list);
        $f_stmt->close();
    }
}

// 2. Generate Token if approving (Initial confirm) or Extending (New date approval)
if ($action === 'confirm' || $action === 'extend') {
    // Check for older pending bookings for this retailer
    // This ensures Farmer B cannot be approved if Farmer A is still Pending/Extended-Pending
    if ($action === 'confirm') {
        $check_older = "SELECT f.name as older_farmer, b.booking_date as older_date, b.id as older_id 
                       FROM product_bookings b
                       JOIN farmer_info f ON b.farmer_id = f.farmer_id
                       WHERE b.retailer_id = ? AND b.status = 'Pending' 
                       AND (b.booking_date < ? OR (b.booking_date = ? AND b.id < ?)) 
                       AND b.order_id != ?
                       LIMIT 1";
        $co_stmt = $conn->prepare($check_older);
        if ($co_stmt) {
            $co_stmt->bind_param("sssis", $retailer_id_str, $current_booking_date, $current_booking_date, $booking_id, $order_id);
            $co_stmt->execute();
            $older_res = $co_stmt->get_result();
            if ($older_row = $older_res->fetch_assoc()) {
                $older_name = $older_row['older_farmer'];
                $older_date = $older_row['older_date'];
                $older_id = $older_row['older_id'];
                echo json_encode([
                    "status" => "error",
                    "message" => "कतार नियम: आप इसे अप्रूव नहीं कर सकते क्योंकि '$older_name' का पुराना अनुरोध (तारीख: $older_date) अभी भी लंबित (Pending) है। (Debug: Current Date=$current_booking_date, ID=$booking_id)"
                ]);
                exit;
            }
            $co_stmt->close();
        }
    }

    // Handle item quantity updates if provided
    if (isset($data['item_updates']) && is_array($data['item_updates'])) {
        foreach ($data['item_updates'] as $update) {
            $update_id = $update['id'];
            $new_qty = (int) $update['quantity'];

            // Store original request in original_quantity if not already set, then update quantity
            $qty_update_query = "UPDATE product_bookings SET original_quantity = IF(original_quantity IS NULL, quantity, original_quantity), quantity = ? WHERE id = ? AND order_id = ? AND retailer_id = ?";
            $qty_stmt = $conn->prepare($qty_update_query);
            if ($qty_stmt) {
                $qty_stmt->bind_param("isss", $new_qty, $update_id, $order_id, $retailer_id_str);
                $qty_stmt->execute();
                $qty_stmt->close();
            }
        }
    }

    // Generate a random 6-digit token
    $token_number = "TKN-" . rand(100000, 999999);
}

// 3. Update all bookings in the same order
$set_clause = "status = ?";
$params = [$new_status];
$types = "s";

if (!empty($token_number)) {
    $set_clause .= ", token_number = ?";
    $params[] = $token_number;
    $types .= "s";
}

$cancellation_reason = "";
if ($action === 'confirm') {
    $set_clause .= ", approved_date = IF(approved_date IS NULL, NOW(), approved_date)";
} else if ($action === 'collect') {
    $set_clause .= ", collected_at = NOW()";
} else if ($action === 'cancel') {
    $cancellation_reason = isset($data['cancellation_reason']) && trim($data['cancellation_reason']) !== ''
        ? trim($data['cancellation_reason'])
        : (isset($data['reason']) && trim($data['reason']) !== '' ? trim($data['reason']) : 'दुकानदार द्वारा रद्द किया गया');

    $set_clause .= ", cancelled_at = NOW(), cancellation_reason = ?, cancelled_by = ?";
    $params[] = $cancellation_reason;
    $params[] = $retailer_id_str;
    $types .= "ss";
} else if ($action === 'extend') {
    $extension_reason = isset($data['extension_reason']) && trim($data['extension_reason']) !== ''
        ? trim($data['extension_reason'])
        : (isset($data['reason']) && trim($data['reason']) !== '' ? trim($data['reason']) : 'दुकानदार द्वारा तारीख बढ़ाई गई');

    $set_clause .= ", extended_at = NOW(), booking_date = ?, extension_reason = ?, extended_by = ?";
    $params[] = $new_booking_date;
    $params[] = $extension_reason;
    $params[] = $retailer_id_str;
    $types .= "sss";
}

// Fixed where clause to use resolved retailer_id
$update_sql = "UPDATE product_bookings SET $set_clause WHERE order_id = ? AND retailer_id = ?";
$params[] = $order_id;
$params[] = $retailer_id_str;
$types .= "ss";

$update_stmt = $conn->prepare($update_sql);

if ($update_stmt) {
    $update_stmt->bind_param($types, ...$params);

    if ($update_stmt->execute()) {
        $affected = $update_stmt->affected_rows;

        // 4. Send SMS
        if (!empty($farmer_mobile)) {
            $display_date = ($action === 'extend') ? $new_booking_date : date('Y-m-d');
            $msg = get_booking_message($action, $farmer_name, $product_summary, $display_date, $token_number ?? "");
            send_notification_sms($farmer_mobile, $msg);
        }

        // 5. Send FCM Push Notification
        if (!empty($farmer_fcm_token)) {
            try {
                if ($action === 'cancel') {
                    $fcm_title = "बुकिंग रद्द की गई ❌";
                    $fcm_body = "आपकी बुकिंग रद्द कर दी गई है। कारण: " . $cancellation_reason;
                    $fcm_payload = [
                        'type' => 'booking_cancelled',
                        'order_id' => (string)$order_id,
                        'booking_id' => (string)$booking_id,
                        'status' => 'Cancelled',
                        'reason' => (string)$cancellation_reason
                    ];
                    sendFirebaseNotification($farmer_fcm_token, $fcm_title, $fcm_body, $fcm_payload);
                } else if ($action === 'confirm') {
                    $fcm_title = "बुकिंग स्वीकृत ✅";
                    $fcm_body = "आपकी बुकिंग स्वीकृत हो गई है। टोकन नंबर: " . ($token_number ?? "");
                    $fcm_payload = [
                        'type' => 'booking_confirmed',
                        'order_id' => (string)$order_id,
                        'token' => (string)($token_number ?? ""),
                        'status' => 'Approved'
                    ];
                    sendFirebaseNotification($farmer_fcm_token, $fcm_title, $fcm_body, $fcm_payload);
                } else if ($action === 'extend') {
                    $fcm_title = "तारीख में बदलाव 📅";
                    $fcm_body = "आपकी बुकिंग की तारीख बदलकर " . ($new_booking_date ?? "") . " कर दी गई है। कारण: " . $extension_reason;
                    $fcm_payload = [
                        'type' => 'booking_extended',
                        'order_id' => (string)$order_id,
                        'new_date' => (string)($new_booking_date ?? ""),
                        'status' => 'Extended',
                        'reason' => (string)$extension_reason
                    ];
                    sendFirebaseNotification($farmer_fcm_token, $fcm_title, $fcm_body, $fcm_payload);
                } else if ($action === 'collect') {
                    $fcm_title = "उर्वरक प्राप्त हुआ 🌾";
                    $fcm_body = "आपकी खाद सफलतापूर्वक वितरित कर दी गई है।";
                    $fcm_payload = [
                        'type' => 'booking_collected',
                        'order_id' => (string)$order_id,
                        'status' => 'Collected'
                    ];
                    sendFirebaseNotification($farmer_fcm_token, $fcm_title, $fcm_body, $fcm_payload);
                }
            } catch (Exception $e) {
                error_log("FCM send error in retailer_manage_booking: " . $e->getMessage());
            }
        }

        echo json_encode([
            "status" => "success",
            "message" => "Order $action successfully",
            "token" => $token_number,
            "affected_rows" => $affected
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Update failed: " . $update_stmt->error]);
    }
    $update_stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Database prepare error: " . $conn->error]);
}

$conn->close();
?>