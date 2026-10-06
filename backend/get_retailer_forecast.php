<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

// Get input
$input = json_decode(file_get_contents('php://input'), true);
$retailer_id = isset($input['retailer_id']) ? $input['retailer_id'] : (isset($_GET['retailer_id']) ? $_GET['retailer_id'] : '1');
$start_date = isset($input['start_date']) ? $input['start_date'] : date('Y-m-d');

// Fertilizers to track
$fertilizers = ['Urea', 'DAP', 'NPK', 'MOP'];

// 1. Get Opening Stock for Start Date (Default 1000 as retailer_daily_stock is no longer used)
$opening_stocks = [];
foreach ($fertilizers as $f) {
    $opening_stocks[$f] = 1000; 
}

// 2. Get Bookings for next 7 days
$end_date = date('Y-m-d', strtotime($start_date . ' + 6 days'));

$stmt_bookings = $conn->prepare("
    SELECT booking_date, product, SUM(quantity) as total_booked 
    FROM product_bookings 
    WHERE retailer_id = ? AND booking_date BETWEEN ? AND ?
    GROUP BY booking_date, product
");
$stmt_bookings->bind_param("sss", $retailer_id, $start_date, $end_date);
$stmt_bookings->execute();
$bookings_result = $stmt_bookings->get_result();

$daily_bookings = [];
while ($row = $bookings_result->fetch_assoc()) {
    $date = $row['booking_date'];
    $product = $row['product'];
    if (!isset($daily_bookings[$date])) $daily_bookings[$date] = [];
    $daily_bookings[$date][$product] = intval($row['total_booked']);
}

// 3. Calculate 7-Day Forecast
$forecast = [];
$current_running_stocks = $opening_stocks; // Current running stock to carry over to next day

for ($i = 0; $i < 7; $i++) {
    $current_date = date('Y-m-d', strtotime($start_date . " + $i days"));
    $day_data = [
        'date' => $current_date,
        'day_name' => date('l', strtotime($current_date)),
        'fertilizers' => []
    ];
    
    foreach ($fertilizers as $fert) {
        $opening = $current_running_stocks[$fert];
        
        $booked = 0;
        if (isset($daily_bookings[$current_date]) && isset($daily_bookings[$current_date][$fert])) {
            $booked = $daily_bookings[$current_date][$fert];
        }
        
        $closing = $opening - $booked;
        
        // Store strictly per fertilizer
        $day_data['fertilizers'][$fert] = [
            'type' => $fert,
            'opening_stock' => $opening,
            'booked_slots' => $booked,
            'closing_stock' => $closing,
            'status' => $closing < 0 ? 'CRITICAL' : ($closing < 50 ? 'LOW' : 'GOOD')
        ];
        
        // Update running stock for next day's opening
        $current_running_stocks[$fert] = $closing;
    }
    
    $forecast[] = $day_data;
}

echo json_encode([
    'success' => true,
    'retailer_id' => $retailer_id,
    'start_date' => $start_date,
    'data' => $forecast
], JSON_PRETTY_PRINT);

$conn->close();
?>
