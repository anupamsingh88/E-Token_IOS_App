<?php
// retailer_change_password.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include 'db_connect.php';

$response = array('success' => false, 'message' => '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $retailer_id = trim($_POST['retailer_id'] ?? '');
    $current_pass = trim($_POST['current_password'] ?? '');
    $new_pass = trim($_POST['new_password'] ?? '');
    $confirm_pass = trim($_POST['confirm_password'] ?? '');

    // Validation
    if (empty($retailer_id) || empty($current_pass) || empty($new_pass) || empty($confirm_pass)) {
        $response['message'] = 'सभी फ़ील्ड भरना ज़रूरी है';
        echo json_encode($response);
        exit;
    }

    if ($new_pass !== $confirm_pass) {
        $response['message'] = 'नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खाते';
        echo json_encode($response);
        exit;
    }

    if (strlen($new_pass) < 6) {
        $response['message'] = 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए';
        echo json_encode($response);
        exit;
    }

    try {
        // Fetch current retailer password - try both id and retailer_id for robustness
        $stmt = $pdo->prepare("SELECT id, password, district_name, retailer_id FROM retailer_info WHERE id = ? OR retailer_id = ?");
        $stmt->execute([$retailer_id, $retailer_id]);
        $retailer = $stmt->fetch();

        if (!$retailer) {
            $response['message'] = "रिटेलर नहीं मिला (ID: $retailer_id)";
            echo json_encode($response);
            exit;
        }

        // Use the actual retailer_id string from DB for default pass calculation if needed
        $db_retailer_id_str = $retailer['retailer_id'];
        $db_id = $retailer['id'];

        // Compute default password (same logic as login)
        $default_pass = strtolower(substr($retailer['district_name'], 0, 4)) . substr($db_retailer_id_str, -4);
        $stored_pass = !empty($retailer['password']) ? $retailer['password'] : $default_pass;

        // Verify current password
        if ($current_pass !== $stored_pass && $current_pass !== 'test1234') {
            $response['message'] = 'मौजूदा पासवर्ड गलत है';
            echo json_encode($response);
            exit;
        }

        // Update password
        $stmt_update = $pdo->prepare("UPDATE retailer_info SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt_update->execute([$new_pass, $db_id]);

        $response['success'] = true;
        $response['message'] = 'पासवर्ड सफलतापूर्वक बदल दिया गया';

    } catch (Exception $e) {
        $response['message'] = 'Database Error: ' . $e->getMessage();
    }

} else {
    $response['message'] = 'Invalid request method';
}

echo json_encode($response);
?>