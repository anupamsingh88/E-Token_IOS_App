<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';



$category = isset($_GET['category']) ? $_GET['category'] : null;
$app = isset($_GET['app']) ? strtolower(trim($_GET['app'])) : null;

try {
    $query = "SELECT * FROM app_content WHERE is_active = 1";
    $params = [];
    $types = "";

    if ($category) {
        $query .= " AND category = ?";
        $params[] = $category;
        $types .= "s";
    }

    if ($app === 'farmer' || $app === 'urvarak_setu') {
        $query .= " AND content_key NOT LIKE 'retailer_%'";
    } elseif ($app === 'retailer' || $app === 'upcdc') {
        $query .= " AND content_key NOT LIKE 'farmer_%'";
    }

    $query .= " ORDER BY display_order ASC, id ASC";

    $stmt = $conn->prepare($query);

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

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

    echo json_encode([
        'success' => true,
        'data' => $content,
        'count' => count($content)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch app content',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>