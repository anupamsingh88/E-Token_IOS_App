<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['retailer_id']) || !isset($data['password'])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$retailer_id = $data['retailer_id'];
$new_password = $data['password'];
$total_bori_capacity = intval($data['total_capacity'] ?? 0);
$visitor_cap = intval($data['daily_visitor_capacity'] ?? 0);

try {
    // 1. Fetch internal ID
    $stmt_id = $pdo->prepare("SELECT id FROM retailer_info WHERE retailer_id = ? OR id = ?");
    $stmt_id->execute([$retailer_id, $retailer_id]);
    $retailer = $stmt_id->fetch();

    if (!$retailer) {
        echo json_encode(["success" => false, "message" => "Retailer not found"]);
        exit;
    }

    $internal_id = $retailer['id'];

    // 2. Update retailer_info (Password and Capacities)
    $stmt_info = $pdo->prepare("
        UPDATE retailer_info SET 
            password = ?,
            total_bori_capacity = ?,
            daily_visitor_capacity = ?,
            forced_setup = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    $stmt_info->execute([$new_password, $total_bori_capacity, $visitor_cap, $internal_id]);

    // 3. Collect product stock updates (supports dynamic array, dictionary, or legacy keys)
    $column_map = [
        'urea' => 'UREA_stock',
        'dap'  => 'DAP_stock',
        'npk'  => 'NPK_stock',
        'mop'  => 'MOP_stock',
        'tsp'  => 'TSP_stock',
        'ssp'  => 'SSP_stock',
    ];

    $updates_to_apply = [];
    if (!empty($data['updates']) && is_array($data['updates'])) {
        foreach ($data['updates'] as $u) {
            $p = strtolower(trim($u['product_type'] ?? ''));
            if ($p) {
                $updates_to_apply[$p] = intval($u['quantity'] ?? 0);
            }
        }
    } elseif (!empty($data['stocks']) && is_array($data['stocks'])) {
        foreach ($data['stocks'] as $p => $q) {
            $p_clean = strtolower(trim($p));
            if ($p_clean) {
                $updates_to_apply[$p_clean] = intval($q);
            }
        }
    }

    // Ensure fallback for legacy 4 fertilizers if not in updates
    if (!isset($updates_to_apply['urea']) && isset($data['urea_stock'])) $updates_to_apply['urea'] = intval($data['urea_stock']);
    if (!isset($updates_to_apply['dap']) && isset($data['dap_stock']))   $updates_to_apply['dap']  = intval($data['dap_stock']);
    if (!isset($updates_to_apply['npk']) && isset($data['npk_stock']))   $updates_to_apply['npk']  = intval($data['npk_stock']);
    if (!isset($updates_to_apply['mop']) && isset($data['mop_stock']))   $updates_to_apply['mop']  = intval($data['mop_stock']);

    // 4. Save initial stock as entry for today in retailer_stock
    $date = date('Y-m-d');

    // Ensure record exists for today
    $stmt_check = $pdo->prepare("SELECT id FROM retailer_stock WHERE retailer_id = ? AND date = ?");
    $stmt_check->execute([$internal_id, $date]);
    $existing = $stmt_check->fetch();

    if (!$existing) {
        $stmt_init = $pdo->prepare("INSERT INTO retailer_stock (retailer_id, date, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
        $stmt_init->execute([$internal_id, $date]);
        $stock_id = $pdo->lastInsertId();
    } else {
        $stock_id = $existing['id'];
    }

    // Apply all product stock updates dynamically
    foreach ($updates_to_apply as $prod_type => $qty) {
        $prod_clean = strtolower(trim($prod_type));
        if (!$prod_clean) continue;
        $col_name = $column_map[$prod_clean] ?? (strtoupper($prod_clean) . '_stock');

        try {
            $stmt_upd = $pdo->prepare("UPDATE retailer_stock SET `$col_name` = ?, updated_at = NOW() WHERE id = ?");
            $stmt_upd->execute([$qty, $stock_id]);
        } catch (\PDOException $ex) {
            // Log missing column or update failure without executing runtime DDL
            error_log("Stock update error for column $col_name in retailer_stock: " . $ex->getMessage());
        }
    }

    echo json_encode(["success" => true, "message" => "Setup completed successfully and stock recorded"]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
