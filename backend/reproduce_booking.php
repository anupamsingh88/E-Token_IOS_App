<?php
require_once 'db_connect.php';

// 1. Create a dummy booking for a farmer (if not exists)
$farmer_id = 'F12345'; // Ensure this matches a valid farmer or created one
$retailer_id = 1; // Ensure this retailer exists
$date = date('Y-m-d');

// Verify Farmer Exists or create dummy
$check_farmer = $conn->query("SELECT * FROM farmer_info WHERE farmer_id = '$farmer_id'");
if ($check_farmer->num_rows == 0) {
    $conn->query("INSERT INTO farmer_info (farmer_id, name, mobile, aadhaar, khasra_rukba) VALUES ('$farmer_id', 'Test Farmer', '9999999999', '123456789012', 5.0)");
    echo "Created dummy farmer.\n";
}

// Verify Retailer Stock
$conn->query("INSERT INTO retailer_stock (retailer_id, date, UREA_stock) VALUES ($retailer_id, '$date', 100) ON DUPLICATE KEY UPDATE UREA_stock=100");

echo "Simulating Booking...\n";

$booking_data = [
    'farmer_id' => $farmer_id,
    'retailer_id' => $retailer_id,
    'booking_date' => $date,
    'items' => [
        ['product' => 'Urea', 'quantity' => 2]
    ]
];

// Call book_slot.php logic (mocking request)
// We can't easily include book_slot.php because it reads php://input, so we use curl or rewrite logic.
// Simplest is to just check if `get_farmer_bookings.php` works after manually inserting or using curl.

// Using curl to call local file is tricky without server URL.
// Let's just insert strictly into DB for verification of 'get_farmer_bookings.php' first.

$conn->query("INSERT INTO product_bookings (retailer_id, farmer_id, booking_date, product, quantity, status, token_number) VALUES ($retailer_id, '$farmer_id', '$date', 'Urea', 2, 'Booked', 'T-TEST-123')");
// Wait, the table name in `book_slot.php` is `product_bookings`.

// Let's actually use the `book_slot.php` via curl if we can, but we don't have the URL handy (it's likely http://localhost/backend...).
// We will manually insert into product_bookings to test `get_farmer_bookings.php` retrieval.

$token = "TEST" . rand(1000,9999);
$sql = "INSERT INTO product_bookings (retailer_id, farmer_id, booking_date, product, quantity, status, token_number) 
        VALUES ($retailer_id, '$farmer_id', '$date', 'Urea', 5, 'Booked', '$token')";

if ($conn->query($sql)) {
    echo "Booking inserted manually with token $token.\n";
} else {
    echo "Failed to insert booking: " . $conn->error . "\n";
}

// Now test get_farmer_bookings.php
echo "\nTesting get_farmer_bookings.php...\n";

// Mock GET request
$_GET['farmer_id'] = $farmer_id;
// We need to capture output
ob_start();
include 'get_farmer_bookings.php';
$output = ob_get_clean();

echo "Response:\n" . $output . "\n";

$data = json_decode($output, true);
if ($data['success']) {
    echo "\nSuccess! Found " . count($data['data']) . " bookings.\n";
    if (count($data['data']) > 0) {
        $first = $data['data'][0];
        if (isset($first['retailer_name'])) {
            echo "Retailer Name is present: " . $first['retailer_name'] . "\n";
        } else {
            echo "ERROR: Retailer Name is MISSING.\n";
        }
    }
} else {
    echo "\nFailed: " . $data['message'];
}

?>
