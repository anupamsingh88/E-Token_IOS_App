<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

// Handle both JSON and FormData requests
$input = [];
$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
$isFormData = strpos($contentType, 'multipart/form-data') !== false;

if ($isFormData) {
    // FormData request (with files)
    $input = $_POST;
} else {
    // JSON request (legacy support)
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
}

// ALWAYS log the input for debugging
$debugInfo = [
    'timestamp' => date('Y-m-d H:i:s'),
    'content_type' => $contentType,
    'post' => $_POST,
    'files' => array_keys($_FILES),
    'input_decoded' => $input
];
file_put_contents('registration_debug.log', json_encode($debugInfo, JSON_PRETTY_PRINT) . "\n---\n", FILE_APPEND);

if (!$input && !$isFormData) {
    echo json_encode(['success' => false, 'message' => 'Invalid input - JSON parse failed']);
    exit;
}

// Basic validation - Simplified and unified
$fields = [
    'name' => 'name',
    'mobile' => 'mobile',
    'mobile_number' => 'mobile',
    'aadhaar' => 'aadhaar',
    'aadhaar_number' => 'aadhaar', // Backward compatibility check
    'village_id' => 'village_id',
    'village' => 'village_id',
    'district_id' => 'district_id',
    'district' => 'district_id',
    'tehsil_id' => 'tehsil_id',
    'tehsil' => 'tehsil_id',
    'block_id' => 'block_id',
    'block' => 'block_id',
    'khatauni_number' => 'khatauni_number',
    'khasra_number' => 'khatauni_number',
    'land_area' => 'khasra_rukba',
    'khasra_rukba' => 'khasra_rukba',
    'selected_retailer_id' => 'selected_retailer_id',
    'selected_retailer_name' => 'selected_retailer_name',
];

$data = [];
foreach ($fields as $inputKey => $dbKey) {
    if (isset($input[$inputKey]) && !isset($data[$dbKey])) {
        $data[$dbKey] = $input[$inputKey];
    }
}

// Critical fields check
$required = ['name', 'mobile', 'aadhaar', 'district_id'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'message' => "Field '$field' is missing"]);
        exit;
    }
}

