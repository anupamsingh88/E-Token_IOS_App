<?php
/**
 * Update Seasonal Settings API
 * Allows SuperAdmin to update seasonal fertilizer allotments
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
    
    if (!isset($input['season']) || !isset($input['fertilizer_type']) || !isset($input['allotment'])) {
        throw new Exception('Missing required fields: season, fertilizer_type, and allotment');
    }
    
    $season = $conn->real_escape_string($input['season']);
    $fertilizerType = $conn->real_escape_string($input['fertilizer_type']);
    $allotment = floatval($input['allotment']);
    $isActive = isset($input['is_active']) ? intval($input['is_active']) : 1;
    
    // Validate season
    $validSeasons = ['Rabi', 'Kharif', 'Zaid'];
    if (!in_array($season, $validSeasons)) {
        throw new Exception("Invalid season. Must be one of: " . implode(', ', $validSeasons));
    }
    
    // Validate fertilizer type
    $validFertilizers = ['Urea', 'DAP', 'NPK', 'MOP'];
    if (!in_array($fertilizerType, $validFertilizers)) {
        throw new Exception("Invalid fertilizer type. Must be one of: " . implode(', ', $validFertilizers));
    }
    
    // Update or insert seasonal setting
    $query = "INSERT INTO seasonal_settings (season_name, fertilizer_type, allotment_per_hectare, is_active) 
              VALUES ('$season', '$fertilizerType', $allotment, $isActive)
              ON DUPLICATE KEY UPDATE 
                  allotment_per_hectare = $allotment,
                  is_active = $isActive,
                  updated_at = CURRENT_TIMESTAMP";
    
    if (!$conn->query($query)) {
        throw new Exception("Failed to update seasonal setting: " . $conn->error);
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Seasonal setting updated successfully",
        'data' => [
            'season' => $season,
            'fertilizer_type' => $fertilizerType,
            'allotment_per_hectare' => $allotment,
            'is_active' => $isActive
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
