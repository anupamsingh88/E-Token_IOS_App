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
    // Check for duplicate mobile number
    $stmt = $pdo->prepare("SELECT farmer_id FROM farmer_info WHERE mobile = ?");
    $stmt->execute([$data['mobile']]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'यह मोबाइल नंबर पहले से पंजीकृत है']);
        exit;
    }

    $farmerId = $data['id'] ?? uniqid('FARMER_');

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

        if (isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION);
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

    // Insert into database - Cleaned up
    $sql = "INSERT INTO farmer_info (
        farmer_id, name, mobile, aadhaar, village_id, district_id, tehsil_id, block_id,
        khatauni_number, khasra_rukba, wa_notification, profile_photo, aadhaar_photo, khatauni_photo, status, selected_retailer_id, selected_retailer_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

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
        $data['khasra_rukba'] ?? 0,
        $input['wa_notification'] ?? 0,
        $paths['farmer_photo'],
        $paths['aadhaar_photo'],
        $paths['khatauni_photo'],
        0, // status
        $data['selected_retailer_id'] ?? null,
        $data['selected_retailer_name'] ?? null
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'आपका पंजीकरण हो गया है। 24-48 घंटे में अनुमोदन मिल जाएगा।',
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