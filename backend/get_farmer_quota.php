<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$farmer_id = isset($data['farmer_id']) ? trim($data['farmer_id']) : '';
$season = isset($data['season']) ? $data['season'] : null;
$current_year = date('Y');

if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'किसान ID आवश्यक है']);
    exit;
}

try {
    // Get current season if not provided
    if (!$season) {
        $stmt = $conn->prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'current_season'");
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $season = $row['setting_value'];
        } else {
            $season = 'Rabi'; // Default
        }
    }

    // Get farmer's land area and pre-selected retailer
    $stmt = $conn->prepare("
        SELECT f.name, f.khasra_rukba, f.selected_retailer_id, f.selected_retailer_name,
               f.district_id, f.tehsil_id, f.block_id, f.village_id,
               r.name as r_name, r.shop_name as r_shop, r.address as r_address
        FROM farmer_info f
        LEFT JOIN retailer_info r ON (f.selected_retailer_id = r.id OR f.selected_retailer_id = r.retailer_id OR f.selected_retailer_id = r.name OR f.selected_retailer_id = r.shop_name)
        WHERE f.farmer_id = ?
    ");
    $stmt->bind_param("s", $farmer_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'किसान नहीं मिला']);
        exit;
    }

    $farmer = $result->fetch_assoc();
    $land_area = floatval($farmer['khasra_rukba']);

    // Get seasonal limits from fertilizer_limits table
    $stmt = $conn->prepare("SELECT fertilizer_type, limit_per_hectare FROM fertilizer_limits WHERE season = ?");
    $stmt->bind_param("s", $season);
    $stmt->execute();
    $limits_result = $stmt->get_result();

    $limits = [];
    while ($row = $limits_result->fetch_assoc()) {
        $limits[$row['fertilizer_type']] = floatval($row['limit_per_hectare']);
    }

    // Fallback defaults if no limits found
    if (empty($limits)) {
        $limits = ['Urea' => 3.0, 'DAP' => 2.0, 'NPK' => 1.0, 'MOP' => 1.0];
    }

    $fertilizers = [];
    $fertilizer_types = ['Urea', 'DAP', 'NPK', 'MOP'];

    $fertilizer_names = [
        'Urea' => ['name' => 'Urea', 'nameHindi' => 'यूरिया', 'type' => 'urea'],
        'DAP' => ['name' => 'DAP', 'nameHindi' => 'डीएपी', 'type' => 'dap'],
        'NPK' => ['name' => 'NPK', 'nameHindi' => 'एनपीके', 'type' => 'npk'],
        'MOP' => ['name' => 'MOP', 'nameHindi' => 'एमओपी', 'type' => 'mop']
    ];

    // Get fertilizer prices
    $stmt = $conn->prepare("SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE '%_price'");
    $stmt->execute();
    $price_result = $stmt->get_result();
    $prices = [];
    while ($row = $price_result->fetch_assoc()) {
        $type = str_replace('_price', '', $row['setting_key']);
        $prices[$type] = intval($row['setting_value']);
    }

    foreach ($fertilizer_types as $f_type) {
        $limit_per_hectare = isset($limits[$f_type]) ? $limits[$f_type] : 0;

        // Calculate total allowed bags
        // Formula: Land Area * Limit per Hectare
        // Example: 2 Hectare * 3 Bags/Hectare = 6 Bags
        $allowed_bags = floor($land_area * $limit_per_hectare);

        // Calculate used quantity from product_bookings table
        // Status 'Cancelled' does not count. 'Booked' and 'Collected' count.
        // For now, we count all active bookings for this farmer and product.
        // Ideally, we should filter by Season Date Range, but assuming current season data for now.
        $stmt_usage = $conn->prepare("
            SELECT SUM(quantity) as used_qty 
            FROM product_bookings 
            WHERE farmer_id = ? 
            AND product = ? 
            AND status NOT IN ('Cancelled', 'Extended')
        ");
        $stmt_usage->bind_param("ss", $farmer_id, $f_type);
        $stmt_usage->execute();
        $usage_res = $stmt_usage->get_result();
        $used_quantity = 0;
        if ($row = $usage_res->fetch_assoc()) {
            $used_quantity = intval($row['used_qty']);
        }

        $remaining_quantity = max(0, $allowed_bags - $used_quantity);

        // Get price
        $type_lower = strtolower($f_type);
        $price = isset($prices[$type_lower]) ? $prices[$type_lower] : 0;

        $fertilizers[] = [
            'id' => strtolower($f_type),
            'name' => $fertilizer_names[$f_type]['name'],
            'nameHindi' => $fertilizer_names[$f_type]['nameHindi'],
            'type' => $fertilizer_names[$f_type]['type'],
            'pricePerBag' => $price,
            'quota' => [
                'allowedQuantity' => $allowed_bags,
                'usedQuantity' => $used_quantity,
                'remainingQuantity' => $remaining_quantity
            ]
        ];
    }

    // 4. Get Daily and Pending booking counts for limits
    $today = date('Y-m-d');
    
    // Daily count (Distinct orders on selected/today date)
    $stmt_daily = $conn->prepare("SELECT COUNT(DISTINCT CASE WHEN order_id IS NULL THEN id ELSE order_id END) as daily_count FROM product_bookings WHERE farmer_id = ? AND booking_date = ? AND status != 'Cancelled'");
    $stmt_daily->bind_param("ss", $farmer_id, $today);
    $stmt_daily->execute();
    $daily_booking_count = intval($stmt_daily->get_result()->fetch_assoc()['daily_count']);

    // Pending count
    $stmt_pending = $conn->prepare("SELECT COUNT(DISTINCT CASE WHEN order_id IS NULL THEN id ELSE order_id END) as pending_count FROM product_bookings WHERE farmer_id = ? AND status = 'Pending'");
    $stmt_pending->bind_param("s", $farmer_id);
    $stmt_pending->execute();
    $pending_booking_count = intval($stmt_pending->get_result()->fetch_assoc()['pending_count']);

    echo json_encode([
        'success' => true,
        'data' => [
            'season' => $season,
            'land_area' => $land_area,
            'farmer_name' => $farmer['name'],
            'district_id' => $farmer['district_id'],
            'tehsil_id' => $farmer['tehsil_id'],
            'block_id' => $farmer['block_id'],
            'village_id' => $farmer['village_id'],
            'daily_booking_count' => $daily_booking_count,
            'pending_booking_count' => $pending_booking_count,
            'fertilizers' => $fertilizers,
            'retailer' => !empty($farmer['selected_retailer_id']) ? [
                'id' => $farmer['selected_retailer_id'],
                'name' => (function($v1, $v2, $v3) {
                    // Treat 'NA', 'N/A', 'null' as empty
                    $clean = function($s) { return (in_array(strtolower(trim($s ?? '')), ['na', 'n/a', 'null', ''])) ? '' : trim($s); };
                    return $clean($v1) ?: $clean($v2) ?: $clean($v3) ?: '';
                })($farmer['r_name'], $farmer['selected_retailer_name'], $farmer['selected_retailer_id']),
                'shopName' => (function($v1, $v2, $v3) {
                    $clean = function($s) { return (in_array(strtolower(trim($s ?? '')), ['na', 'n/a', 'null', ''])) ? '' : trim($s); };
                    return $clean($v1) ?: $clean($v2) ?: $clean($v3) ?: '';
                })($farmer['r_shop'], $farmer['selected_retailer_name'], $farmer['selected_retailer_id']),
                'address' => $farmer['r_address'] ?: '',
                'district' => $farmer['district_id'] ?: ''
            ] : null
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'त्रुटि: ' . $e->getMessage()
    ]);
}

$conn->close();
?>