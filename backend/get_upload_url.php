<?php
/**
 * API Endpoint: Generate Direct AWS S3 Upload URL
 * 
 * Flow:
 * 1. Mobile app calls this endpoint before uploading image/document.
 * 2. Receives a signed upload_url (valid for 15 minutes) and a public_url.
 * 3. App sends a direct HTTP PUT request to AWS S3 with binary image.
 * 4. App sends public_url to update_farmer_profile.php or upload_farmer_photo.php.
 * 
 * Result: 0% Server CPU used for heavy image file uploads!
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 's3_config.php';

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$folder    = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['folder'] ?? 'uploads');
$filename  = $input['filename'] ?? ('file_' . time() . '_' . bin2hex(random_bytes(4)));
$mimeType  = $input['mime_type'] ?? 'image/jpeg';
$extension = pathinfo($filename, PATHINFO_EXTENSION) ?: 'jpg';

// Unique S3 object key
$objectKey = $folder . '/' . date('Y/m/') . uniqid('up_', true) . '.' . $extension;

try {
    $result = S3Helper::getPresignedPutUrl($objectKey, $mimeType, 900); // 15 mins expiry
    
    echo json_encode([
        'success'    => true,
        'upload_url' => $result['upload_url'],
        'public_url' => $result['public_url'],
        'object_key' => $result['object_key'],
        'expires_in' => $result['expires_in']
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to generate upload URL: ' . $e->getMessage()
    ]);
}

