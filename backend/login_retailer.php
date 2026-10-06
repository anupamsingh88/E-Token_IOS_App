<?php
// login_retailer.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'db_connect.php';

$response = array('success' => false, 'message' => '', 'data' => null);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? ''; // mobile or retailer_id
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $response['message'] = 'Username and Password are required';
        echo json_encode($response);
        exit;
    }

    // Check for SuperAdmin credentials (hardcoded fallback or env var in a real app)
    // For security, you might want to move this to a database table too, but for now we follow the existing pattern
    if ($username === 'sadmin' && $password === 'weknowtech') {
        $response['success'] = true;
        $response['message'] = 'SuperAdmin Login Successful';
        $response['data'] = array(
            'user_type' => 'superadmin',
            'name' => 'Super Admin',
            'id' => 0
        );
        echo json_encode($response);
        exit;
    }

    // Check retailer credentials
    $stmt = $conn->prepare("SELECT id, name, mobile, shop_name, password, approval_status, is_active FROM retailers WHERE mobile = ? OR retailer_id = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $retailer = $result->fetch_assoc();

        if (password_verify($password, $retailer['password'])) {
            if ($retailer['approval_status'] !== 'approved') {
                $response['message'] = 'Your account is pending approval.';
            } elseif ($retailer['is_active'] == 0) {
                $response['message'] = 'Your account is inactive.';
            } else {
                $response['success'] = true;
                $response['message'] = 'Login Successful';
                unset($retailer['password']); // Don't send password back
                $retailer['user_type'] = 'retailer';
                $response['data'] = $retailer;
            }
        } else {
            $response['message'] = 'Invalid password';
        }
    } else {
        $response['message'] = 'User not found';
    }

    $stmt->close();
} else {
    $response['message'] = 'Invalid request method';
}

echo json_encode($response);
$conn->close();
?>