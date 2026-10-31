<?php
require_once 'db_connect.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = $_POST;
    }
} else {
    $data = $_GET;
}

$mobile = $data['mobile'] ?? null;
$aadhaar = $data['aadhaar'] ?? null;
$registryId = $data['registry_id'] ?? null;
$kisanCode = $data['kisan_panjikaran_number'] ?? ($data['kisan_code'] ?? null);

if (empty($mobile) && empty($aadhaar) && empty($registryId) && empty($kisanCode)) {
    echo json_encode(["status" => "error", "message" => "Please provide mobile, aadhaar, registry_id or kisan_panjikaran_number"]);
    exit;
}

try {
    if (!empty($registryId)) {
        // Check registry_id first
        $stmt = $pdo->prepare("SELECT status FROM farmer_info WHERE registry_id = ? AND status != 2");
        $stmt->execute([$registryId]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'active_registry', 'message' => 'यह रजिस्ट्री आईडी पहले से सक्रिय है']);
            exit;
        }
    }

    if (!empty($kisanCode)) {
        // Check kisan_panjikaran_number
        $stmt = $pdo->prepare("SELECT status FROM farmer_info WHERE kisan_panjikaran_number = ? AND status != 2");
        $stmt->execute([$kisanCode]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'active_kisan_code', 'message' => 'यह कृषक पंजिका कोड पहले से पंजीकृत और सक्रिय है']);
            exit;
        }
    }

    if (!empty($mobile) || !empty($aadhaar)) {
        $stmt = $pdo->prepare("SELECT status, rejection_reason FROM farmer_info WHERE (mobile = ? AND mobile != '') OR (aadhaar = ? AND aadhaar != '') ORDER BY id DESC");
        $stmt->execute([$mobile, $aadhaar]);
        $existingRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($existingRecords) > 0) {
            $rejectedCount = 0;
            $latestRejectionReason = null;

            foreach ($existingRecords as $rec) {
                if ((int)$rec['status'] !== 2) {
                    echo json_encode(['status' => 'active', 'message' => 'यह मोबाइल या आधार पहले से पंजीकृत और सक्रिय है।']);
                    exit;
                } else {
                    $rejectedCount++;
                    if ($latestRejectionReason === null) {
                        $latestRejectionReason = $rec['rejection_reason'];
                    }
                }
            }

            if ($rejectedCount >= 3) {
                echo json_encode(['status' => 'blocked', 'message' => 'आपकी पंजीकरण सीमा (3 बार) समाप्त हो चुकी है। आप अब इस नंबर/आधार से पंजीकरण नहीं कर सकते।']);
                exit;
            } else {
                echo json_encode([
                    'status' => 'rejected',
                    'message' => 'आपका पिछला पंजीकरण अस्वीकृत हो गया था।',
                    'rejection_reason' => $latestRejectionReason ?? 'कोई कारण नहीं दिया गया'
                ]);
                exit;
            }
        }
    }

    echo json_encode(['status' => 'new', 'message' => 'New registration allowed']);

} catch (Exception $e) {
    error_log("check_farmer_status error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "जांच के दौरान तकनीकी समस्या आई। कृपया पुनः प्रयास करें।"]);
}
?>
