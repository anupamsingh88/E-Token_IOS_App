<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$farmer_id = isset($data['farmer_id']) ? trim($data['farmer_id']) : '';

if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'किसान ID आवश्यक है']);
    exit;
}

try {
    // Get farmer details
    $stmt = $conn->prepare("
        SELECT f.farmer_id, f.name, f.mobile, f.aadhaar, f.khatauni_number, 
               f.khasra_rukba, f.profile_photo, f.aadhaar_photo, f.selected_retailer_id, f.selected_retailer_name,
               f.village_id as village_name, f.village_id as village_name_en,
               f.block_id as block_name, f.block_id as block_name_en,
               f.tehsil_id as tehsil_name, f.tehsil_id as tehsil_name_en,
               f.district_id as district_name, f.district_id as district_name_en
        FROM farmer_info f
        WHERE f.farmer_id = ?
    ");
    $stmt->bind_param("s", $farmer_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'किसान नहीं मिला']);
        exit;
    }

    $farmer = $result->fetch_assoc();

    echo json_encode([
        'success' => true,
        'data' => [
            'farmer_id' => $farmer['farmer_id'],
            'name' => $farmer['name'],
            'mobile' => $farmer['mobile'],
            'aadhaar' => $farmer['aadhaar'] ?? '',
            'village' => $farmer['village_name'] ?? '',
            'village_en' => $farmer['village_name_en'] ?? '',
            'block' => $farmer['block_name'] ?? '',
            'block_en' => $farmer['block_name_en'] ?? '',
            'tehsil' => $farmer['tehsil_name'] ?? '',
            'tehsil_en' => $farmer['tehsil_name_en'] ?? '',
            'district' => $farmer['district_name'] ?? '',
            'district_en' => $farmer['district_name_en'] ?? '',
            'khatauni_number' => $farmer['khatauni_number'] ?? '',
            'khasra_number' => $farmer['khatauni_number'] ?? '', // Keep for backward compatibility if needed, but let's be clean
            'land_area' => floatval($farmer['khasra_rukba']),
            'profile_photo' => $farmer['profile_photo'],
            'aadhaar_photo' => $farmer['aadhaar_photo'] ?? null,
            'selected_retailer_id' => $farmer['selected_retailer_id'] ?? null,
            'selected_retailer_name' => $farmer['selected_retailer_name'] ?? null
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'त्रुटि: ' . $e->getMessage()
    ]);
}

$conn->close();
?>