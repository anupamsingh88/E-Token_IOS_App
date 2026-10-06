<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if ($conn === null) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}

if (!isset($data['token_number'])) {
    echo json_encode(["status" => "error", "message" => "Token number required"]);
    exit;
}

$token = $data['token_number'] ?? '';

// Handle case where QR contains raw JSON string instead of just the token
$decoded = json_decode($token, true);
if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
    // Priority: 'token' key, then 'id', then 'order_id'
    $token = $decoded['token'] ?? $decoded['id'] ?? $token;
}

$token = trim($token);
$retailer_id = $data['retailer_id'] ?? '';

if (empty($retailer_id)) {
    echo json_encode(["status" => "error", "message" => "Retailer ID is required for verification"]);
    exit;
}

// 1. Fetch Booking and Farmer Details - Verified for this specific retailer
$query = "SELECT b.id, b.order_id, b.farmer_id, b.product, b.quantity, b.status, b.token_number, b.booking_date, b.collected_at,
                 f.name as farmer_name, f.mobile as farmer_mobile, f.aadhaar, f.khatauni_number, f.khasra_rukba, f.farmer_id as f_id, f.profile_photo as photo
          FROM product_bookings b
          JOIN farmer_info f ON b.farmer_id = f.farmer_id
          WHERE (b.token_number = ? OR b.order_id = ?) 
          AND (b.retailer_id = ? OR b.retailer_id IN (SELECT retailer_id FROM retailer_info WHERE id = ?))
          AND (b.status = 'Approved' OR b.status = 'Confirmed' OR b.status = 'Collected' OR b.status = 'Extended')";

$stmt = $conn->prepare($query);
if ($stmt) {
    $stmt->bind_param("ssss", $token, $token, $retailer_id, $retailer_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $booking_details = [];
    $farmer_info = null;
    $order_id = "";
    $farmer_id = "";

    while ($row = $result->fetch_assoc()) {
        if (!$farmer_info) {
            $farmer_id = $row['f_id'] ?? $row['farmer_id'];
            $order_id = $row['order_id'];
            $farmer_info = [
                "name" => $row['farmer_name'],
                "mobile" => $row['farmer_mobile'],
                "aadhaar" => $row['aadhaar'],
                "khatauni_no" => $row['khatauni_number'],
                "land_acres" => $row['khasra_rukba'],
                "farmer_id" => $farmer_id,
                "photo" => $row['photo'],
                "booking_date" => $row['booking_date'],
                "collected_at" => $row['collected_at']
            ];
        }
        $booking_details[] = [
            "id" => $row['id'],
            "product" => $row['product'],
            "quantity" => $row['quantity'],
            "status" => $row['status']
        ];
    }
    $stmt->close();

    if (!$farmer_info) {
        echo json_encode(["status" => "error", "message" => "No booking found for this token"]);
        exit;
    }

    // 2. Calculate Quota
    // Logic: 
    // Allowed: 5 bags per acre (example)
    // Used: SUM of all collected items for this farmer
    $land = (float) ($farmer_info['land_acres'] ?? 0);
    $total_allowed = floor($land * 5); // Example multiplier

    $used_query = "SELECT SUM(quantity) as used FROM product_bookings WHERE farmer_id = ? AND status = 'Collected'";
    $used_stmt = $conn->prepare($used_query);
    $used_bags = 0;
    if ($used_stmt) {
        $used_stmt->bind_param("s", $farmer_id);
        $used_stmt->execute();
        $res = $used_stmt->get_result();
        if ($row = $res->fetch_assoc()) {
            $used_bags = (int) ($row['used'] ?? 0);
        }
        $used_stmt->close();
    }

    echo json_encode([
        "status" => "success",
        "data" => [
            "booking" => [
                "order_id" => $order_id,
                "items" => $booking_details
            ],
            "farmer" => $farmer_info,
            "quota" => [
                "total" => $total_allowed,
                "used" => $used_bags,
                "remaining" => max(0, $total_allowed - $used_bags)
            ]
        ]
    ]);

} else {
    echo json_encode(["status" => "error", "message" => "Database error"]);
}

if ($conn) {
    $conn->close();
}
?>