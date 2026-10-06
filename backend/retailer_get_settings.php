<?php
/**
 * Get Retailer App Settings API
 * Returns all application settings for SuperAdmin dashboard and app configuration
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once 'db_connect.php';

try {
    // Fetch all settings
    $query = "SELECT setting_key, setting_value, setting_type FROM app_settings ORDER BY setting_key";
    $result = $conn->query($query);

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $settings = [];
    while ($row = $result->fetch_assoc()) {
        $key = $row['setting_key'];
        $value = $row['setting_value'];
        $type = $row['setting_type'];

        // Convert value based on type
        switch ($type) {
            case 'number':
                $settings[$key] = floatval($value);
                break;
            case 'boolean':
                $settings[$key] = (bool) $value;
                break;
            case 'json':
                $settings[$key] = json_decode($value, true);
                break;
            default:
                $settings[$key] = $value;
        }
    }

    // Fetch seasonal settings
    $seasonalSettings = [];
    try {
        $seasonQuery = "SELECT season_name, fertilizer_type, allotment_per_hectare, is_active 
                        FROM seasonal_settings 
                        WHERE is_active = 1 
                        ORDER BY season_name, fertilizer_type";
        $seasonResult = $conn->query($seasonQuery);

        if ($seasonResult) {
            while ($row = $seasonResult->fetch_assoc()) {
                $season = $row['season_name'];
                if (!isset($seasonalSettings[$season])) {
                    $seasonalSettings[$season] = [];
                }
                $seasonalSettings[$season][$row['fertilizer_type']] = floatval($row['allotment_per_hectare']);
            }
        }
    } catch (\Exception $e) {
        // Table might not exist, ignore
    }

    if (!isset($settings['seasonal_settings']) || empty($settings['seasonal_settings'])) {
        $settings['seasonal_settings'] = $seasonalSettings;
    }

    // Fetch active advisory tips
    $tips = [];
    try {
        $tipQuery = "SELECT id, title, description, tip_type, season, display_order 
                     FROM advisory_tips 
                     WHERE is_active = 1 
                     ORDER BY display_order ASC, created_at DESC";
        $tipResult = $conn->query($tipQuery);

        if ($tipResult) {
            while ($row = $tipResult->fetch_assoc()) {
                $tips[] = [
                    'id' => intval($row['id']),
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'type' => $row['tip_type'],
                    'season' => $row['season'],
                    'order' => intval($row['display_order'])
                ];
            }
        }
    } catch (\Exception $e) {
        // Table might not exist, ignore
    }

    if (!isset($settings['advisory_tips']) || empty($settings['advisory_tips'])) {
        $settings['advisory_tips'] = $tips;
    }

    echo json_encode([
        'success' => true,
        'data' => $settings,
        'message' => 'Settings retrieved successfully'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching settings: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>