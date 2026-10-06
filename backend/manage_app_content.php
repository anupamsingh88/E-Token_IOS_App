<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            // Get all content (including inactive for admin)
            $query = "SELECT * FROM app_content ORDER BY category ASC, display_order ASC";
            $result = $conn->query($query);

            $content = [];
            while ($row = $result->fetch_assoc()) {
                $content[] = [
                    'id' => (int) $row['id'],
                    'contentKey' => $row['content_key'],
                    'contentValue' => $row['content_value'],
                    'contentType' => $row['content_type'],
                    'category' => $row['category'],
                    'displayOrder' => (int) $row['display_order'],
                    'isActive' => (bool) $row['is_active']
                ];
            }

            echo json_encode(['success' => true, 'data' => $content]);
            break;

        case 'POST':
            // Add new content
            $contentKey = $input['contentKey'] ?? '';
            $contentValue = $input['contentValue'] ?? '';
            $contentType = $input['contentType'] ?? 'text';
            $category = $input['category'] ?? '';
            $displayOrder = $input['displayOrder'] ?? 0;
            $isActive = $input['isActive'] ?? true;

            if (empty($contentKey) || empty($contentValue) || empty($category)) {
                throw new Exception('Content key, value, and category are required');
            }

            $stmt = $conn->prepare(
                "INSERT INTO app_content (content_key, content_value, content_type, category, display_order, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("ssssii", $contentKey, $contentValue, $contentType, $category, $displayOrder, $isActive);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Content added successfully',
                'id' => $conn->insert_id
            ]);
            break;

        case 'PUT':
            // Update existing content
            $id = $input['id'] ?? 0;
            $contentValue = $input['contentValue'] ?? '';

            if (!$id || empty($contentValue)) {
                throw new Exception('ID and content value are required');
            }

            $stmt = $conn->prepare("UPDATE app_content SET content_value = ? WHERE id = ?");
            $stmt->bind_param("si", $contentValue, $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Content updated successfully'
            ]);
            break;

        case 'DELETE':
            // Delete content
            $id = $input['id'] ?? 0;

            if (!$id) {
                throw new Exception('ID is required');
            }

            $stmt = $conn->prepare("DELETE FROM app_content WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Content deleted successfully'
            ]);
            break;

        default:
            throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>