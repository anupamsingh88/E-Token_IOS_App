<?php
/**
 * logger.php - Professional File-based Logging System
 * Optimized to prevent DB locks by moving all logs to files.
 */

// Define the root logs directory
define('LOGS_ROOT', __DIR__ . '/logs');

/**
 * Professional Log Function
 * 
 * @param string $level       Log level (INFO, ERROR, WARNING, DEBUG, CRITICAL)
 * @param string $message     The log message
 * @param string $source      Source category (farmer, retailer, backend)
 * @param string $stack_trace Optional stack trace
 * @param mixed  $context     Additional data to log
 */
function log_message($level, $message, $source = 'backend', $stack_trace = null, $context = null) {
    // Determine category based on script name or source
    $script_path = $_SERVER['SCRIPT_FILENAME'] ?? '';
    $script_name = basename($script_path, '.php');
    
    $category = 'farmer'; // Default
    
    if (strpos($script_name, 'retailer_') === 0 || strpos($source, 'retailer') !== false) {
        $category = 'retailer';
    } elseif (strpos($script_name, 'farmer') !== false || strpos($source, 'farmer') !== false) {
        $category = 'farmer';
    } else {
        // Fallback for common backend scripts
        if ($source !== 'backend' && !empty($source)) {
            $category = $source;
        }
    }

    // Ensure directory exists
    $log_dir = LOGS_ROOT . '/' . $category;
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0777, true);
    }

    // Log file name is the API name
    $log_file = $log_dir . '/' . ($script_name ?: 'system') . '.log';

    // Format the log entry
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    
    // Request ID to track a single request across multiple log entries
    static $requestId = null;
    if ($requestId === null) {
        $requestId = substr(md5(uniqid(mt_rand(), true)), 0, 8);
    }
    
    $method = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
    
    $context_str = '';
    if ($context) {
        $context_str = " | Context: " . (is_string($context) ? $context : json_encode($context, JSON_UNESCAPED_UNICODE));
    }
    
    if ($stack_trace) {
        $context_str .= " | Stack: " . $stack_trace;
    }

    $log_entry = "[$timestamp] [$requestId] [$ip] [$method] [$level] $message$context_str\n";

    // Write to file
    file_put_contents($log_file, $log_entry, FILE_APPEND);
}

/**
 * Custom Exception Handler
 */
function custom_exception_handler($exception) {
    log_message('CRITICAL', $exception->getMessage(), 'backend', $exception->getTraceAsString());
    
    if (!headers_sent()) {
        header('Content-Type: application/json');
        echo json_encode([
            "success" => false,
            "message" => "A critical error occurred. Check system logs."
        ]);
    }
    exit;
}

/**
 * Custom Error Handler
 */
function custom_error_handler($errno, $errstr, $errfile, $errline) {
    $level = 'ERROR';
    if ($errno === E_WARNING || $errno === E_USER_WARNING) $level = 'WARNING';
    if ($errno === E_NOTICE || $errno === E_USER_NOTICE) $level = 'INFO';

    $message = "$errstr in $errfile on line $errline";
    log_message($level, $message);
    
    return false; // Allow normal error handling to continue
}

/**
 * Shutdown Handler for Fatal Errors
 */
function custom_shutdown_handler() {
    $error = error_get_last();
    if ($error !== NULL && $error['type'] === E_ERROR) {
        log_message('CRITICAL', "Fatal Error: " . $error['message'], 'backend', "File: " . $error['file'] . " Line: " . $error['line']);
    }
}

// Register Global Handlers
set_exception_handler('custom_exception_handler');
set_error_handler('custom_error_handler');
register_shutdown_function('custom_shutdown_handler');

// Suppress error display (logs will have them)
ini_set('display_errors', 0);
error_reporting(E_ALL);