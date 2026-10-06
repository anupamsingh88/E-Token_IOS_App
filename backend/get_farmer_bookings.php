<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$farmer_id = isset($input['farmer_id']) ? $input['farmer_id'] : (isset($_GET['farmer_id']) ? $_GET['farmer_id'] : '');

if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'Farmer ID required']);
    exit;
}

try {
    $sql = "SELECT 
                b.id,
                b.booking_date,
                b.product,
                b.quantity,
                b.price_per_bag,
                b.status,
                b.token_number,
                b.order_id,
                b.created_at,
                b.retailer_name as stored_retailer_name,
                COALESCE(r.name, b.retailer_name) as retailer_name,
                COALESCE(r.shop_name, b.retailer_name) as shop_name,
                COALESCE(r.address, '') as retailer_address,
                COALESCE(f.district_id, '') as district_id,
                r.mobile as retailer_mobile
            FROM product_bookings b
            LEFT JOIN retailer_info r ON b.retailer_id = r.retailer_id
            LEFT JOIN farmer_info f ON b.farmer_id = f.farmer_id
            WHERE b.farmer_id = ?
            ORDER BY b.booking_date DESC, b.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $farmer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $raw_bookings = [];
    while ($row = $result->fetch_assoc()) {
        $raw_bookings[] = $row;
    }

    // Grouping logic
    $grouped = [];
    foreach ($raw_bookings as $row) {
        $group_key = $row['order_id'] ?: 'SINGLE_' . $row['id'];
        
        if (!isset($grouped[$group_key])) {
            $grouped[$group_key] = [
                'id' => $row['id'], // Main ID for legacy compat
                'order_id' => $row['order_id'],
                'booking_date' => $row['booking_date'],
                'status' => $row['status'],
                'token_number' => $row['token_number'],
                'created_at' => $row['created_at'],
                'retailer_name' => $row['retailer_name'],
                'shop_name' => $row['shop_name'],
                'retailer_address' => $row['retailer_address'],
                'retailer_mobile' => $row['retailer_mobile'],
                'items' => []
            ];
        }
        
        $grouped[$group_key]['items'][] = [
            'id' => $row['id'],
            'product' => $row['product'],
            'quantity' => $row['quantity'],
            'price_per_bag' => $row['price_per_bag']
        ];
    }
    
    // Add total_price to each group
    foreach ($grouped as $key => &$group) {
        $total = 0;
        foreach ($group['items'] as $item) {
            $total += (floatval($item['price_per_bag']) * intval($item['quantity']));
        }
        $group['total_price'] = $total;
    }
    unset($group);

    echo json_encode(['success' => true, 'data' => array_values($grouped)]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
