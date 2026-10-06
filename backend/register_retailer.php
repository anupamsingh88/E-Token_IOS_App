<?php
// register_retailer.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'db_connect.php';

$response = array('success' => false, 'message' => '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON input
    $json_input = file_get_contents('php://input');
    $data = json_decode($json_input, true);

    $name = $data['name'] ?? '';
    $mobile = $data['mobile'] ?? '';
    $shop_name = $data['shop_name'] ?? '';
    $license_number = $data['license_number'] ?? '';
    $password = $data['password'] ?? '';
    $address = $data['address'] ?? '';

    // Basic validation
    if (empty($name) || empty($mobile) || empty($password)) {
        $response['message'] = 'Name, Mobile and Password are required';
        echo json_encode($response);
        exit;
    }

    // Check if mobile already exists
    $check_stmt = $conn->prepare("SELECT id FROM retailers WHERE mobile = ?");
    $check_stmt->bind_param("s", $mobile);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        $response['message'] = 'Mobile number already registered';
        echo json_encode($response);
        exit;
    }

    // Hash password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Insert new retailer
    // retailer_id generated as RET + timestamp
    $retailer_id = 'RET' . time();

    $stmt = $conn->prepare("INSERT INTO retailers (retailer_id, name, mobile, shop_name, license_number, password, address, approval_status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)");
    $stmt->bind_param("ssssssss", $retailer_id, $name, $mobile, $shop_name, $license_number, $hashed_password, $address);

    if ($stmt->execute()) {
        $response['success'] = true;
        $response['message'] = 'Registration successful. Please wait for admin approval.';
    } else {
        $response['message'] = 'Registration failed: ' . $conn->error;
    }

    $stmt->close();
} else {
    $response['message'] = 'Invalid request method';
}

echo json_encode($response);
$conn->close();
?>