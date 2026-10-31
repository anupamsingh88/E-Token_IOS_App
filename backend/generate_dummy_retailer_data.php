<?php
/**
 * generate_dummy_retailer_data.php
 * Generates 40 dummy farmers and 42 dummy bookings for Retailer ID 689483
 */
include 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

$retailer_id = '689483';
$retailer_name = 'क्षेत्रीय सहकारी समिति लि० बमरौली कटारा ';
$district_id = 'AGRA';
$tehsil_id = 'AGRA';
$block_id = 'BARAULI AHIR';
$village_id = 'Bamrauli Katara';

$first_names = [
    'रामेश्वर', 'सुरेश', 'राजेश', 'दिनेश', 'महेश', 'संजय', 'अनिल', 'सुनील', 
    'विनोद', 'अशोक', 'संतोष', 'कमलेश', 'राकेश', 'मनोज', 'पंकज', 'अमित',
    'जितेन्द्र', 'धर्मेन्द्र', 'विजय', 'अजय', 'सतीश', 'प्रमोद', 'हरीश', 'मुकेश',
    'चन्द्रपाल', 'बलवीर', 'ओमप्रकाश', 'जगदीश', 'जयप्रकाश', 'हरिप्रसाद', 'सत्यपाल', 'रामअवतार',
    'शिवकुमार', 'रामपाल', 'ललित', 'विपिन', 'अरविन्द', 'सोनू', 'मोनू', 'गोविन्द'
];

$last_names = ['सिंह', 'यादव', 'वर्मा', 'कुशवाहा', 'शर्मा', 'मिश्रा', 'त्यागी', 'चौधरी', 'पटेल', 'मौर्या'];

$villages = [
    'Bamrauli Katara', 'Gari', 'Nagla Ramphal', 'Dhandhupura', 
    'Budhana', 'Khera Rathore', 'Midhakur', 'Gundau'
];

$products = ['Urea', 'DAP', 'NPK', 'MOP'];
$prices = [
    'Urea' => 266.50,
    'DAP' => 1350.00,
    'NPK' => 1470.00,
    'MOP' => 1700.00
];

$today = date('Y-m-d');
$tomorrow = date('Y-m-d', strtotime('+1 day'));
$day_after = date('Y-m-d', strtotime('+2 days'));

$inserted_farmers = [];
$inserted_bookings = [];

// Clean previous dummy records for this retailer if any exist
$conn->query("DELETE FROM product_bookings WHERE retailer_id = '$retailer_id' AND order_id LIKE 'ORD_DUMMY_%'");
$conn->query("DELETE FROM farmer_info WHERE selected_retailer_id = '$retailer_id' AND farmer_id LIKE 'FARMER_DUMMY_%'");

// 1. Generate 40 Farmers
// 18 Pending (status = 0)
// 14 Approved (status = 1)
// 8 Rejected (status = 2)
for ($i = 0; $i < 40; $i++) {
    $f_code = 'FARMER_DUMMY_' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);
    $name = $first_names[$i % count($first_names)] . ' ' . $last_names[($i * 3) % count($last_names)];
    $mobile = '98' . rand(10000000, 99999999);
    $aadhaar = rand(1000, 9999) . rand(1000, 9999) . rand(1000, 9999);
    $khatauni = 'KH-' . rand(10000, 99999);
    $rukba = number_format(rand(10, 60) / 10, 4); // 1.0 to 6.0 acres
    $village = $villages[$i % count($villages)];

    // Status distribution
    if ($i < 18) {
        $status = 0; // Pending
        $approved_at = null;
        $approved_by = null;
        $rejected_at = null;
        $rejection_reason = null;
    } elseif ($i < 32) {
        $status = 1; // Approved
        $approved_at = date('Y-m-d H:i:s', strtotime('-' . rand(1, 10) . ' days'));
        $approved_by = $retailer_id;
        $rejected_at = null;
        $rejection_reason = null;
    } else {
        $status = 2; // Rejected
        $approved_at = null;
        $approved_by = null;
        $rejected_at = date('Y-m-d H:i:s', strtotime('-' . rand(1, 5) . ' days'));
        $rejection_reason = 'दस्तावेज अस्पष्ट हैं (Unclear Documents)';
    }

    $created_at = date('Y-m-d H:i:s', strtotime('-' . rand(1, 15) . ' days'));

    $stmt = $conn->prepare("INSERT INTO farmer_info 
        (farmer_id, name, mobile, aadhaar, khatauni_number, khasra_rukba, status, 
         district_id, tehsil_id, block_id, village_id, selected_retailer_id, selected_retailer_name,
         created_at, approved_at, approved_by, rejected_at, rejection_reason, wa_notification, already_taken_bags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)");

    if ($stmt) {
        $stmt->bind_param("sssssdisssssssssss", 
            $f_code, $name, $mobile, $aadhaar, $khatauni, $rukba, $status,
            $district_id, $tehsil_id, $block_id, $village, $retailer_id, $retailer_name,
            $created_at, $approved_at, $approved_by, $rejected_at, $rejection_reason
        );
        if ($stmt->execute()) {
            $inserted_farmers[] = [
                "id" => $conn->insert_id,
                "farmer_id" => $f_code,
                "name" => $name,
                "status" => $status
            ];
        } else {
            error_log("Farmer insert failed: " . $stmt->error);
        }
        $stmt->close();
    }
}

