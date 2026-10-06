<?php
/**
 * Update Retailer Profile API
 * Updates fields like mobile in the retailer_info table
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db_connect.php';

// Get POST/JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    $data = $_POST;
}

$retailer_id = $data['retailer_id'] ?? null;
$mobile = $data['mobile'] ?? null;

if (!$retailer_id || !$mobile) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing retailer_id or mobile'
    ]);
    exit;
}

// Validate mobile format (10 digits)
if (!preg_match('/^[0-9]{10}$/', $mobile)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid mobile number'
    ]);
    exit;
}

try {
    // Determine if we should match by primary key id or unique retailer_id string
    if (is_numeric($retailer_id) && strlen($retailer_id) < 10) {
        // likely internal ID
        $stmt = $conn->prepare("UPDATE retailer_info SET mobile = ? WHERE id = ? OR retailer_id = ?");
        $stmt->bind_param("sss", $mobile, $retailer_id, $retailer_id);
    } else {
        // likely retailer_id string
        $stmt = $conn->prepare("UPDATE retailer_info SET mobile = ? WHERE retailer_id = ?");
        $stmt->bind_param("ss", $mobile, $retailer_id);
    }

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'message' => 'No changes made or retailer not found'
            ]);
        }
    } else {
        throw new Exception($stmt->error);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating profile: ' . $e->getMessage()
    ]);
}

$conn->close();
?>
