<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db_connect.php';

// Get input
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$farmer_id = isset($data['farmer_id']) ? $data['farmer_id'] : '';
$retailer_id = isset($data['retailer_id']) ? $data['retailer_id'] : '';
$booking_date = isset($data['booking_date']) ? $data['booking_date'] : '';
$retailer_name = isset($data['retailer_name']) ? $data['retailer_name'] : '';
$items = isset($data['items']) ? $data['items'] : [];

if (!$farmer_id || !$retailer_id || !$booking_date || empty($items)) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

// Start Transaction
$conn->begin_transaction();

try {
    // A. Check for Daily Limit (3 bookings per day)
    $day_stmt = $conn->prepare("SELECT COUNT(DISTINCT CASE WHEN order_id IS NULL THEN id ELSE order_id END) as daily_count FROM product_bookings WHERE farmer_id = ? AND booking_date = ? AND status != 'Cancelled'");
    $day_stmt->bind_param("ss", $farmer_id, $booking_date);
    $day_stmt->execute();
    $daily_count = intval($day_stmt->get_result()->fetch_assoc()['daily_count']);
    
    if ($daily_count >= 3) {
        throw new Exception("You have reached the maximum limit of 3 bookings for this day.");
    }

    // B. Check for Pending Limit (3 pending bookings at a time)
    $pend_stmt = $conn->prepare("SELECT COUNT(DISTINCT CASE WHEN order_id IS NULL THEN id ELSE order_id END) as pending_count FROM product_bookings WHERE farmer_id = ? AND status = 'Pending'");
    $pend_stmt->bind_param("s", $farmer_id);
    $pend_stmt->execute();
    $pending_count = intval($pend_stmt->get_result()->fetch_assoc()['pending_count']);

    if ($pending_count >= 3) {
        throw new Exception("You already have 3 pending bookings. Please wait for approval or cancel them before making a new booking.");
    }

    // 1. Get Farmer Land Area (for quota calc)
    $stmt = $conn->prepare("SELECT khasra_rukba FROM farmer_info WHERE farmer_id = ?");
    $stmt->bind_param("s", $farmer_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0)
        throw new Exception("Farmer not found");
    $land_area = floatval($res->fetch_assoc()['khasra_rukba']);

    // 2. Get Limits
    // Assume Season is Rabi for now (or fetch from settings)
    $season = 'Rabi';
    $limits = [];
    $l_stmt = $conn->prepare("SELECT fertilizer_type, limit_per_hectare FROM fertilizer_limits WHERE season = ?");
    $l_stmt->bind_param("s", $season);
    $l_stmt->execute();
    $l_res = $l_stmt->get_result();
    while ($row = $l_res->fetch_assoc()) {
        $limits[$row['fertilizer_type']] = floatval($row['limit_per_hectare']);
    }

    // 3. Validate Each Item
    $bookings_to_insert = [];
    $total_tokens = [];

    foreach ($items as $item) {
        $product = $item['product']; // Urea, DAP, etc.
        $qty = intval($item['quantity']);
        $price = intval($item['price'] ?? 0); // Price per bag at time of booking

        if ($qty <= 0)
            continue;

        // A. Validate Quota
        $limit_per_ha = isset($limits[$product]) ? $limits[$product] : 0;
        $max_allowed = floor($land_area * $limit_per_ha);

        // Get already booked qty
        $used_stmt = $conn->prepare("SELECT SUM(quantity) as used FROM product_bookings WHERE farmer_id = ? AND product = ? AND status != 'Cancelled'");
        $used_stmt->bind_param("ss", $farmer_id, $product);
        $used_stmt->execute();
        $used_qty = intval($used_stmt->get_result()->fetch_assoc()['used']);

        if (($used_qty + $qty) > $max_allowed) {
            throw new Exception("Quota exceeded for $product. Max: $max_allowed, Used: $used_qty, Requested: $qty");
        }

        // B. Stock check removed as per user request (retailer_daily_stock not needed)

        $token = null;

        $bookings_to_insert[] = [
            'product' => $product,
            'quantity' => $qty,
            'price' => $price,
            'token' => $token
        ];

        $total_tokens[] = $token;
    }

    // 4. Generate Order ID for grouping
    $order_id = 'ORD' . date('ymd') . strtoupper(substr(uniqid(), -4));

    // 5. Insert Bookings as 'Pending'
    $ins_stmt = $conn->prepare("INSERT INTO product_bookings (retailer_id, retailer_name, farmer_id, order_id, booking_date, product, quantity, price_per_bag, status, token_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)");

    foreach ($bookings_to_insert as $b) {
        $ins_stmt->bind_param("ssssssiis", $retailer_id, $retailer_name, $farmer_id, $order_id, $booking_date, $b['product'], $b['quantity'], $b['price'], $b['token']);
        if (!$ins_stmt->execute()) {
            throw new Exception("Database Error: " . $conn->error);
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Request Pending Approval']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>