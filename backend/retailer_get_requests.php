<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

include 'db_connect.php';
require_once 'auto_cancel_helper.php';

if ($conn === null) {
    echo json_encode(["status" => "error", "message" => "Database connection is null!"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$retailer_id_input = $data['retailer_id'];

// 1. Fetch full retailer info and resolve ID (ensure we have the public retailer_id)
$retailer_info = null;
$retailer_query = "SELECT id, name, shop_name, retailer_id, district_name, total_bori_capacity, daily_visitor_capacity,
                  (SELECT COUNT(*) FROM farmer_info WHERE selected_retailer_id = retailer_info.retailer_id AND status = 1) as total_farmers
                   FROM retailer_info WHERE id = ? OR retailer_id = ?";
$r_stmt = $conn->prepare($retailer_query);
if ($r_stmt) {
    $r_stmt->bind_param("ss", $retailer_id_input, $retailer_id_input);
    $r_stmt->execute();
    $retailer_info = $r_stmt->get_result()->fetch_assoc();
    $r_stmt->close();
}

if (!$retailer_info) {
    echo json_encode(["status" => "error", "message" => "Retailer not found"]);
    exit;
}

// Use the public retailer_id for all lookups in farmer_info and bookings
$retailer_id_str = $retailer_info['retailer_id'];
$retailer_id_int = $retailer_info['id'];

// 2. Fetch Today's Counts Summary
$today = date('Y-m-d');
$today_summary = [
    "registrations" => ["pending" => 0, "approved" => 0, "rejected" => 0],
    "bookings" => ["pending" => 0, "approved" => 0, "cancelled" => 0, "extended" => 0, "collected" => 0]
];

// Today's Registrations
$reg_today_q = "SELECT 
    SUM(CASE WHEN status = 0 AND DATE(created_at) = '$today' THEN 1 ELSE 0 END) as p,
    SUM(CASE WHEN status = 1 AND DATE(approved_at) = '$today' THEN 1 ELSE 0 END) as a,
    SUM(CASE WHEN status = 2 AND DATE(approved_at) = '$today' THEN 1 ELSE 0 END) as r
    FROM farmer_info WHERE selected_retailer_id = ?";
$stmt = $conn->prepare($reg_today_q);
if ($stmt) {
    $stmt->bind_param("s", $retailer_id_str);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $today_summary['registrations'] = [
        "pending" => (int) ($res['p'] ?? 0),
        "approved" => (int) ($res['a'] ?? 0),
        "rejected" => (int) ($res['r'] ?? 0)
    ];
    $stmt->close();
}

// Today's Bookings
$book_today_q = "SELECT 
    SUM(CASE WHEN (status = 'Pending' OR status = 'Booked') AND DATE(created_at) = '$today' THEN 1 ELSE 0 END) as p,
    SUM(CASE WHEN (status = 'Approved' OR status = 'Confirmed') AND DATE(approved_date) = '$today' THEN 1 ELSE 0 END) as a,
    SUM(CASE WHEN status = 'Cancelled' AND DATE(cancelled_at) = '$today' THEN 1 ELSE 0 END) as c,
    SUM(CASE WHEN status = 'Extended' AND DATE(extended_at) = '$today' THEN 1 ELSE 0 END) as e,
    SUM(CASE WHEN status = 'Collected' AND DATE(collected_at) = '$today' THEN 1 ELSE 0 END) as col
    FROM product_bookings WHERE retailer_id = ?";
$stmt = $conn->prepare($book_today_q);
if ($stmt) {
    $stmt->bind_param("s", $retailer_id_str);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $today_summary['bookings'] = [
        "pending" => (int) ($res['p'] ?? 0),
        "approved" => (int) ($res['a'] ?? 0),
        "cancelled" => (int) ($res['c'] ?? 0),
        "extended" => (int) ($res['e'] ?? 0),
        "collected" => (int) ($res['col'] ?? 0)
    ];
    $stmt->close();
}

$response = [
    "status" => "success",
    "data" => [
        "retailer_info" => $retailer_info,
        "today_summary" => $today_summary,
        "registrations" => [
            "pending" => [],
            "approved" => [],
            "rejected" => []
        ],
        "bookings" => [],
        "changes" => [],
        "current_stock" => [],
        "stock_items" => []
    ]
];

// Fetch Dynamic Products from fertilizer_products (prefer retailer_image_url for UPCDC)
$prod_query = "SELECT type_id, name, nameHindi, pricePerBag, COALESCE(retailer_image_url, imageUrl) as imageUrl FROM fertilizer_products ORDER BY id ASC";
$prod_res = $conn->query($prod_query);
$dynamic_products = [];
if ($prod_res) {
    while ($pr = $prod_res->fetch_assoc()) {
        if (!empty($pr['imageUrl'])) {
            $imagePathOnly = explode('?', $pr['imageUrl'])[0];
            $localFile = __DIR__ . '/' . ltrim(str_replace('\\', '/', $imagePathOnly), '/');
            if (file_exists($localFile)) {
                $pr['imageUrl'] = $imagePathOnly . '?v=' . filemtime($localFile);
            }
        }
        $dynamic_products[] = $pr;
    }
}

// Fetch Current Stock (Using Internal ID)
// Fallback to most recent record if today's is missing
$stock_query = "SELECT * FROM retailer_stock 
                WHERE retailer_id = ? 
                ORDER BY CASE WHEN date = '$today' THEN 0 ELSE 1 END, date DESC LIMIT 1";
$st_stmt = $conn->prepare($stock_query);
$stock_row = null;
if ($st_stmt) {
    $st_stmt->bind_param("i", $retailer_id_int);
    $st_stmt->execute();
    $stock_row = $st_stmt->get_result()->fetch_assoc();
    $st_stmt->close();
}

$current_stock_map = [];
$stock_items = [];
foreach ($dynamic_products as $pr) {
    $type_key = strtolower($pr['type_id']);
    $col_name = strtoupper($pr['type_id']) . '_stock';
    $stock_val = 0;
    if ($stock_row && isset($stock_row[$col_name])) {
        $stock_val = (int)$stock_row[$col_name];
    }
    $current_stock_map[$type_key] = $stock_val;
    $stock_items[] = [
        "id" => $type_key,
        "type" => $type_key,
        "name" => $pr['name'],
        "nameHindi" => $pr['nameHindi'] ?: $pr['name'],
        "stock" => $stock_val,
        "price" => (float)$pr['pricePerBag'],
        "imageUrl" => $pr['imageUrl']
    ];
}

$total_current_stock = 0;
$enhanced_stock_items = [];
foreach ($stock_items as $item) {
    $stock_qty = (int)$item['stock'];
    $total_current_stock += $stock_qty;
    $status_str = ($stock_qty <= 0) ? 'OUT_OF_STOCK' : (($stock_qty <= 20) ? 'LOW_STOCK' : 'AVAILABLE');
    $item['status'] = $status_str;
    $item['is_out_of_stock'] = ($stock_qty <= 0);
    $enhanced_stock_items[] = $item;
}

$total_storage_capacity = (int)($retailer_info['total_bori_capacity'] ?? 0);
$utilization_percent = ($total_storage_capacity > 0) ? min(100, round(($total_current_stock / $total_storage_capacity) * 100)) : 0;

$stock_summary = [
    "total_storage_capacity" => $total_storage_capacity,
    "current_total_stock" => $total_current_stock,
    "utilization_percent" => $utilization_percent,
    "has_out_of_stock" => in_array('OUT_OF_STOCK', array_column($enhanced_stock_items, 'status'))
];

$response['data']['current_stock'] = $current_stock_map;
$response['data']['stock_items'] = $enhanced_stock_items;
$response['data']['stock_summary'] = $stock_summary;

// Calculate Dynamic Rolling Footfall Capacity for Today
$base_visitor_capacity = (int)($retailer_info['daily_visitor_capacity'] ?? 50);
if ($base_visitor_capacity <= 0) $base_visitor_capacity = 50;

$effective_capacity = $base_visitor_capacity;
$is_schedule_active = 1;
$is_holiday = 0;
$closure_reason = null;

// Fetch date-specific schedule from retailer_daily_schedule
$sched_stmt = $conn->prepare("SELECT is_active, is_holiday, custom_capacity, closure_reason FROM retailer_daily_schedule WHERE retailer_id = ? AND schedule_date = ? LIMIT 1");
if ($sched_stmt) {
    $sched_stmt->bind_param("ss", $retailer_id_str, $today);
    $sched_stmt->execute();
    $s_res = $sched_stmt->get_result()->fetch_assoc();
    if ($s_res) {
        $is_schedule_active = (int)$s_res['is_active'];
        $is_holiday = (int)$s_res['is_holiday'];
        if ($s_res['custom_capacity'] !== null && (int)$s_res['custom_capacity'] > 0) {
            $effective_capacity = (int)$s_res['custom_capacity'];
        }
        $closure_reason = $s_res['closure_reason'];
    }
    $sched_stmt->close();
}

// Active Waiting Farmers (Distinct farmers booked for today who haven't collected yet)
$active_queue_count = 0;
$active_stmt = $conn->prepare("
    SELECT COUNT(DISTINCT farmer_id) as active_count
    FROM product_bookings
    WHERE retailer_id = ?
      AND booking_date = ?
      AND status IN ('Pending', 'Approved', 'Confirmed', 'Extended', 'Booked')
");
if ($active_stmt) {
    $active_stmt->bind_param("ss", $retailer_id_str, $today);
    $active_stmt->execute();
    $a_row = $active_stmt->get_result()->fetch_assoc();
    $active_queue_count = (int)($a_row['active_count'] ?? 0);
    $active_stmt->close();
}

// Collected Farmers Today (Distinct farmers who already collected their bags)
$collected_today_count = 0;
$col_stmt = $conn->prepare("
    SELECT COUNT(DISTINCT farmer_id) as collected_count
    FROM product_bookings
    WHERE retailer_id = ?
      AND booking_date = ?
      AND status = 'Collected'
");
if ($col_stmt) {
    $col_stmt->bind_param("ss", $retailer_id_str, $today);
    $col_stmt->execute();
    $c_row = $col_stmt->get_result()->fetch_assoc();
    $collected_today_count = (int)($c_row['collected_count'] ?? 0);
    $col_stmt->close();
}

$remaining_slots = max(0, $effective_capacity - $active_queue_count);
$is_capacity_full = ($active_queue_count >= $effective_capacity) ? 1 : 0;
$effective_active = ($is_schedule_active === 1 && $is_holiday === 0 && $is_capacity_full === 0) ? 1 : 0;

$response['data']['capacity_status'] = [
    "base_capacity" => $base_visitor_capacity,
    "effective_capacity" => $effective_capacity,
    "active_queue" => $active_queue_count,
    "collected_today" => $collected_today_count,
    "remaining_slots" => $remaining_slots,
    "is_active" => $is_schedule_active,
    "is_holiday" => $is_holiday,
    "is_full" => $is_capacity_full,
    "effective_active" => $effective_active,
    "closure_reason" => $closure_reason,
    "schedule_date" => $today
];

// Auto-cancel expired bookings for THIS retailer and revert stock
autoCancelExpiredBookings($conn, $retailer_id_str, null);

// Fetch Registration Requests (Farmers who selected this retailer)
$reg_cols = "farmer_info.farmer_id as id, farmer_info.name as full_name, farmer_info.mobile as mobile_number, farmer_info.aadhaar, farmer_info.village_id as village, farmer_info.status, farmer_info.created_at, farmer_info.khatauni_number as khasra_number, farmer_info.khasra_rukba, farmer_info.aadhaar_photo, farmer_info.khatauni_photo, farmer_info.profile_photo, farmer_info.approved_at, farmer_info.approved_by, farmer_info.registry_id, farmer_info.kisan_panjikaran_number, farmer_info.rejection_reason, farmer_info.kisan_panjikaran_photo,
              (SELECT COUNT(*) FROM product_bookings WHERE farmer_id = farmer_info.farmer_id AND status != 'Cancelled') as booking_count";
$reg_query = "SELECT $reg_cols FROM farmer_info WHERE selected_retailer_id = ? ORDER BY id DESC";
$stmt = $conn->prepare($reg_query);
if ($stmt) {
    $stmt->bind_param("s", $retailer_id_str);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $created_at = isset($row['created_at']) ? strtotime($row['created_at']) : time();
        $approved_at = isset($row['approved_at']) ? strtotime($row['approved_at']) : null;
        $status_num = (int) $row['status'];
        $b_count = (int) ($row['booking_count'] ?? 0);

        $regData = [
            "id" => $row['id'],
            "name" => $row['full_name'],
            "phone" => $row['mobile_number'],
            "aadhaar" => $row['aadhaar'],
            "village" => "Village ID: " . $row['village'],
            "khatauni_no" => $row['khasra_number'] ?? "N/A",
            "land_acres" => $row['khasra_rukba'] ?? 0,
            "registry_id" => $row['registry_id'] ?? null,
            "kisan_panjikaran_number" => $row['kisan_panjikaran_number'] ?? null,
            "kisan_code" => $row['kisan_panjikaran_number'] ?? null,
            "created_at" => date('d M Y, h:i A', $created_at),
            "approved_at" => $approved_at ? date('d M Y, h:i A', $approved_at) : null,
            "approved_by" => $row['approved_by'],
            "rejection_reason" => $row['rejection_reason'] ?? null,
            "status" => $status_num,
            "aadhaar_photo" => $row['aadhaar_photo'],
            "khatauni_photo" => $row['khatauni_photo'],
            "kisan_panjikaran_photo" => $row['kisan_panjikaran_photo'] ?? null,
            "photo" => $row['profile_photo'],
            "has_bookings" => ($b_count > 0),
            "booking_count" => $b_count
        ];

        if ($status_num === 0) {
            $response['data']['registrations']['pending'][] = $regData;
        } else if ($status_num === 1) {
            $response['data']['registrations']['approved'][] = $regData;
        } else if ($status_num === 2) {
            $response['data']['registrations']['rejected'][] = $regData;
        }
    }
    $stmt->close();
}

// Fetch Booking Requests - STATIC SCHEMA CONTRACT
$columns = "b.id, f.name as full_name, f.mobile as phone, b.product as product_name, b.quantity, b.booking_date, b.status, b.order_id, b.price_per_bag, b.token_number,
            b.original_quantity, b.collected_at, b.cancelled_at, b.cancellation_reason, b.cancelled_by, b.extended_at, b.extension_reason, b.approved_date, b.created_at,
            f.khatauni_number as khasra_number, f.khasra_rukba, f.profile_photo as photo, f.registry_id, f.kisan_panjikaran_number, f.kisan_panjikaran_photo";

$book_query = "SELECT $columns
               FROM product_bookings b 
               LEFT JOIN farmer_info f ON b.farmer_id = f.farmer_id 
               WHERE b.retailer_id = ?
               ORDER BY b.booking_date DESC, b.order_id";

$stmt = $conn->prepare($book_query);
if ($stmt) {
    $stmt->bind_param("s", $retailer_id_str);
    $stmt->execute();
    $result = $stmt->get_result();

    $grouped_bookings = [];
    while ($row = $result->fetch_assoc()) {
        $oid = $row['order_id'] ?? ('order_' . $row['id']); // Fallback if no order_id

        if (!isset($grouped_bookings[$oid])) {
            $grouped_bookings[$oid] = [
                "id" => $row['id'], // Use first ID as reference
                "order_id" => $oid,
                "full_name" => $row['full_name'],
                "phone" => $row['phone'] ?? "N/A",
                "booking_date" => date('d M Y', strtotime($row['booking_date'])),
                "created_at" => isset($row['created_at']) ? date('d M Y', strtotime($row['created_at'])) : null,
                "approved_date" => isset($row['approved_date']) ? date('d M Y', strtotime($row['approved_date'])) : null,
                "cancelled_at" => isset($row['cancelled_at']) ? date('d M Y', strtotime($row['cancelled_at'])) : null,
                "extended_at" => isset($row['extended_at']) ? date('d M Y', strtotime($row['extended_at'])) : null,
                "extension_reason" => $row['extension_reason'] ?? null,
                "status" => $row['status'],
                "token_number" => $row['token_number'],
                "cancellation_reason" => $row['cancellation_reason'] ?? null,
                "cancelled_by" => $row['cancelled_by'] ?? null,
                "khatauni_no" => $row['khasra_number'] ?? "N/A",
                "land_acres" => $row['khasra_rukba'] ?? 0,
                "registry_id" => $row['registry_id'] ?? null,
                "kisan_panjikaran_number" => $row['kisan_panjikaran_number'] ?? null,
                "kisan_code" => $row['kisan_panjikaran_number'] ?? null,
                "kisan_panjikaran_photo" => $row['kisan_panjikaran_photo'] ?? null,
                "photo" => $row['photo'] ?? null,
                "collected_at" => isset($row['collected_at']) ? date('d M Y', strtotime($row['collected_at'])) : null,
                "items" => []
            ];
        }

        // Ensure cancellation_reason, extension_reason and token_number are captured if present
        if (empty($grouped_bookings[$oid]['cancellation_reason']) && !empty($row['cancellation_reason'])) {
            $grouped_bookings[$oid]['cancellation_reason'] = $row['cancellation_reason'];
        }
        if (empty($grouped_bookings[$oid]['extension_reason']) && !empty($row['extension_reason'])) {
            $grouped_bookings[$oid]['extension_reason'] = $row['extension_reason'];
        }
        if (empty($grouped_bookings[$oid]['token_number']) && !empty($row['token_number'])) {
            $grouped_bookings[$oid]['token_number'] = $row['token_number'];
        }
        if (empty($grouped_bookings[$oid]['kisan_panjikaran_number']) && !empty($row['kisan_panjikaran_number'])) {
            $grouped_bookings[$oid]['kisan_panjikaran_number'] = $row['kisan_panjikaran_number'];
            $grouped_bookings[$oid]['kisan_code'] = $row['kisan_panjikaran_number'];
        }

        $grouped_bookings[$oid]['items'][] = [
            "id" => $row['id'],
            "product_name" => $row['product_name'],
            "quantity" => $row['quantity'],
            "original_quantity" => $row['original_quantity'] ?? $row['quantity'],
            "price_per_bag" => $row['price_per_bag']
        ];
    }
    $response['data']['bookings'] = array_values($grouped_bookings);
    $stmt->close();
}

// Update response structure for categorized changes
$response['data']['changes'] = ["pending" => [], "approved" => [], "rejected" => []];

// Fetch Retailer Change Requests
$change_query = "SELECT r.id, f.name as full_name, f.mobile as mobile_number, r.reason, r.created_at, r.status, ri.name as old_retailer_name, f.khatauni_number as khasra_number, f.khasra_rukba
                     FROM retailer_change_requests r
                     JOIN farmer_info f ON r.farmer_id = f.farmer_id
                     LEFT JOIN retailer_info ri ON r.current_retailer_id = ri.retailer_id
                     WHERE r.requested_retailer_id = ?";
    $stmt = $conn->prepare($change_query);
    if ($stmt) {
        $stmt->bind_param("s", $retailer_id_str);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $status = strtolower($row['status'] ?? 'pending');
            $changeData = [
                "id" => $row['id'],
                "name" => $row['full_name'],
                "phone" => $row['mobile_number'],
                "reason" => $row['reason'],
                "previousRetailer" => $row['old_retailer_name'] ?? "N/A",
                "khatauni_no" => $row['khasra_number'] ?? "N/A",
                "land_acres" => $row['khasra_rukba'] ?? 0,
                "date" => date('d M Y', strtotime($row['created_at'])),
                "status" => $status
            ];

            if ($status === 'pending')
                $response['data']['changes']['pending'][] = $changeData;
            else if ($status === 'approved')
                $response['data']['changes']['approved'][] = $changeData;
            else if ($status === 'rejected')
                $response['data']['changes']['rejected'][] = $changeData;
        }
        $stmt->close();
    }

echo json_encode($response);
$conn->close();
?>