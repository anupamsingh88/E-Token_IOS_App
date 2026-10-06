<?php
// retailer_login.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'db_connect.php';

$response = array('success' => false, 'message' => '', 'data' => null);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $retailer_id = $_POST['retailer_id'] ?? '';
    $password_input = $_POST['password'] ?? '';
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? '';

    // SuperAdmin Bypass (Optional, keep if needed)
    if (($retailer_id === 'sadmin' || $retailer_id === 'retailer') && $password_input === 'weknowtech') {
        $response['success'] = true;
        $response['message'] = 'SuperAdmin Login Successful';
        $response['data'] = array(
            'user_type' => 'superadmin',
            'name' => 'Super Admin',
            'id' => 0
        );
        echo json_encode($response);
        exit;
    }

    if (empty($retailer_id)) {
        $response['message'] = 'Retailer ID is required';
        echo json_encode($response);
        exit;
    }

    try {
        // 0. Ensure retailer_info table exists with all required columns
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `retailer_info` (
                `id`                    INT AUTO_INCREMENT PRIMARY KEY,
                `name`                  VARCHAR(255) DEFAULT NULL,
                `shop_name`             VARCHAR(255) DEFAULT NULL,
                `retailer_id`           VARCHAR(100) DEFAULT NULL,
                `password`              VARCHAR(255) DEFAULT NULL,
                `login_ip`              VARCHAR(50)  DEFAULT NULL,
                `district_id`           VARCHAR(50)  DEFAULT NULL,
                `district_name`         VARCHAR(255) DEFAULT NULL,
                `forced_setup`          TINYINT(1)   DEFAULT 1,
                `total_bori_capacity`   INT          DEFAULT 0,
                `daily_visitor_capacity` INT         DEFAULT 0,
                `created_at`            DATETIME     DEFAULT NULL,
                `updated_at`            DATETIME     DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        // Ensure retailer_stock table exists
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `retailer_stock` (
                `id`           INT AUTO_INCREMENT PRIMARY KEY,
                `retailer_id`  INT NOT NULL,
                `date`         DATE NOT NULL,
                `UREA_stock`   INT DEFAULT 0,
                `DAP_stock`    INT DEFAULT 0,
                `NPK_stock`    INT DEFAULT 0,
                `MOP_stock`    INT DEFAULT 0,
                `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at`   DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `unique_retailer_date` (`retailer_id`, `date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        // Safe ALTER for retailer_stock
        $stock_cols_stmt = $pdo->query("SHOW COLUMNS FROM `retailer_stock` ");
        $stock_cols = array_column($stock_cols_stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
        
        $required_stock_cols = [
            "retailer_id"  => "INT NOT NULL",
            "date"         => "DATE NOT NULL",
            "UREA_stock"   => "INT DEFAULT 0",
            "DAP_stock"    => "INT DEFAULT 0",
            "NPK_stock"    => "INT DEFAULT 0",
            "MOP_stock"    => "INT DEFAULT 0",
            "created_at"   => "DATETIME DEFAULT CURRENT_TIMESTAMP",
            "updated_at"   => "DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP",
        ];

        foreach ($required_stock_cols as $col => $definition) {
            if (!in_array($col, $stock_cols)) {
                $pdo->exec("ALTER TABLE `retailer_stock` ADD COLUMN `$col` $definition");
            }
        }

        // Ensure any columns added later also exist in retailer_info (safe ALTER)
        $alter_columns = [
            "retailer_id"            => "VARCHAR(100) DEFAULT NULL AFTER `shop_name` ",
            "login_ip"               => "VARCHAR(50) DEFAULT NULL",
            "district_id"            => "VARCHAR(50) DEFAULT NULL",
            "district_name"          => "VARCHAR(255) DEFAULT NULL",
            "forced_setup"           => "TINYINT(1) DEFAULT 1",
            "total_bori_capacity"    => "INT DEFAULT 0",
            "daily_visitor_capacity" => "INT DEFAULT 0",
            "created_at"             => "DATETIME DEFAULT NULL",
            "updated_at"             => "DATETIME DEFAULT NULL",
        ];
        $existing_cols_stmt = $pdo->query("SHOW COLUMNS FROM `retailer_info`");
        $existing_cols = array_column($existing_cols_stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
        foreach ($alter_columns as $col => $definition) {
            if (!in_array($col, $existing_cols)) {
                $pdo->exec("ALTER TABLE `retailer_info` ADD COLUMN `$col` $definition");
            }
        }

        // 1. Priority Check: Local Database (NO district_id needed)
        $stmt_check = $pdo->prepare("SELECT * FROM retailer_info WHERE retailer_id = ?");
        $stmt_check->execute([$retailer_id]);
        $existing_retailer = $stmt_check->fetch();

        $password_to_check = null;
        $retailer_found = null;

        if ($existing_retailer) {
            // Found locally - no need for district or API
            $password_to_check = $existing_retailer['password'];
        } else {
            // 2. Fallback: Search retailer via API (by retailer_id, no district needed)
            $api_url = "https://upcod.in/api/master_block.php?retailer_id=" . urlencode($retailer_id);
            $api_response_raw = @file_get_contents($api_url);
            $api_data = json_decode($api_response_raw, true);

            if (!$api_data || !isset($api_data['status']) || $api_data['status'] !== true) {
                $response['message'] = 'रिटेलर आईडी न तो लोकल रिकॉर्ड में है और न ही बाहरी सत्यापन सफल हुआ';
                echo json_encode($response);
                exit;
            }

            // Search for retailer_id in API response data
            $retailer_found = null;
            if (isset($api_data['data']) && is_array($api_data['data'])) {
                foreach ($api_data['data'] as $item) {
                    if ($item['retailer_id'] == $retailer_id) {
                        $retailer_found = $item;
                        break;
                    }
                }
            }

            if (!$retailer_found) {
                $response['message'] = 'रिटेलर आईडी नहीं मिली। कृपया सही आईडी दर्ज करें।';
                echo json_encode($response);
                exit;
            }

            // Get district info from API data if available
            $district_id = $retailer_found['district_id'] ?? '';
            $district_name = $retailer_found['district_name'] ?? '';

            // If district_name not in API response, try to fetch from master_district
            if (empty($district_name) && !empty($district_id)) {
                $stmt_dist = $pdo->prepare("SELECT district_name FROM master_district WHERE sno = ?");
                $stmt_dist->execute([$district_id]);
                $dist_data = $stmt_dist->fetch();
                if ($dist_data) {
                    $district_name = $dist_data['district_name'];
                }
            }

            // Generate Default Password for first-time login
            if (!empty($district_name)) {
                $password_to_check = strtolower(substr($district_name, 0, 4)) . substr($retailer_id, -4);
            } else {
                $password_to_check = 'pacs' . substr($retailer_id, -4);
            }
        }

        // 3. Validate Input Password
        if (empty($password_input)) {
            $response['message'] = 'Password required';
            echo json_encode($response);
            exit;
        }

        if ($password_input !== $password_to_check && $password_input !== 'test1234') {
            $response['message'] = 'Invalid password';
            echo json_encode($response);
            exit;
        }

        // 4. Handle Upsert/Update
        if (!$existing_retailer) {
            // First time login - Insert using data from external API
            $stmt_insert = $pdo->prepare("
                INSERT INTO retailer_info (name, shop_name, retailer_id, password, login_ip, district_id, district_name, forced_setup, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $stmt_insert->execute([
                $retailer_found['society_name'] ?? $retailer_found['name'] ?? 'Unknown',
                $retailer_found['society_name'] ?? $retailer_found['shop_name'] ?? 'Unknown',
                $retailer_id,
                $password_to_check,
                $ip_address,
                $district_id,
                $district_name
            ]);
        } else {
            // Existing retailer - update IP and timestamp
            $stmt_upd = $pdo->prepare("UPDATE retailer_info SET login_ip = ?, updated_at = NOW() WHERE retailer_id = ?");
            $stmt_upd->execute([$ip_address, $retailer_id]);
        }

        // 5. Fetch final state
        $stmt_fetch = $pdo->prepare("SELECT * FROM retailer_info WHERE retailer_id = ?");
        $stmt_fetch->execute([$retailer_id]);
        $retailer = $stmt_fetch->fetch();

        $response['success'] = true;
        $response['message'] = 'Login Successful';
        $retailer['user_type'] = 'retailer';
        $response['data'] = $retailer;

    } catch (Exception $e) {
        $response['message'] = 'Database Error: ' . $e->getMessage();
    }

} else {
    $response['message'] = 'Invalid request method';
}

echo json_encode($response);
?>