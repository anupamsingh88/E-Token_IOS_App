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
$urea_stock = $data['urea_stock'] ?? 0;
$dap_stock = $data['dap_stock'] ?? 0;
$npk_stock = $data['npk_stock'] ?? 0;
$mop_stock = $data['mop_stock'] ?? 0;
$total_bori_capacity = $data['total_capacity'] ?? 0;
$visitor_cap = $data['daily_visitor_capacity'] ?? 0;

try {
    // 1. Fetch internal ID
    $stmt_id = $pdo->prepare("SELECT id FROM retailer_info WHERE retailer_id = ?");
    $stmt_id->execute([$retailer_id]);
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

    // 3. Save initial stock as entry for today in retailer_stock
    $date = date('Y-m-d');
    $stmt_daily = $pdo->prepare("
        INSERT INTO retailer_stock (
            retailer_id, 
            date, 
            UREA_stock, 
            DAP_stock, 
            NPK_stock, 
            MOP_stock, 
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            UREA_stock = VALUES(UREA_stock),
            DAP_stock = VALUES(DAP_stock),
            NPK_stock = VALUES(NPK_stock),
            MOP_stock = VALUES(MOP_stock),
            updated_at = NOW()
    ");

    $success = $stmt_daily->execute([
        $internal_id, // Use numeric ID as requested
        $date,
        $urea_stock,
        $dap_stock,
        $npk_stock,
        $mop_stock
    ]);

    if ($success) {
        echo json_encode(["success" => true, "message" => "Setup completed successfully and stock recorded"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update daily stock"]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>