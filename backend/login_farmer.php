<?php
// Security and CORS Headers
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Strictly allow ONLY POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    file_put_contents('debug_input.log', "[" . date('Y-m-d H:i:s') . "] BLOCKED GET request to login_farmer.php\n", FILE_APPEND);
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed. Use POST."]);
    exit();
}

// 1. Initialize environment and dependencies
require_once 'env.php'; 
require_once 'error_logger.php';
require_once 'db_connect.php';
require_once 'jwt_helper.php';

// 2. Robust Input Reading
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Fallback to $_POST if JSON decode fails
if (!$input) {
    $input = $_POST;
}

// Diagnostic Logging
file_put_contents('debug_input.log', "[" . date('Y-m-d H:i:s') . "] Login Raw: " . $rawInput . " | Method: " . $_SERVER['REQUEST_METHOD'] . " | Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'N/A') . "\n", FILE_APPEND);

// 3. Validation
if (!$input || !isset($input['mobile']) || empty($input['mobile'])) {
    echo json_encode(['success' => false, 'message' => 'मोबाइल नंबर आवश्यक है']);
    exit;
}

$mobile = preg_replace('/[^0-9]/', '', $input['mobile']);
$action = trim($input['action'] ?? 'login');
$otp_submitted = trim($input['otp'] ?? '');
$mpin_submitted = trim($input['mpin'] ?? '');

try {
    // Gracefully ensure mpin column exists in farmer_info
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM farmer_info LIKE 'mpin'");
        if ($colCheck->rowCount() === 0) {
            $pdo->exec("ALTER TABLE farmer_info ADD COLUMN mpin VARCHAR(255) NULL DEFAULT NULL");
        }
    } catch (Exception $colEx) {
        // Continue even if SHOW COLUMNS or ALTER fails due to permissions
    }

    // Action 1: Check Farmer and MPIN Status
    if ($action === 'check_status') {
        $stmt = $pdo->prepare("SELECT farmer_id, name, mobile, status, mpin FROM farmer_info WHERE mobile = ?");
        $stmt->execute([$mobile]);
        $farmer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$farmer) {
            echo json_encode([
                'success' => false,
                'exists' => false,
                'message' => 'यह मोबाइल नंबर पंजीकृत नहीं है। कृपया पहले पंजीकरण करें।'
            ]);
            exit;
        }

        $status = (int)$farmer['status'];
        if ($status === 0) {
            echo json_encode(['success' => false, 'status' => 0, 'message' => 'आपका पंजीकरण सत्यापन के लिए लंबित है।']);
            exit;
        } elseif ($status === 2) {
            echo json_encode(['success' => false, 'status' => 2, 'message' => 'आपका पंजीकरण अस्वीकार कर दिया गया है।']);
            exit;
        }

        $hasMpin = !empty($farmer['mpin']);
        echo json_encode([
            'success' => true,
            'exists' => true,
            'name' => $farmer['name'],
            'has_mpin' => $hasMpin,
            'message' => $hasMpin ? 'MPIN से लॉगिन करें' : 'OTP से लॉगिन करें'
        ]);
        exit;
    }

    // Action 2: Set or Update MPIN
    if ($action === 'set_mpin') {
        if (empty($mpin_submitted) || !preg_match('/^[0-9]{4}$/', $mpin_submitted)) {
            echo json_encode(['success' => false, 'message' => 'MPIN 4 अंकों का होना चाहिए']);
            exit;
        }

        $hashedMpin = password_hash($mpin_submitted, PASSWORD_BCRYPT);
        $updateStmt = $pdo->prepare("UPDATE farmer_info SET mpin = ? WHERE mobile = ?");
        $updateStmt->execute([$hashedMpin, $mobile]);

        echo json_encode([
            'success' => true,
            'message' => '4 अंकों का MPIN सफलतापूर्वक सेट हो गया है।'
        ]);
        exit;
    }

    // Action 3: Login (either via MPIN or OTP)
    // Fetch farmer details
    $stmt = $pdo->prepare("SELECT farmer_id, name, mobile, status, otp_code, otp_expiry, profile_photo, mpin 
                           FROM farmer_info 
                           WHERE mobile = ?");
    $stmt->execute([$mobile]);
    $farmer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$farmer) {
        echo json_encode(['success' => false, 'message' => 'यह नंबर पंजीकृत नहीं है।']);
        exit;
    }

    $status = (int)$farmer['status'];

    if ($status === 0) {
        echo json_encode(['success' => false, 'message' => 'आपका पंजीकरण सत्यापन के लिए लंबित है।']);
        exit;
    } elseif ($status === 2) {
        echo json_encode(['success' => false, 'message' => 'आपका पंजीकरण अस्वीकार कर दिया गया है।']);
        exit;
    }

    // ── Method A: Login with MPIN (No SMS OTP!) ──
    if (!empty($mpin_submitted)) {
        if (empty($farmer['mpin'])) {
            echo json_encode([
                'success' => false,
                'need_otp' => true,
                'message' => 'आपके खाते में MPIN सेट नहीं है। कृपया OTP से लॉगिन करके MPIN बनाएं।'
            ]);
            exit;
        }

        $isValidPin = password_verify($mpin_submitted, $farmer['mpin']) || ($mpin_submitted === $farmer['mpin']);
        if (!$isValidPin) {
            echo json_encode(['success' => false, 'message' => 'गलत MPIN दर्ज किया गया है। पुनः प्रयास करें।']);
            exit;
        }

        // MPIN verified successfully
        unset($farmer['mpin']);
        unset($farmer['otp_code']);

        $payload = [
            'farmer_id' => $farmer['farmer_id'],
            'mobile' => $farmer['mobile'],
            'user_type' => 'farmer',
            'exp' => time() + (60 * 60 * 24 * 30) // 30 days
        ];
        $token = JWTHelper::encode($payload);

        echo json_encode([
            'success' => true,
            'message' => 'लॉगिन सफल',
            'token' => $token,
            'farmer' => $farmer,
            'has_mpin' => true
        ]);
        exit;
    }

    // ── Method B: Login with OTP (First-time or MPIN reset) ──
    if (empty($otp_submitted)) {
        echo json_encode(['success' => false, 'message' => 'कृपया MPIN या OTP दर्ज करें']);
        exit;
    }

    $stored_otp = $farmer['otp_code'];
    $otp_expiry = $farmer['otp_expiry'];

    if (empty($stored_otp)) {
        echo json_encode(['success' => false, 'message' => 'कृपया पहले OTP प्राप्त करें।']);
        exit;
    }

    if ($otp_expiry && strtotime($otp_expiry) < time()) {
        echo json_encode(['success' => false, 'message' => 'OTP की समय सीमा समाप्त हो गई है। कृपया पुनः प्राप्त करें।']);
        exit;
    }

    // Verify OTP
    if ($stored_otp != $otp_submitted) {
        echo json_encode(['success' => false, 'message' => 'गलत OTP। कृपया पुनः प्रयास करें।']);
        exit;
    }

    // Verification Successful - Clear OTP and Issue JWT
    $clearStmt = $pdo->prepare("UPDATE farmer_info SET otp_code = NULL, otp_expiry = NULL WHERE farmer_id = ?");
    $clearStmt->execute([$farmer['farmer_id']]);

    $hasMpin = !empty($farmer['mpin']);
    unset($farmer['mpin']);
    unset($farmer['otp_code']);

    $payload = [
        'farmer_id' => $farmer['farmer_id'],
        'mobile' => $farmer['mobile'],
        'user_type' => 'farmer',
        'exp' => time() + (60 * 60 * 24 * 30) // 30 days
    ];

    $token = JWTHelper::encode($payload);

    echo json_encode([
        'success' => true,
        'message' => 'लॉगिन सफल',
        'token' => $token,
        'farmer' => $farmer,
        'has_mpin' => $hasMpin
    ]);

} catch (Exception $e) {
    if (function_exists('log_error')) {
        log_error($e);
    }
    echo json_encode(['success' => false, 'message' => 'सर्वर त्रुटि। पुनः प्रयास करें।']);
}
?>