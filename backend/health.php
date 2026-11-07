<?php
/**
 * AWS Route 53 / External Uptime Monitor Health Check Endpoint
 * 
 * Returns HTTP 200 OK when server and database are operational.
 * Returns HTTP 503 Service Unavailable when DB is down or server overloaded.
 * 
 * Target latency: < 15ms
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$startTime = microtime(true);
$response = [
    'status'    => 'DOWN',
    'timestamp' => date('c'),
    'server_id' => gethostname() ?: 'PHYSICAL_SERVER_PRIMARY',
    'checks'    => [
        'php'   => 'OK',
        'db'    => 'UNKNOWN',
        'load'  => 'UNKNOWN'
    ],
    'latency_ms'=> 0
];

// Check Server CPU / Load Average (Linux / Unix servers)
if (function_exists('sys_getloadavg')) {
    $load = sys_getloadavg();
    $response['checks']['load'] = [
        '1min'  => round($load[0], 2),
        '5min'  => round($load[1], 2),
        '15min' => round($load[2], 2)
    ];
    // If 1-minute load average is dangerously high (> 32 on a 16-core system)
    if ($load[0] > 40.0) {
        http_response_code(503);
        $response['status'] = 'OVERLOADED';
        $response['latency_ms'] = round((microtime(true) - $startTime) * 1000, 2);
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }
}

// Load environment variables if available
if (file_exists(__DIR__ . '/env.php')) {
    require_once __DIR__ . '/env.php';
}

// Check Database Connectivity
try {
    // Suppress die() from default db_connect by setting error mode
    $host = getenv('DB_HOST') ?: 'localhost';
    $db   = getenv('DB_NAME') ?: 'sfms_app';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: 'mysql';
    $port = getenv('DB_PORT') ?: 3306;

    // Fast PDO check with 2-second timeout
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT            => 2,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ];
    $pdoHealth = new PDO($dsn, $user, $pass, $options);
    
    // Simple ping query
    $stmt = $pdoHealth->query("SELECT 1 AS alive");
    $result = $stmt->fetch();

    if ($result && isset($result['alive']) && $result['alive'] == 1) {
        $response['checks']['db'] = 'OK';
        $response['status'] = 'UP';
        http_response_code(200);
    } else {
        throw new Exception("Unexpected DB ping result");
    }
} catch (Throwable $e) {
    http_response_code(503);
    $response['status'] = 'DOWN';
    $response['checks']['db'] = 'FAILED: ' . $e->getMessage();
}

$response['latency_ms'] = round((microtime(true) - $startTime) * 1000, 2);
echo json_encode($response, JSON_PRETTY_PRINT);
exit;

