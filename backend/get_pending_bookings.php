<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$retailer_id = isset($input['retailer_id']) ? intval($input['retailer_id']) : (isset($_GET['retailer_id']) ? intval($_GET['retailer_id']) : 0);

if (!$retailer_id) {
    echo json_encode(['success' => false, 'message' => 'Retailer ID required']);
    exit;
}

try {
    $sql = "SELECT 
                b.id,
                b.farmer_id,
                f.name as farmer_name,
                f.mobile as farmer_mobile,
                v.name_hi as village_name,
                b.booking_date,
                b.product,
                b.quantity,
                b.status,
                b.created_at
            FROM product_bookings b
            JOIN farmer_info f ON b.farmer_id = f.farmer_id
            LEFT JOIN villages v ON f.village_id = v.id
            WHERE b.retailer_id = ? AND b.status = 'Pending'
            ORDER BY b.created_at ASC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $retailer_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $bookings[] = $row;
    }

    echo json_encode(['success' => true, 'data' => $bookings]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>