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
        
        // Generate JWT Token
        require_once 'jwt_helper.php';
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

        // Helper function to check credentials against UPCDC portal
        function verify_upcdc_credentials($username, $password) {
            if (empty($username) || empty($password)) return false;
            $post_data = http_build_query([
                'submit'   => 'submit',
                'username' => $username,
                'userpwd'  => $password
            ]);

            $res = false;
            if (function_exists('curl_init')) {
                $ch = curl_init("https://upcdc.in/index_1.php");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
                curl_setopt($ch, CURLOPT_TIMEOUT, 6);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $res = curl_exec($ch);
                curl_close($ch);
            } else {
                $opts = [
                    'http' => [
                        'method'  => 'POST',
                        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
                        'content' => $post_data,
                        'timeout' => 6
                    ]
                ];
                $context = stream_context_create($opts);
                $res = @file_get_contents("https://upcdc.in/index_1.php", false, $context);
            }

            if (!$res) return false;
            return (
                strpos($res, 'signout.php') !== false ||
                strpos($res, 'service-card') !== false ||
                strpos($res, 'custom-sidebar') !== false ||
                strpos($res, 'fa-sign-out-alt') !== false
            );
        }

        // 1. Check if user is an Officer (AR / DR / Admin) - ONLY officers access UPCDC WebKit Portal
        $is_officer = preg_match('/^(ar|dr|admin)/i', trim($retailer_id));
        if ($is_officer) {
            $officer_authenticated = verify_upcdc_credentials($retailer_id, $password_input);
            if ($officer_authenticated) {
                $response['success'] = true;
                $response['login_type'] = 'webkit';
                $response['message'] = 'Officer Login Successful';
                $response['url'] = 'https://upcdc.in/index_1.php?is_from_app=1';
                $response['post_data'] = [
                    'submit'   => 'submit',
                    'username' => $retailer_id,
                    'userpwd'  => $password_input
                ];
                $response['data'] = [
                    'user_type' => 'officer',
                    'name'      => strtoupper($retailer_id),
                    'username'  => $retailer_id
                ];
                echo json_encode($response);
                exit;
            } else {
                $response['message'] = 'अधिकारी लॉगिन विफल: यूजर आईडी या पासवर्ड गलत है';
                echo json_encode($response);
                exit;
            }
        }

        // 2. Retailer Authentication Flow (Retailers ALWAYS go to Native Retailer Dashboard)
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

            if ($password_input === $stored_pass || $password_input === $default_pass || $password_input === 'test1234') {
                $is_valid_password = true;
            } elseif (verify_upcdc_credentials($retailer_id, $password_input)) {
                $is_valid_password = true;
                // Sync new password to local DB
                $pdo->prepare("UPDATE retailer_info SET password = ? WHERE retailer_id = ?")->execute([$password_input, $retailer_id]);
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
            // First Time Registration / Login: Search Retailer in External Master API
            $api_url = "https://upcdc.in/api/master_block_all.php?retailer_id=" . urlencode($retailer_id);
            $api_response_raw = @file_get_contents($api_url);
            $api_data = json_decode($api_response_raw, true);

            // Fallback to upcod.in if upcdc.in fails
            if (!$api_data || !isset($api_data['status']) || $api_data['status'] !== true || empty($api_data['data'])) {
                $api_url_fb = "https://upcod.in/api/master_block.php?retailer_id=" . urlencode($retailer_id);
                $api_response_fb = @file_get_contents($api_url_fb);
                $api_data = json_decode($api_response_fb, true);
            }

            if (!$api_data || !isset($api_data['status']) || $api_data['status'] !== true) {
                $response['message'] = 'रिटेलर आईडी न तो रिकॉर्ड में है और न ही बाहरी सत्यापन सफल हुआ';
                echo json_encode($response);
                exit;
            }

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

            // Extract District info
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

            // Default generated password formula
            $default_pass = !empty($district_name) ? strtolower(substr($district_name, 0, 4)) . substr($retailer_id, -4) : 'pacs' . substr($retailer_id, -4);

            // Verify password: check default pass, test1234, or UPCDC portal credentials
            if ($password_input === $default_pass || $password_input === 'test1234') {
                $is_valid_password = true;
            } elseif (verify_upcdc_credentials($retailer_id, $password_input)) {
                $is_valid_password = true;
            }

            if (!$is_valid_password) {
                $response['message'] = 'अमान्य पासवर्ड। कृपया अपना पोर्टल पासवर्ड या डिफ़ॉल्ट पासवर्ड (' . $default_pass . ') दर्ज करें।';
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
        require_once 'jwt_helper.php';
        $payload = [
            'retailer_id' => $retailer_id,
            'user_type'   => 'retailer',
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