// 2. Generate 42 Bookings (linked to approved & pending farmers)
// 16 Pending, 12 Approved, 5 Cancelled, 5 Collected, 4 Extended
$statuses = [];
for ($k = 0; $k < 16; $k++) $statuses[] = 'Pending';
for ($k = 0; $k < 12; $k++) $statuses[] = 'Approved';
for ($k = 0; $k < 5; $k++)  $statuses[] = 'Cancelled';
for ($k = 0; $k < 5; $k++)  $statuses[] = 'Collected';
for ($k = 0; $k < 4; $k++)  $statuses[] = 'Extended';

shuffle($statuses);

for ($j = 0; $j < count($statuses); $j++) {
    $farmer = $inserted_farmers[$j % count($inserted_farmers)];
    $farmer_id_fk = $farmer['farmer_id'];
    $order_id = 'ORD_DUMMY_' . (20261000 + $j + 1);
    $b_status = $statuses[$j];
    $prod = $products[$j % count($products)];
    $qty = rand(1, 5);
    $price = $prices[$prod];
    $token_num = 'TKN-' . rand(100000, 999999);

    // Ensure booking date is today or future so retailer_get_requests doesn't auto-cancel pending/approved
    if ($b_status === 'Pending' || $b_status === 'Approved' || $b_status === 'Extended') {
        $b_date = ($j % 2 === 0) ? $today : $tomorrow;
    } else {
        $b_date = ($j % 2 === 0) ? $today : date('Y-m-d', strtotime('-' . rand(1, 3) . ' days'));
    }

    $created_at = date('Y-m-d H:i:s', strtotime('-' . rand(1, 5) . ' days'));
    $approved_date = ($b_status === 'Approved' || $b_status === 'Collected') ? date('Y-m-d H:i:s') : null;
    $cancelled_at = ($b_status === 'Cancelled') ? date('Y-m-d H:i:s') : null;
    $collected_at = ($b_status === 'Collected') ? date('Y-m-d H:i:s') : null;
    $extended_at = ($b_status === 'Extended') ? date('Y-m-d H:i:s') : null;

    $stmt = $conn->prepare("INSERT INTO product_bookings 
        (retailer_id, retailer_name, farmer_id, order_id, booking_date, product, quantity, original_quantity, 
         price_per_bag, status, token_number, created_at, approved_date, cancelled_at, collected_at, extended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    if ($stmt) {
        $stmt->bind_param("ssssssiidsssssss", 
            $retailer_id, $retailer_name, $farmer_id_fk, $order_id, $b_date, $prod, $qty, $qty,
            $price, $b_status, $token_num, $created_at, $approved_date, $cancelled_at, $collected_at, $extended_at
        );
        if ($stmt->execute()) {
            $inserted_bookings[] = [
                "id" => $conn->insert_id,
                "order_id" => $order_id,
                "status" => $b_status,
                "product" => $prod,
                "farmer_name" => $farmer['name']
            ];
        } else {
            error_log("Booking insert failed: " . $stmt->error);
        }
        $stmt->close();
    }
}

// Counts check
$total_f = $conn->query("SELECT COUNT(*) as c FROM farmer_info WHERE selected_retailer_id = '$retailer_id'")->fetch_assoc()['c'];
$total_b = $conn->query("SELECT COUNT(*) as c FROM product_bookings WHERE retailer_id = '$retailer_id'")->fetch_assoc()['c'];

echo json_encode([
    "success" => true,
    "message" => "Dummy data generated successfully for retailer $retailer_id",
    "farmers_generated" => count($inserted_farmers),
    "bookings_generated" => count($inserted_bookings),
    "total_farmers_for_retailer" => (int) $total_f,
    "total_bookings_for_retailer" => (int) $total_b
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
