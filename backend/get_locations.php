<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require 'db_connect.php';

$type = $_GET['type'] ?? '';
$parentId = $_GET['parent_id'] ?? 0;

try {
    $data = [];

    switch ($type) {
        case 'districts':
            $stmt = $pdo->query("SELECT id, name_en, name_hi FROM districts ORDER BY name_en");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'tehsils':
            if (!$parentId)
                throw new Exception("District ID required");
            $stmt = $pdo->prepare("SELECT id, name_en, name_hi FROM tehsils WHERE district_id = ? ORDER BY name_en");
            $stmt->execute([$parentId]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'blocks':
            if (!$parentId)
                throw new Exception("District ID required for blocks");
            // Blocks are mapped to districts primarily in our schema, optionally tehsils
            // If filtering by tehsil is needed, we'd need tehsil_id. 
            // For now assuming we fetch blocks by District ID as per user instruction "district lelo 5 aur 5 block" implied direct or loose mapping.
            // Let's support fetching by District ID.
            $stmt = $pdo->prepare("SELECT id, name_en, name_hi FROM blocks WHERE district_id = ? ORDER BY name_en");
            $stmt->execute([$parentId]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        case 'villages':
            if (!$parentId)
                throw new Exception("Block ID required");
            $stmt = $pdo->prepare("SELECT id, name_en, name_hi FROM villages WHERE block_id = ? ORDER BY name_en");
            $stmt->execute([$parentId]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;

        default:
            throw new Exception("Invalid request type");
    }

    echo json_encode(['success' => true, 'data' => $data]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>