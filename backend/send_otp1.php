<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['mobile'])) {
    echo json_encode(['success' => false, 'message' => 'मोबाइल नंबर आवश्यक है']);
    exit;
}

// Validate mobile number format
if (!preg_match('/^[0-9]{10}$/', $input['mobile'])) {
    echo json_encode(['success' => false, 'message' => 'मोबाइल नंबर 10 अंकों का होना चाहिए']);
    exit;
}

try {
    // Check if mobile number exists in database
    $stmt = $pdo->prepare("SELECT farmer_id, status FROM farmer_info WHERE mobile = ?");
    $stmt->execute([$input['mobile']]);
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$farmer) {
        echo json_encode(['success' => false, 'message' => 'यह नंबर पंजीकृत नहीं है। पहले पंजीकरण करें।']);
        exit;
    }

    // Check approval status
    $status = isset($farmer['status']) ? (int) $farmer['status'] : 0;

    if ($status === 0) {
        // Pending approval
        echo json_encode(['success' => false, 'message' => 'आपके नजदीकी सचिव जांच कर रहे हैं। 24-48 घंटे में अनुमोदन मिलेगा।']);
        exit;
    } elseif ($status === 2) {
        // Rejected
        echo json_encode(['success' => false, 'message' => 'आपका पंजीकरण रद्द कर दिया गया है। नजदीकी कार्यालय से संपर्क करें।']);
        exit;
    }

    // Status is 1 (Approved), proceed to generate and send OTP
    // $otp = rand(100000, 999999);
    $otp = "123456"; 
    $expiry = date('Y-m-d H:i:s', strtotime('+5 minutes'));

    // Store OTP in database
    $updateStmt = $pdo->prepare("UPDATE farmer_info SET otp_code = ?, otp_expiry = ? WHERE mobile = ?");
    $updateStmt->execute([$otp, $expiry, $input['mobile']]);

    // SMS API Configuration
    $username = "9554969777";
    $api_password = "45c48t4yaqqa3uf2p";
    $sender = "weknow";
    
    // Dynamic message with %20 encoding
    $msgText = "Dear User,\n\nYour OTP for for login is $otp.\n\nRegards,\nWeKnow Technologies";
    $message = rawurlencode($msgText);
    
    $priority = "11";
    $e_id = "1201159138761283216";
    $t_id = "1207166661218817759";
    $to = $input['mobile'];
    
    $api_url = "http://sms.weknowtech.in/pushsms.php?username=$username&api_password=$api_password&sender=$sender&to=$to&message=$message&priority=$priority&e_id=$e_id&t_id=$t_id";

    // Call SMS API using file_get_contents (cleaned)
    $response = @file_get_contents($api_url);

    file_put_contents('otp_response.log', "[" . date('Y-m-d H:i:s') . "] Response for $to: " . $response . " | URL: " . $api_url . "\n", FILE_APPEND);

    // Ensure clean JSON output
    if (ob_get_length()) ob_clean();
    echo json_encode([
        'success' => true,
        'message' => 'OTP आपके पंजीकृत मोबाइल नंबर पर भेज दिया गया है',
        'otp_sent' => true,
        'otp_debug' => $otp
    ]);

} catch (PDOException $e) {
    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>