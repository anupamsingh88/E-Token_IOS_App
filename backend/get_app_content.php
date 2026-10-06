<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connect.php';

// Auto-create app_content table and seed default data if not exists
$tableCheck = $conn->query("SHOW TABLES LIKE 'app_content'");
if ($tableCheck->num_rows === 0) {
    $conn->query("CREATE TABLE app_content (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        content_key   VARCHAR(100) NOT NULL UNIQUE,
        content_value TEXT         NOT NULL,
        content_type  VARCHAR(20)  NOT NULL DEFAULT 'text',
        category      VARCHAR(50)  NOT NULL,
        display_order INT          NOT NULL DEFAULT 0,
        is_active     TINYINT(1)   NOT NULL DEFAULT 1,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Insert default seed content
    $conn->query("INSERT INTO app_content (content_key, content_value, content_type, category, display_order) VALUES
        ('app_name',          'SFMS - Krishak Seva',           'text',  'general', 1),
        ('welcome_message',   'Kisan Seva Mein Aapka Swagat Hai!', 'text', 'general', 2),
        ('helpline_number',   '1800-XXX-XXXX',                 'text',  'contact', 1),
        ('helpline_email',    'support@sfms.gov.in',           'text',  'contact', 2),
        ('advisory_tip_1',    'Kharif mausam mein Urea ka upyog samay par karein.', 'text', 'advisory', 1),
        ('advisory_tip_2',    'DAP ka upyog buwai ke samay karein behtar paidal ke liye.', 'text', 'advisory', 2),
        ('advisory_tip_3',    'NPK ka santulit upyog mitti ki gunvatta badhata hai.',       'text', 'advisory', 3),
        ('notice_1',          'Fertilizer vitran ka samay: Subah 9 baje se sham 5 baje tak.', 'text', 'notice', 1),
        ('footer_text',       '© 2026 SFMS. Sabhi adhikar surakshit.', 'text', 'general', 99)
    ");
}


$category = isset($_GET['category']) ? $_GET['category'] : null;

try {
    $query = "SELECT * FROM app_content WHERE is_active = 1";
    $params = [];
    $types = "";

    if ($category) {
        $query .= " AND category = ?";
        $params[] = $category;
        $types = "s";
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