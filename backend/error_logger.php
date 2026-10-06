<?php
/**
 * Professional Error Logging & Masking Utility
 * Categorizes errors, logs technical details privately, and returns safe Hindi messages to users.
 */

function log_error($exception, $custom_message = "सर्वर त्रुटि: कृपया बाद में प्रयास करें।") {
    $log_dir = __DIR__ . '/logs';
    $log_file = $log_dir . '/error.log';

    // 1. Ensure logs directory exists
    if (!file_exists($log_dir)) {
        mkdir($log_dir, 0777, true);
    }

    // 2. Format the detailed technical log entry
    $timestamp = date('Y-m-d H:i:s');
    $file = $exception->getFile();
    $line = $exception->getLine();
    $message = $exception->getMessage();
    $trace = $exception->getTraceAsString();
    $request_uri = $_SERVER['REQUEST_URI'] ?? 'N/A';

    $log_entry = "[$timestamp] [URI: $request_uri] [FILE: $file] [LINE: $line]\n";
    $log_entry .= "MESSAGE: $message\n";
    $log_entry .= "TRACE:\n$trace\n";
    $log_entry .= "------------------------------------------------------------\n";

    // 3. Save to private server log
    file_put_contents($log_file, $log_entry, FILE_APPEND);

    // 4. Clean any previous output (headers, echoes) to ensure pure JSON
    if (ob_get_length()) ob_clean();

    // 5. Send clean, safe, and professional Hindi response to user
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false,
        'message' => $custom_message
    ]);
    exit;
}
?>
