<?php
/**
 * Upload Media API
 * Handles logo and icon uploads for SuperAdmin
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

try {
    // Check if file was uploaded
    if (!isset($_FILES['file'])) {
        throw new Exception('No file uploaded');
    }

    $file = $_FILES['file'];
    $mediaType = isset($_POST['media_type']) ? $_POST['media_type'] : 'logo'; // 'logo' or 'icon'
    $settingKey = isset($_POST['setting_key']) ? $_POST['setting_key'] : 'logo_url';

    // Validate file
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!in_array($file['type'], $allowedTypes)) {
        throw new Exception('Invalid file type. Only JPG, PNG, and SVG are allowed.');
    }

    // Validate file size (max 5MB)
    $maxSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        throw new Exception('File size exceeds 5MB limit');
    }

    // Create upload directory if it doesn't exist
    $uploadDir = __DIR__ . '/uploads/' . $mediaType . 's/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $mediaType . '_' . time() . '_' . uniqid() . '.' . $extension;
    $filepath = $uploadDir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save uploaded file');
    }

    // Generate public URL
    $publicUrl = '/backend/uploads/' . $mediaType . 's/' . $filename;

    // Update setting in database
    $publicUrlEscaped = $conn->real_escape_string($publicUrl);
    $settingKeyEscaped = $conn->real_escape_string($settingKey);
    $updateQuery = "UPDATE app_settings 
                    SET setting_value = '$publicUrlEscaped' 
                    WHERE setting_key = '$settingKeyEscaped'";

    if (!$conn->query($updateQuery)) {
        // If update fails, delete the uploaded file
        unlink($filepath);
        throw new Exception('Failed to update setting in database');
    }

    echo json_encode([
        'success' => true,
        'message' => ucfirst($mediaType) . ' uploaded successfully',
        'data' => [
            'url' => $publicUrl,
            'filename' => $filename,
            'setting_key' => $settingKey
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>