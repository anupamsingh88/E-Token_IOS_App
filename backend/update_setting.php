<?php
/**
 * Update Setting API
 * Allows SuperAdmin to update individual settings
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['setting_key']) || !isset($input['setting_value'])) {
        throw new Exception('Missing required fields: setting_key and setting_value');
    }
    
    $settingKey = $conn->real_escape_string($input['setting_key']);
    $settingValue = $conn->real_escape_string($input['setting_value']);
    
    // Check if setting exists
    $checkQuery = "SELECT id, setting_type FROM app_settings WHERE setting_key = '$settingKey'";
    $result = $conn->query($checkQuery);
    
    if ($result->num_rows === 0) {
        throw new Exception("Setting '$settingKey' does not exist");
    }
    
    $settingData = $result->fetch_assoc();
    $settingType = $settingData['setting_type'];
    
    // Validate value based on type
    if ($settingType === 'number' && !is_numeric($settingValue)) {
        throw new Exception("Setting value must be a number for '$settingKey'");
    }
    
    // Update the setting
    $updateQuery = "UPDATE app_settings 
                    SET setting_value = '$settingValue', 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE setting_key = '$settingKey'";
    
    if (!$conn->query($updateQuery)) {
        throw new Exception("Failed to update setting: " . $conn->error);
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Setting '$settingKey' updated successfully",
        'data' => [
            'setting_key' => $settingKey,
            'setting_value' => $settingValue
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
