<?php
/**
 * Manage Advisory Tips API
 * Add, update, delete, and reorder advisory tips
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    switch ($method) {
        case 'POST': // Add new tip
            if (!isset($input['title']) || !isset($input['description'])) {
                throw new Exception('Title and description are required');
            }

            $title = $conn->real_escape_string($input['title']);
            $description = $conn->real_escape_string($input['description']);
            $tipType = isset($input['tip_type']) ? $conn->real_escape_string($input['tip_type']) : 'general';
            $season = isset($input['season']) ? $conn->real_escape_string($input['season']) : 'All';
            $displayOrder = isset($input['display_order']) ? intval($input['display_order']) : 0;

            $query = "INSERT INTO advisory_tips (title, description, tip_type, season, display_order, is_active) 
                      VALUES ('$title', '$description', '$tipType', '$season', $displayOrder, 1)";

            if (!$conn->query($query)) {
                throw new Exception("Failed to add tip: " . $conn->error);
            }

            $newId = $conn->insert_id;

            echo json_encode([
                'success' => true,
                'message' => 'Advisory tip added successfully',
                'data' => ['id' => $newId]
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT': // Update existing tip
            if (!isset($input['id'])) {
                throw new Exception('Tip ID is required');
            }

            $id = intval($input['id']);
            $updates = [];

            if (isset($input['title'])) {
                $title = $conn->real_escape_string($input['title']);
                $updates[] = "title = '$title'";
            }
            if (isset($input['description'])) {
                $description = $conn->real_escape_string($input['description']);
                $updates[] = "description = '$description'";
            }
            if (isset($input['tip_type'])) {
                $tipType = $conn->real_escape_string($input['tip_type']);
                $updates[] = "tip_type = '$tipType'";
            }
            if (isset($input['season'])) {
                $season = $conn->real_escape_string($input['season']);
                $updates[] = "season = '$season'";
            }
            if (isset($input['display_order'])) {
                $displayOrder = intval($input['display_order']);
                $updates[] = "display_order = $displayOrder";
            }
            if (isset($input['is_active'])) {
                $isActive = intval($input['is_active']);
                $updates[] = "is_active = $isActive";
            }

            if (empty($updates)) {
                throw new Exception('No fields to update');
            }

            $updateStr = implode(', ', $updates);
            $query = "UPDATE advisory_tips SET $updateStr WHERE id = $id";

            if (!$conn->query($query)) {
                throw new Exception("Failed to update tip: " . $conn->error);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Advisory tip updated successfully'
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE': // Delete tip
            if (!isset($input['id'])) {
                throw new Exception('Tip ID is required');
            }

            $id = intval($input['id']);
            $query = "DELETE FROM advisory_tips WHERE id = $id";

            if (!$conn->query($query)) {
                throw new Exception("Failed to delete tip: " . $conn->error);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Advisory tip deleted successfully'
            ], JSON_UNESCAPED_UNICODE);
            break;

        default:
            throw new Exception('Invalid request method');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>