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
            // Fetch from master_district using the user's provided query structure
            try {
                // User's provided query columns
                $sql = "SELECT `sno`, `district_name`, `division_id`, `sort_no`, `status`, `created_by`, `creation_time`, `edited_by`, `edition_time`, `admin_remarks` FROM `master_district` WHERE 1 ORDER BY `district_name` ASC";
                $stmt = $pdo->query($sql);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rows as $row) {
                    $data[] = array_merge($row, [
                        'id' => $row['sno'],
                        'name' => $row['district_name'],
                        'name_en' => $row['district_name'],
                        'name_hi' => $row['district_name']
                    ]);
                }
            } catch (Exception $e) {
                error_log("Master District Error: " . $e->getMessage());
                // Fallback (safe side)
                $data = [];
            }
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

        case 'retailer_details':
            if (!$parentId)
                throw new Exception("Retailer ID required");
            $stmt = $pdo->prepare("
                SELECT 
                    id, 
                    name, 
                    shop_name, 
                    retailer_id, 
                    district_name,
                    mobile,
                    total_bori_capacity,
                    daily_visitor_capacity
                FROM retailer_info
                WHERE id = ? OR retailer_id = ?
            ");
            $stmt->execute([$parentId, $parentId]);
            $retailer = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($retailer) {
                // Check if stock was updated today in DB
                $today = date('Y-m-d');
                $stock_stmt = $pdo->prepare("SELECT id FROM retailer_stock WHERE retailer_id = ? AND date = ?");
                $stock_stmt->execute([$retailer['id'], $today]);
                $retailer['stock_updated_today'] = (bool)$stock_stmt->fetch();
            }
            $data = $retailer;
            break;

        default:
            throw new Exception("Invalid request type");
    }

    ob_clean();
    echo json_encode(['success' => true, 'status' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>