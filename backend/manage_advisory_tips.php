<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
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
            // Get all tips (including inactive for admin)
            $query = "SELECT * FROM advisory_tips ORDER BY display_order ASC, created_at DESC";
            $result = $conn->query($query);

            $tips = [];
            while ($row = $result->fetch_assoc()) {
                $tips[] = [
                    'id' => (int) $row['id'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'tipType' => $row['tip_type'],
                    'season' => $row['season'],
                    'displayOrder' => (int) $row['display_order'],
                    'isActive' => (bool) $row['is_active'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }

            echo json_encode(['success' => true, 'data' => $tips]);
            break;

        case 'POST':
            // Add new tip
            $title = $input['title'] ?? '';
            $description = $input['description'] ?? '';
            $tipType = $input['tipType'] ?? 'general';
            $season = $input['season'] ?? 'All';
            $displayOrder = $input['displayOrder'] ?? 0;
            $isActive = $input['isActive'] ?? true;

            if (empty($title) || empty($description)) {
                throw new Exception('Title and description are required');
            }

            $stmt = $conn->prepare(
                "INSERT INTO advisory_tips (title, description, tip_type, season, display_order, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("ssssii", $title, $description, $tipType, $season, $displayOrder, $isActive);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Advisory tip added successfully',
                'id' => $conn->insert_id
            ]);
            break;

        case 'PUT':
            // Update existing tip
            $id = $input['id'] ?? 0;
            $title = $input['title'] ?? '';
            $description = $input['description'] ?? '';
            $tipType = $input['tipType'] ?? 'general';
            $season = $input['season'] ?? 'All';
            $displayOrder = $input['displayOrder'] ?? 0;
            $isActive = $input['isActive'] ?? true;

            if (!$id || empty($title) || empty($description)) {
                throw new Exception('ID, title, and description are required');
            }

            $stmt = $conn->prepare(
                "UPDATE advisory_tips 
                 SET title = ?, description = ?, tip_type = ?, season = ?, display_order = ?, is_active = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("ssssiid", $title, $description, $tipType, $season, $displayOrder, $isActive, $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Advisory tip updated successfully'
            ]);
            break;

        case 'DELETE':
            // Delete tip
            $id = $input['id'] ?? 0;

            if (!$id) {
                throw new Exception('ID is required');
            }

            $stmt = $conn->prepare("DELETE FROM advisory_tips WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Advisory tip deleted successfully'
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