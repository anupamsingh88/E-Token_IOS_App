<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

require_once __DIR__ . '/db_connect.php';
include 'retailer_sms_helper.php';

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

// First try: Direct match
$find_query = "SELECT b.order_id, b.farmer_id, f.name as farmer_name, f.mobile as farmer_mobile 
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
        $farmer_name = $row['farmer_name'];
        $farmer_mobile = $row['farmer_mobile'];
    }
    $find_stmt->close();
}

// Second try: If not found, try joining with retailer_info to resolve ID mismatch
if (empty($order_id)) {
    $alt_query = "SELECT b.order_id, b.farmer_id, f.name as farmer_name, f.mobile as farmer_mobile 
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
            $farmer_name = $row['farmer_name'];
            $farmer_mobile = $row['farmer_mobile'];
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
            $col_map = ['urea'=>'UREA_stock','dap'=>'DAP_stock','npk'=>'NPK_stock','mop'=>'MOP_stock'];
            $prod_col = $col_map[strtolower($item['product'])] ?? (strtoupper($item['product']).'_stock');
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
        $check_older = "SELECT f.name as older_farmer 
                       FROM product_bookings b
                       JOIN farmer_info f ON b.farmer_id = f.farmer_id
                       WHERE b.retailer_id = ? AND b.status = 'Pending' AND b.id < ? AND b.order_id != ?
                       LIMIT 1";
        $co_stmt = $conn->prepare($check_older);
        if ($co_stmt) {
            $co_stmt->bind_param("sis", $retailer_id_str, $booking_id, $order_id);
            $co_stmt->execute();
            $older_res = $co_stmt->get_result();
            if ($older_row = $older_res->fetch_assoc()) {
                $older_name = $older_row['older_farmer'];
                echo json_encode([
                    "status" => "error", 
                    "message" => "कतार नियम: आप इसे अप्रूव नहीं कर सकते क्योंकि '$older_name' का पुराना अनुरोध अभी भी लंबित (Pending) है। कृपया पहले उसे हैंडल करें।"
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

if ($action === 'confirm') {
    $set_clause .= ", approved_date = IF(approved_date IS NULL, NOW(), approved_date)";
} else if ($action === 'collect') {
    $set_clause .= ", collected_at = NOW()";
} else if ($action === 'cancel') {
    $set_clause .= ", cancelled_at = NOW()";
} else if ($action === 'extend') {
    $set_clause .= ", extended_at = NOW(), booking_date = ?";
    $params[] = $new_booking_date;
    $types .= "s";
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