<?php
/**
 * Update App Setting API
 * Updates a specific setting in the app_settings table
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db_connect.php';

// Get JSON input
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['setting_key']) || !isset($data['setting_value'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing setting_key or setting_value'
    ]);
    exit;
}

$key = $data['setting_key'];
$value = $data['setting_value'];

// determine value type for storage (simplistic approach)
$type = 'string';
if (is_numeric($value)) {
    $type = 'number';
} elseif (is_bool($value)) {
    $type = 'boolean';
    $value = $value ? '1' : '0';
} elseif (is_array($value)) {
    $type = 'json';
    $value = json_encode($value, JSON_UNESCAPED_UNICODE);
}

try {
    $stmt = $conn->prepare("UPDATE app_settings SET setting_value = ?, setting_type = ? WHERE setting_key = ?");
    $stmt->bind_param("sss", $value, $type, $key);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Setting updated successfully'
            ]);
        } else {
            // Check if key exists
            $check = $conn->prepare("SELECT setting_key FROM app_settings WHERE setting_key = ?");
            $check->bind_param("s", $key);
            $check->execute();
            if ($check->get_result()->num_rows === 0) {
                // Key doesn't exist, insert it? 
                // For safety, just say failed if not found
                echo json_encode([
                    'success' => false,
                    'message' => 'Setting key not found'
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'message' => 'No changes made'
                ]);
            }
        }
    } else {
        throw new Exception($stmt->error);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error updating setting: ' . $e->getMessage()
    ]);
}

$conn->close();
?>