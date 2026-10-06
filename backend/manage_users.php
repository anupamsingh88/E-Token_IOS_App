<?php
/**
 * Manage Users API
 * Handles approval, rejection, activation, and deactivation of farmers and retailers
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
    
    if (!isset($input['user_type']) || !isset($input['user_id']) || !isset($input['action'])) {
        throw new Exception('Missing required fields: user_type, user_id, and action');
    }
    
    $userType = $conn->real_escape_string($input['user_type']);
    $userId = intval($input['user_id']);
    $action = $conn->real_escape_string($input['action']);
    
    // Determine table name
    $tableName = ($userType === 'farmer') ? 'farmer_info' : 'retailers';
    
    // Validate action and build query
    switch ($action) {
        case 'approve':
            $query = "UPDATE $tableName 
                      SET approval_status = 'approved', 
                          is_active = 1,
                          approved_at = CURRENT_TIMESTAMP 
                      WHERE id = $userId";
            $message = ucfirst($userType) . " approved successfully";
            break;
            
        case 'reject':
            $query = "UPDATE $tableName 
                      SET approval_status = 'rejected', 
                          is_active = 0 
                      WHERE id = $userId";
            $message = ucfirst($userType) . " rejected successfully";
            break;
            
        case 'activate':
            $query = "UPDATE $tableName 
                      SET is_active = 1 
                      WHERE id = $userId";
            $message = ucfirst($userType) . " activated successfully";
            break;
            
        case 'deactivate':
            $query = "UPDATE $tableName 
                      SET is_active = 0 
                      WHERE id = $userId";
            $message = ucfirst($userType) . " deactivated successfully";
            break;
            
        default:
            throw new Exception("Invalid action. Must be one of: approve, reject, activate, deactivate");
    }
    
    if (!$conn->query($query)) {
        throw new Exception("Failed to $action $userType: " . $conn->error);
    }
    
    if ($conn->affected_rows === 0) {
        throw new Exception(ucfirst($userType) . " with ID $userId not found");
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'user_type' => $userType,
            'user_id' => $userId,
            'action' => $action
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