try {

    // Check for existing farmer history by mobile or aadhaar
    $stmt = $pdo->prepare("SELECT mobile, aadhaar, status FROM farmer_info WHERE mobile = ? OR aadhaar = ?");
    $stmt->execute([$data['mobile'], $data['aadhaar']]);
    $existingRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($existingRecords) > 0) {
        $rejectedCount = 0;

        foreach ($existingRecords as $rec) {
            if ((int)$rec['status'] !== 2) {
                // There is an active (pending or approved) record with either this mobile or aadhaar
                if ($rec['mobile'] === $data['mobile']) {
                    echo json_encode(['success' => false, 'message' => 'यह मोबाइल नंबर पहले से पंजीकृत है।']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'यह आधार नंबर पहले से पंजीकृत है।']);
                }
                exit;
            } else {
                $rejectedCount++;
            }
        }

        // If we reach here, all previous records are rejected
        if ($rejectedCount >= 3) {
            echo json_encode(['success' => false, 'message' => 'आपकी पंजीकरण सीमा (3 बार) समाप्त हो चुकी है। आप अब इस नंबर/आधार से पंजीकरण नहीं कर सकते।']);
            exit;
        }
    }

    $farmerId = $data['id'] ?? uniqid('FARMER_');

    // Capture registry_id
    $registryId = $input['registry_id'] ?? ($_POST['registry_id'] ?? null);

    // Ensure registry_id column exists gracefully
    try {
        $pdo->exec("ALTER TABLE farmer_info ADD COLUMN registry_id VARCHAR(100) NULL DEFAULT NULL");
    } catch (Exception $colEx) {
    }

    if (!empty($registryId)) {
        // Check if any active record is using this registry_id
        $stmt = $pdo->prepare("SELECT status FROM farmer_info WHERE registry_id = ? AND status != 2");
        $stmt->execute([$registryId]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'यह रजिस्ट्री आईडी पहले से पंजीकृत है']);
            exit;
        }
    }

    // Land area validation
    $landArea = $data['khasra_rukba'] ?? $input['land_area'] ?? '';
    if ($landArea === '' || !is_numeric($landArea) || (float) $landArea <= 0) {
        echo json_encode(['success' => false, 'message' => 'खसरा/जमीन का क्षेत्रफल 0 से अधिक होना चाहिए']);
        exit;
    }


    // Handle file uploads - Refactored
    $paths = ['farmer_photo' => null, 'aadhaar_photo' => null, 'khatauni_photo' => null];
    $dirs = [
        'farmer_photo' => __DIR__ . '/uploads/farmer_photos/',
        'aadhaar_photo' => __DIR__ . '/uploads/aadhaar_cards/',
        'khatauni_photo' => __DIR__ . '/uploads/khatauni_photos/'
    ];

    foreach ($dirs as $key => $dir) {
        if (!is_dir($dir))
            mkdir($dir, 0755, true);

        if (isset($_FILES[$key])) {
            if (is_array($_FILES[$key]['name'])) {
                $uploadedPaths = [];
                for ($i = 0; $i < count($_FILES[$key]['name']); $i++) {
                    if ($_FILES[$key]['error'][$i] === UPLOAD_ERR_OK) {
                        $ext = pathinfo($_FILES[$key]['name'][$i], PATHINFO_EXTENSION);
                        if (!$ext)
                            $ext = 'jpg'; // fallback
                        $filename = $key . '_' . $farmerId . '_' . time() . '_' . $i . '.' . $ext;
                        if (move_uploaded_file($_FILES[$key]['tmp_name'][$i], $dir . $filename)) {
                            $subDir = '';
                            if ($key === 'farmer_photo')
                                $subDir = 'farmer_photos/';
                            elseif ($key === 'aadhaar_photo')
                                $subDir = 'aadhaar_cards/';
                            elseif ($key === 'khatauni_photo')
                                $subDir = 'khatauni_photos/';
                            $uploadedPaths[] = 'uploads/' . $subDir . $filename;
                        }
                    }
                }
                if (!empty($uploadedPaths)) {
                    $paths[$key] = implode(',', $uploadedPaths);
                }
            } else {
                if ($_FILES[$key]['error'] === UPLOAD_ERR_OK) {
                    $ext = pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION);
                    if (!$ext)
                        $ext = 'jpg';
                    $filename = $key . '_' . $farmerId . '_' . time() . '.' . $ext;
                    if (move_uploaded_file($_FILES[$key]['tmp_name'], $dir . $filename)) {
                        $subDir = '';
                        if ($key === 'farmer_photo')
                            $subDir = 'farmer_photos/';
                        elseif ($key === 'aadhaar_photo')
                            $subDir = 'aadhaar_cards/';
                        elseif ($key === 'khatauni_photo')
                            $subDir = 'khatauni_photos/';
                        $paths[$key] = 'uploads/' . $subDir . $filename;
                    }
                }
            }
        }
    }

    // Insert into database - Cleaned up
    $sql = "INSERT INTO farmer_info (
        farmer_id, name, mobile, aadhaar, village_id, district_id, tehsil_id, block_id,
        khatauni_number, khasra_rukba, wa_notification, profile_photo, aadhaar_photo, khatauni_photo, status, selected_retailer_id, selected_retailer_name, registry_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $farmerId,
        $data['name'],
        $data['mobile'],
        $data['aadhaar'],
        $data['village_id'] ?? null,
        $data['district_id'],
        $data['tehsil_id'] ?? null,
        $data['block_id'] ?? null,
        $data['khatauni_number'] ?? ($data['khasra_number'] ?? null),
        $landArea,
        $input['wa_notification'] ?? 0,
        $paths['farmer_photo'],
        $paths['aadhaar_photo'],
        $paths['khatauni_photo'],
        0, // status
        $data['selected_retailer_id'] ?? null,
        $data['selected_retailer_name'] ?? null,
        $registryId
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'आपका पंजीकरण हो गया है। अपने सभी दस्तावेज़ अपने रिटेलर के पास ले जाकर पुष्टि कराएं।',
        'farmer_id' => $farmerId
    ]);

} catch (PDOException $e) {
    // Cleanup on failure
    foreach ($paths as $p)
        if ($p && file_exists(__DIR__ . '/' . $p))
            unlink(__DIR__ . '/' . $p);

    echo json_encode(['success' => false, 'message' => $e->getCode() == 23000 ? 'यह मोबाइल नंबर पहले से पंजीकृत है' : 'Database error: ' . $e->getMessage()]);
}
?>