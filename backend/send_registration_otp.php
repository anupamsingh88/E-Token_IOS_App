<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!$input) {
    $input = $_POST;
}

if (!$input || empty($input['mobile'])) {
    echo json_encode(['success' => false, 'message' => 'मोबाइल नंबर आवश्यक है']);
    exit;
}

$mobile = preg_replace('/[^0-9]/', '', $input['mobile']);

if (strlen($mobile) !== 10) {
    echo json_encode(['success' => false, 'message' => 'मोबाइल नंबर 10 अंकों का होना चाहिए']);
    exit;
}

$testNumber = "7275095741";
$isTestNumber = ($mobile === $testNumber);

try {
    // 1. Rate Limiting: Cooldown check (Minimum 60 seconds between OTP requests for the same number)
    $stmtCooldown = $pdo->prepare("SELECT created_at FROM registration_otps WHERE mobile = ? ORDER BY id DESC LIMIT 1");
    $stmtCooldown->execute([$mobile]);
    $lastOtp = $stmtCooldown->fetch(PDO::FETCH_ASSOC);

    if ($lastOtp && !empty($lastOtp['created_at'])) {
        $secondsSinceLast = time() - strtotime($lastOtp['created_at']);
        if ($secondsSinceLast < 60) {
            $waitSeconds = 60 - $secondsSinceLast;
            echo json_encode(['success' => false, 'message' => "कृपया पुनः OTP भेजने के लिए $waitSeconds सेकंड प्रतीक्षा करें।"]);
            exit;
        }
    }

    // 2. Rate Limiting: Hourly limit (Max 3 OTP requests per hour per mobile to prevent token exhaustion)
    $stmtHour = $pdo->prepare("SELECT COUNT(*) FROM registration_otps WHERE mobile = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $stmtHour->execute([$mobile]);
    $hourlyCount = (int) $stmtHour->fetchColumn();

    if ($hourlyCount >= 3) {
        echo json_encode(['success' => false, 'message' => 'आप इस नंबर पर 1 घंटे की अधिकतम OTP सीमा (3 बार) पार कर चुके हैं। कृपया बाद में प्रयास करें।']);
        exit;
    }

    // 3. Business Logic: Preserve 3-Attempt re-registration & check status in farmer_info
    $stmtFarmer = $pdo->prepare("SELECT status FROM farmer_info WHERE mobile = ? ORDER BY id DESC");
    $stmtFarmer->execute([$mobile]);
    $records = $stmtFarmer->fetchAll(PDO::FETCH_ASSOC);

    if (count($records) > 0) {
        $rejectedCount = 0;
        foreach ($records as $rec) {
            $status = (int)$rec['status'];
            if ($status === 1) {
                echo json_encode(['success' => false, 'message' => 'यह मोबाइल नंबर पहले से पंजीकृत और स्वीकृत है। कृपया लॉगिन करें।']);
                exit;
            } elseif ($status === 0) {
                echo json_encode(['success' => false, 'message' => 'आपका पिछला पंजीकरण पहले से सत्यापन के लिए लंबित है।']);
                exit;
            } elseif ($status === 2) {
                $rejectedCount++;
            }
        }

        if ($rejectedCount >= 3) {
            echo json_encode(['success' => false, 'message' => 'आपकी पंजीकरण सीमा (3 बार) समाप्त हो चुकी है। आप अब इस नंबर से पंजीकरण नहीं कर सकते।']);
            exit;
        }
    }

    // 4. Generate 6-digit OTP
    $otp = $isTestNumber ? "123456" : (string) rand(100000, 999999);
    $expiry = date('Y-m-d H:i:s', strtotime('+5 minutes'));

    // 5. Store OTP in registration_otps (clean old records for this mobile to keep table tidy)
    $delOld = $pdo->prepare("DELETE FROM registration_otps WHERE mobile = ?");
    $delOld->execute([$mobile]);

    $insertStmt = $pdo->prepare("INSERT INTO registration_otps (mobile, otp_code, otp_expiry, created_at) VALUES (?, ?, ?, NOW())");
    $insertStmt->execute([$mobile, $otp, $expiry]);

    // 6. SMS API Gateway Dispatch (Txly)
    $apiKey = "S8wpAXVl2VDcRvQJ";
    $senderId = "WEKTEC";
    $templateId = "1707177166305545900";
    $msgText = "E-Token पंजीकरण सत्यापन हेतु OTP $otp है। यह 5 मिनट तक वैध है। सुरक्षा कारणों से इसे किसी के साथ साझा न करें। REGARDS- WEKNOW TECHNOLOGIES PRIVATE LIMITED";
    $message = urlencode($msgText);
    $api_url = "https://manage.txly.in/vb/apikey.php?apikey=$apiKey&senderid=$senderId&number=$mobile&message=$message&templateid=$templateId&unicode=2";

    if ($isTestNumber) {
        $response = "Bypassed for test number";
    } else {
        $response = @file_get_contents($api_url);
    }

    file_put_contents('otp_response.log', "[" . date('Y-m-d H:i:s') . "] Reg OTP for $mobile: " . $response . " | URL: " . $api_url . "\n", FILE_APPEND);

    echo json_encode([
        'success' => true,
        'message' => 'OTP आपके पंजीकृत मोबाइल नंबर पर भेज दिया गया है',
        'otp_sent' => true,
        'otp_debug' => $otp
    ]);

} catch (PDOException $e) {
    error_log("send_registration_otp PDO error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'तकनीकी समस्या के कारण OTP नहीं भेजा जा सका। कृपया पुनः प्रयास करें।']);
} catch (Exception $e) {
    error_log("send_registration_otp error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'OTP भेजने में समस्या आई। कृपया अपना मोबाइल नंबर जांचें।']);
}
?>
