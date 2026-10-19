<?php
// retailer_login.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'db_connect.php';
require_once 'upcdc_auth_helper.php';
require_once 'jwt_helper.php';

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
        
        // Generate JWT Token
        $payload = [
            'retailer_id' => 'sadmin',
            'user_type' => 'superadmin',
            'exp' => time() + (60 * 60 * 24 * 30)
        ];
        $response['token'] = JWTHelper::encode($payload);
        
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

        // 1. Retailer Authentication Flow (First priority: Native Retailer App)
        $stmt_check = $pdo->prepare("SELECT * FROM retailer_info WHERE retailer_id = ?");
        $stmt_check->execute([$retailer_id]);
        $existing_retailer = $stmt_check->fetch();

        $retailer_found = null;
        $is_valid_password = false;

        if ($existing_retailer) {
            // Existing Retailer in Local DB
            $stored_pass = $existing_retailer['password'];
            $district_name = $existing_retailer['district_name'] ?? '';
            $default_pass = !empty($district_name) ? strtolower(substr($district_name, 0, 4)) . substr($retailer_id, -4) : 'pacs' . substr($retailer_id, -4);

            if ($password_input === $stored_pass || strcasecmp($password_input, $default_pass) === 0 || $password_input === 'test1234' || verify_upcdc_credentials($retailer_id, $password_input)) {
                $is_valid_password = true;
            }

            if (!$is_valid_password) {
                $response['message'] = 'पासवर्ड गलत है। कृपया सही पासवर्ड दर्ज करें।';
                echo json_encode($response);
                exit;
            }

            // Update IP and timestamp
            $stmt_upd = $pdo->prepare("UPDATE retailer_info SET login_ip = ?, updated_at = NOW() WHERE retailer_id = ?");
            $stmt_upd->execute([$ip_address, $retailer_id]);

        } else {
            // Not in local DB -> Check External Master Retailer API (master_block_all.php / master_block.php)
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 4,
                    'ignore_errors' => true
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false
                ]
            ]);

            $api_url = "https://upcdc.in/api/master_block_all.php?retailer_id=" . urlencode($retailer_id);
            $api_response_raw = @file_get_contents($api_url, false, $ctx);
            $api_data = $api_response_raw ? json_decode($api_response_raw, true) : null;

            // Fallback to upcod.in if upcdc.in fails or returns empty data
            if (!$api_data || !isset($api_data['status']) || $api_data['status'] !== true || empty($api_data['data'])) {
                $api_url_fb = "https://upcod.in/api/master_block.php?retailer_id=" . urlencode($retailer_id);
                $api_response_fb = @file_get_contents($api_url_fb, false, $ctx);
                $api_data = $api_response_fb ? json_decode($api_response_fb, true) : null;
            }

            if ($api_data && isset($api_data['status']) && $api_data['status'] === true && isset($api_data['data']) && is_array($api_data['data'])) {
                foreach ($api_data['data'] as $item) {
                    if (isset($item['retailer_id']) && (string)$item['retailer_id'] === (string)$retailer_id) {
                        $retailer_found = $item;
                        break;
                    }
                }
            }

            if ($retailer_found) {
                // Found in Master API -> This user IS a Retailer! Authenticate into Native App
                $district_id = $retailer_found['district_id'] ?? '';
                $district_name = $retailer_found['district_name'] ?? '';

                if (empty($district_name) && !empty($district_id)) {
                    $stmt_dist = $pdo->prepare("SELECT district_name FROM master_district WHERE sno = ?");
                    $stmt_dist->execute([$district_id]);
                    $dist_data = $stmt_dist->fetch();
                    if ($dist_data) {
                        $district_name = $dist_data['district_name'];
                    }
                }

                $default_pass = !empty($district_name) ? strtolower(substr($district_name, 0, 4)) . substr($retailer_id, -4) : 'pacs' . substr($retailer_id, -4);

                // Verify password: check default pass, test1234, or UPCDC portal credentials
                if ($password_input === $default_pass || $password_input === 'test1234') {
                    $is_valid_password = true;
                } elseif (verify_upcdc_credentials($retailer_id, $password_input)) {
                    $is_valid_password = true;
                }

                if (!$is_valid_password) {
                    $response['message'] = 'अमान्य पासवर्ड। कृपया सही पासवर्ड दर्ज करें।';
                    echo json_encode($response);
                    exit;
                }

                // First time registration: Insert new retailer into retailer_info with forced_setup = 1
                $stmt_insert = $pdo->prepare("
                    INSERT INTO retailer_info (name, shop_name, retailer_id, password, login_ip, district_id, district_name, forced_setup, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                ");
                $stmt_insert->execute([
                    $retailer_found['society_name'] ?? $retailer_found['name'] ?? 'Unknown',
                    $retailer_found['society_name'] ?? $retailer_found['shop_name'] ?? 'Unknown',
                    $retailer_id,
                    $password_input,
                    $ip_address,
                    $district_id,
                    $district_name
                ]);
            } else {
                // Not found in local DB and not found in Master Retailer records.
                // 2. Check if this is a Departmental Officer (AR, DR, ADO, ADCO, etc.) for UPCDC Portal
                $upcdc_result = check_upcdc_user($retailer_id, $password_input);
                if (!empty($upcdc_result['found'])) {
                    if (!empty($upcdc_result['valid'])) {
                        // UPCDC Officer Authentication Successful -> Return WebKit Launch Payload
                        $response['success'] = true;
                        $response['login_type'] = 'webkit';
                        $response['message'] = 'UPCDC पोर्टल में आपका स्वागत है!';
                        $response['url'] = defined('UPCDC_PORTAL_URL') ? UPCDC_PORTAL_URL : 'https://upcdc.in/index_1.php?is_from_app=1';
                        $response['post_data'] = [
                            'submit'   => 'submit',
                            'username' => $retailer_id,
                            'userpwd'  => $password_input
                        ];
                        $response['data'] = [
                            'username'  => $upcdc_result['username'] ?? $retailer_id,
                            'name'      => $upcdc_result['name'] ?? $retailer_id,
                            'user_type' => $upcdc_result['user_type'] ?? 'upcdc'
                        ];
                        echo json_encode($response);
                        exit;
                    } else {
                        // Officer found in UPCDC DB, but invalid password
                        $response['success'] = false;
                        $response['message'] = 'अमान्य पासवर्ड। कृपया पुनः प्रयास करें।';
                        echo json_encode($response);
                        exit;
                    }
                }

                // Neither a Retailer nor an Officer
                $response['message'] = 'रिटेलर आईडी न तो लोकल रिकॉर्ड में है और न ही बाहरी सत्यापन सफल हुआ';
                echo json_encode($response);
                exit;
            }
        }

        // Fetch final retailer record
        $stmt_fetch = $pdo->prepare("SELECT * FROM retailer_info WHERE retailer_id = ?");
        $stmt_fetch->execute([$retailer_id]);
        $retailer = $stmt_fetch->fetch();

        $response['success'] = true;
        $response['login_type'] = 'retailer';
        $response['message'] = 'Login Successful';
        $retailer['user_type'] = 'retailer';
        $response['data'] = $retailer;
        
        // Generate JWT Token
        $payload = [
            'id'          => $retailer['id'] ?? 0,
            'retailer_id' => $retailer_id,
            'user_type'   => 'retailer',
            'name'        => $retailer['name'] ?? '',
            'exp'         => time() + (60 * 60 * 24 * 30) // 30 days
        ];
        $response['token'] = JWTHelper::encode($payload);

    } catch (Exception $e) {
        $response['message'] = 'Database Error: ' . $e->getMessage();
    }

} else {
    $response['message'] = 'Invalid request method';
}

echo json_encode($response);
?>