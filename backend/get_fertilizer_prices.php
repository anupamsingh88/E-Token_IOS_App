<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, If-None-Match');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

$cacheFile = __DIR__ . '/.cache_fertilizer_prices.json';
$cacheTtl = 60; // 60 seconds micro-cache
$forceRefresh = isset($_GET['force']) && $_GET['force'] == '1';

// Check if cache file exists and is fresh
if (!$forceRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTtl)) {
    $cachedJson = file_get_contents($cacheFile);
    if ($cachedJson) {
        $etag = md5($cachedJson);
        header("ETag: \"$etag\"");
        header("Cache-Control: public, max-age=30, stale-while-revalidate=60");
        
        $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
        if (!empty($ifNoneMatch) && trim($ifNoneMatch, '"') === $etag) {
            http_response_code(304);
            exit;
        }
        echo $cachedJson;
        exit;
    }
}

require 'db_connect.php';

try {
    // Fetch all fertilizer prices from database (prefer retailer_image_url for UPCDC app)
    $stmt = $pdo->query("SELECT fertilizer_products.id as product_pk, type_id as id, type_id as type, name, nameHindi, pricePerBag, COALESCE(retailer_image_url, imageUrl) as imageUrl FROM fertilizer_products ORDER BY fertilizer_products.id ASC");
    $prices = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $price = (float)$row['pricePerBag'];
        $row['pricePerBag'] = $price;
        $row['price'] = $price;
        $row['id'] = strtolower($row['id']);
        $row['type'] = strtolower($row['type']);

        // Automatic cache-busting based on file modification time
        if (!empty($row['imageUrl'])) {
            $imagePathOnly = explode('?', $row['imageUrl'])[0];
            $localFile = __DIR__ . '/' . ltrim(str_replace('\\', '/', $imagePathOnly), '/');
            if (file_exists($localFile)) {
                $row['imageUrl'] = $imagePathOnly . '?v=' . filemtime($localFile);
            }
        }

        $prices[] = $row;
    }

    $responsePayload = [
        'success' => true,
        'prices' => $prices,
        'lastUpdated' => date('Y-m-d H:i:s')
    ];
    $json = json_encode($responsePayload, JSON_UNESCAPED_UNICODE);

    @file_put_contents($cacheFile, $json);

    $etag = md5($json);
    header("ETag: \"$etag\"");
    header("Cache-Control: public, max-age=30, stale-while-revalidate=60");
    echo $json;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>