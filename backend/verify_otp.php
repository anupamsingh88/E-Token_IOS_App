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

if (!$input || !isset($input['mobile']) || !isset($input['otp'])) {
    echo json_encode(['success' => false, 'message' => 'मोबाइल नंबर और OTP आवश्यक है']);
    exit;
}

// For now, bypass OTP verification - accept any OTP
// In future, verify OTP from session/database
// $storedOtp = $_SESSION['otp'] ?? null;
// if ($input['otp'] != $storedOtp) {
//     echo json_encode(['success' => false, 'message' => 'गलत OTP']);
//     exit;
// }

echo json_encode([
    'success' => true,
    'message' => 'OTP सत्यापित',
    'verified' => true
]);
?>
