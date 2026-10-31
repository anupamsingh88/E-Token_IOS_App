<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = !empty($rawInput) ? json_decode($rawInput, true) : [];
if (!is_array($input)) {
    $input = [];
}

$farmer_id = $_POST['farmer_id'] ?? ($input['farmer_id'] ?? null);
$name = isset($_POST['name']) ? trim($_POST['name']) : (isset($input['name']) ? trim($input['name']) : null);
$kisan_code = isset($_POST['kisan_panjikaran_number']) 
    ? trim($_POST['kisan_panjikaran_number']) 
    : (isset($_POST['kisan_code']) 
        ? trim($_POST['kisan_code']) 
        : (isset($input['kisan_panjikaran_number']) 
            ? trim($input['kisan_panjikaran_number']) 
            : (isset($input['kisan_code']) ? trim($input['kisan_code']) : null)));
$registry_id = isset($_POST['registry_id']) ? trim($_POST['registry_id']) : (isset($input['registry_id']) ? trim($input['registry_id']) : null);

if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'Farmer ID is required']);
    exit;
}

try {
    // Ensure columns exist gracefully
    try {
        $pdo->exec("ALTER TABLE farmer_info ADD COLUMN registry_id VARCHAR(100) NULL DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE farmer_info ADD COLUMN kisan_panjikaran_number VARCHAR(100) NULL DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE farmer_info ADD COLUMN kisan_panjikaran_photo TEXT NULL DEFAULT NULL");
    } catch (Exception $e) {}

    $updates = [];
    $params = [];
    $kisan_panjikaran_photo_path = null;

    if ($name !== null) {
        if ($name === '') {
            echo json_encode(['success' => false, 'message' => 'नाम खाली नहीं हो सकता']);
            exit;
        }
        $updates[] = "name = ?";
        $params[] = $name;
    }

    if ($kisan_code !== null) {
        $kisan_code = preg_replace('/[^0-9]/', '', (string)$kisan_code);
        if (strlen($kisan_code) !== 10) {
            echo json_encode(['success' => false, 'message' => 'कृषक पंजिका कोड ठीक 10 अंकों का होना चाहिए']);
            exit;
        }

        // Prevent modification if already present (permanent code)
        $currStmt = $pdo->prepare("SELECT kisan_panjikaran_number FROM farmer_info WHERE farmer_id = ?");
        $currStmt->execute([$farmer_id]);
        $existingRow = $currStmt->fetch(PDO::FETCH_ASSOC);
        if ($existingRow && !empty($existingRow['kisan_panjikaran_number'])) {
            $existingClean = preg_replace('/[^0-9]/', '', (string)$existingRow['kisan_panjikaran_number']);
            if (strlen($existingClean) === 10 && $existingClean !== $kisan_code) {
                echo json_encode([
                    'success' => false,
                    'message' => 'कृषक पंजिका कोड एक बार दर्ज होने के बाद बदला नहीं जा सकता है।'
                ]);
                exit;
            }
        }

        // Check uniqueness among active records
        $checkStmt = $pdo->prepare("SELECT farmer_id FROM farmer_info WHERE kisan_panjikaran_number = ? AND farmer_id != ? AND status != 2");
        $checkStmt->execute([$kisan_code, $farmer_id]);
        if ($checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'यह कृषक पंजिका कोड किसी अन्य किसान द्वारा पहले से पंजीकृत है']);
            exit;
        }
        $updates[] = "kisan_panjikaran_number = ?";
        $params[] = $kisan_code;
    }

    if ($registry_id !== null) {
        if ($registry_id !== '') {
            // Check uniqueness among active records
            $checkStmt = $pdo->prepare("SELECT farmer_id FROM farmer_info WHERE registry_id = ? AND farmer_id != ? AND status != 2");
            $checkStmt->execute([$registry_id, $farmer_id]);
            if ($checkStmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'यह रजिस्ट्री आईडी किसी अन्य किसान द्वारा पहले से पंजीकृत है']);
                exit;
            }
        }
        $updates[] = "registry_id = ?";
        $params[] = ($registry_id !== '' ? $registry_id : null);
    }

    // Handle kisan_panjikaran_photo upload
    $fileKey = null;
    if (isset($_FILES['kisan_panjikaran_photo'])) {
        $fileKey = 'kisan_panjikaran_photo';
    } elseif (isset($_FILES['kisan_card'])) {
        $fileKey = 'kisan_card';
    }

    if ($fileKey) {
        $targetDir = __DIR__ . '/uploads/kisan_cards/';
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }

        if (is_array($_FILES[$fileKey]['name'])) {
            $uploadedPaths = [];
            for ($i = 0; $i < count($_FILES[$fileKey]['name']); $i++) {
                if ($_FILES[$fileKey]['error'][$i] === UPLOAD_ERR_OK) {
                    $ext = strtolower(pathinfo($_FILES[$fileKey]['name'][$i], PATHINFO_EXTENSION));
                    if (!$ext) $ext = 'jpg';
                    $filename = 'kisan_panjikaran_photo_' . $farmer_id . '_' . time() . '_' . $i . '.' . $ext;
                    if (move_uploaded_file($_FILES[$fileKey]['tmp_name'][$i], $targetDir . $filename)) {
                        $uploadedPaths[] = 'uploads/kisan_cards/' . $filename;
                    }
                }
            }
            if (!empty($uploadedPaths)) {
                $kisan_panjikaran_photo_path = implode(',', $uploadedPaths);
            }
        } else {
            if ($_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($_FILES[$fileKey]['name'], PATHINFO_EXTENSION));
                if (!$ext) $ext = 'jpg';
                $filename = 'kisan_panjikaran_photo_' . $farmer_id . '_' . time() . '.' . $ext;
                if (move_uploaded_file($_FILES[$fileKey]['tmp_name'], $targetDir . $filename)) {
                    $kisan_panjikaran_photo_path = 'uploads/kisan_cards/' . $filename;
                }
            }
        }

        if ($kisan_panjikaran_photo_path) {
            $updates[] = "kisan_panjikaran_photo = ?";
            $params[] = $kisan_panjikaran_photo_path;
        }
    }

    if (empty($updates)) {
        echo json_encode(['success' => false, 'message' => 'बदलने के लिए कोई जानकारी नहीं मिली']);
        exit;
    }

    $params[] = $farmer_id;
    $sql = "UPDATE farmer_info SET " . implode(", ", $updates) . " WHERE farmer_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode([
        'success' => true,
        'message' => 'किसान विवरण सफलतापूर्वक अपडेट कर दिया गया है',
        'data' => [
            'farmer_id' => $farmer_id,
            'name' => $name,
            'kisan_panjikaran_number' => $kisan_code,
            'kisan_code' => $kisan_code,
            'registry_id' => $registry_id,
            'kisan_panjikaran_photo' => $kisan_panjikaran_photo_path
        ]
    ]);
} catch (PDOException $e) {
    error_log("update_farmer_profile error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'प्रोफ़ाइल अपडेट करने में तकनीकी समस्या आई।']);
}
?>
