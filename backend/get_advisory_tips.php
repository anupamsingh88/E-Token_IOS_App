<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';

// Get optional filters
$season = isset($_GET['season']) ? $_GET['season'] : null;
$tipType = isset($_GET['tip_type']) ? $_GET['tip_type'] : null;

try {
    // Build query
    $query = "SELECT * FROM advisory_tips WHERE is_active = 1";
    $params = [];
    $types = "";

    if ($season && $season !== 'All') {
        $query .= " AND (season = ? OR season = 'All')";
        $params[] = $season;
        $types .= "s";
    }

    if ($tipType) {
        $query .= " AND tip_type = ?";
        $params[] = $tipType;
        $types .= "s";
    }

    $query .= " ORDER BY display_order ASC, created_at DESC";

    $stmt = $conn->prepare($query);

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

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

    echo json_encode([
        'success' => true,
        'data' => $tips,
        'count' => count($tips)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch advisory tips',
        'error' => $e->getMessage()
    ]);
}

$conn->close();
?>