<?php
/**
 * Authentication Middleware
 * Include this at the top of any file that requires a valid JWT token.
 */

require_once 'db_connect.php'; // Ensures $_ENV and DB are loaded
require_once 'jwt_helper.php';

$auth_user = null;

function get_authorization_header() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('getallheaders')) {
        $requestHeaders = getallheaders();
        // Server key can be uppercase or case-insensitive
        foreach ($requestHeaders as $key => $value) {
            if (strtolower($key) == 'authorization') {
                $headers = trim($value);
                break;
            }
        }
    }
    return $headers;
}

$authHeader = get_authorization_header();

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Token missing']);
    exit;
}

$token = $matches[1];
$decoded = JWTHelper::decode($token);

if (!$decoded) {
    header('HTTP/1.1 401 Unauthorized');
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Invalid or expired token']);
    exit;
}

// Global user object to be used in endpoints
$auth_user = $decoded;
