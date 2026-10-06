<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
// echo "start";
// exit;
// $start = microtime(true);

// require 'db_connect.php';

// echo "DB connected in: " . (microtime(true) - $start);
// exit;

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

$testNumber = "7275095741";
$isTestNumber = ($input['mobile'] === $testNumber);

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
    $otp = $isTestNumber ? "123456" : rand(100000, 999999);
    $expiry = date('Y-m-d H:i:s', strtotime('+5 minutes'));

    
    $updateStmt = $pdo->prepare("UPDATE farmer_info SET otp_code = ?, otp_expiry = ? WHERE mobile = ?");
    $updateStmt->execute([$otp, $expiry, $input['mobile']]);

    
    $apiKey = "S8wpAXVl2VDcRvQJ";
    $senderId = "WEKTEC";
    $templateId = "1707177166305545900";
    
    
    
    $otp = (string)$otp;
    $msgText = "E-Token पंजीकरण सत्यापन हेतु OTP $otp है। यह 5 मिनट तक वैध है। सुरक्षा कारणों से इसे किसी के साथ साझा न करें। REGARDS- WEKNOW TECHNOLOGIES PRIVATE LIMITED";
    $message = urlencode($msgText);
    
    $to = $input['mobile'];
    
    
    $api_url = "https://manage.txly.in/vb/apikey.php?apikey=$apiKey&senderid=$senderId&number=$to&message=$message&templateid=$templateId&unicode=2";

    
    if ($isTestNumber) {
        $response = "Bypassed for test number";
    } else {
        $response = @file_get_contents($api_url);
        // $response = "skip";
    }

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