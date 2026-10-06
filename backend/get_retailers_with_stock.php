<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db_connect.php';

try {
// Inputs
$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$district_id = isset($_GET['district_id']) ? intval($_GET['district_id']) : 0;

// Base Query to get retailers
// Join with retailer_daily_stock to get stock for the specific date
    // Simplified query removing retailer_daily_stock
    $sql = "SELECT 
                r.id, 
                r.name, 
                r.shop_name, 
                r.mobile, 
                r.address, 
                r.district_id, 
                d.name_en as district_name
            FROM retailer_info r
            LEFT JOIN districts d ON r.district_id = d.id
            WHERE 1=1";

    $params = [];
    $types = "";

    if ($district_id > 0) {
        $sql .= " AND r.district_id = ?";
        $params[] = $district_id;
        $types .= "i";
    }

    if (!empty($params)) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql);
    }
    // retailers array
    $retailers = [];
    while ($row = $result->fetch_assoc()) {
        $retailers[] = [
            'id' => $row['id'], 
            'name' => $row['name'],
            'shopName' => $row['shop_name'],
            'mobileNumber' => $row['mobile'],
            'address' => $row['address'],
            'district' => $row['district_name'],
            'stock' => [
                'urea' => 0,
                'dap' => 0,
                'npk' => 0,
                'mop' => 0,
                'last_updated' => null
            ],
            'isAvailable' => true
        ];
    }

    echo json_encode(['success' => true, 'data' => $retailers]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
