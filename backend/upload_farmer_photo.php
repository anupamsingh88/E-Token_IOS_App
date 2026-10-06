<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$farmer_id = $_POST['farmer_id'] ?? null;
if (!$farmer_id) {
    echo json_encode(['success' => false, 'message' => 'Farmer ID required. POST: ' . json_encode($_POST)]);
    exit;
}

if (!isset($_FILES['photo'])) {
    echo json_encode(['success' => false, 'message' => 'No photo field. Files: ' . json_encode(array_keys($_FILES))]);
    exit;
}

if ($_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    $codes = [1=>'File too large (ini)',2=>'File too large (form)',3=>'Partial upload',4=>'No file',6=>'No tmp dir',7=>'Write fail',8=>'Extension blocked'];
    $code = $_FILES['photo']['error'];
    echo json_encode(['success' => false, 'message' => 'Upload error: ' . ($codes[$code] ?? 'Code '.$code)]);
    exit;
}

$file = $_FILES['photo'];
$allowed_types = ['image/jpeg', 'image/jpg', 'image/png'];
$file_type = mime_content_type($file['tmp_name']);
if (!in_array($file_type, $allowed_types)) {
    echo json_encode(['success' => false, 'message' => 'Invalid type: ' . $file_type]);
    exit;
}

$max_size = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $max_size) {
    echo json_encode(['success' => false, 'message' => 'File too large (' . round($file['size']/1024/1024,1) . 'MB). Max 5MB']);
    exit;
}

try {
    $upload_dir = __DIR__ . '/uploads/farmer_photos/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $extension = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $filename = 'farmer_' . $farmer_id . '_' . time() . '.' . $extension;
    $filepath = $upload_dir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        echo json_encode(['success' => false, 'message' => 'Failed to save photo to server']);
        exit;
    }

    // Replacement Logic: Delete old photo if exists
    $old_photo_stmt = $pdo->prepare("SELECT profile_photo FROM farmer_info WHERE farmer_id = ?");
    $old_photo_stmt->execute([$farmer_id]);
    $old_photo = $old_photo_stmt->fetchColumn();

    if ($old_photo) {
        $old_filepath = __DIR__ . '/' . $old_photo;
        if (file_exists($old_filepath) && is_file($old_filepath)) {
            unlink($old_filepath);
        }
    }

    $photo_url = 'uploads/farmer_photos/' . $filename;
    
    // Log for debugging
    file_put_contents('photo_upload_debug.log', date('Y-m-d H:i:s') . " - Farmer ID: $farmer_id, New Filename: $filename, DB Path: $photo_url\n", FILE_APPEND);
    $stmt = $pdo->prepare("UPDATE farmer_info SET profile_photo = ? WHERE farmer_id = ?");
    $stmt->execute([$photo_url, $farmer_id]);

    // rowCount can be 0 if same value — verify farmer exists separately
    $check = $pdo->prepare("SELECT farmer_id FROM farmer_info WHERE farmer_id = ?");
    $check->execute([$farmer_id]);
    if ($check->rowCount() === 0) {
        unlink($filepath);
        echo json_encode(['success' => false, 'message' => 'Farmer not found in database']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Photo uploaded successfully',
        'photo_url' => $photo_url
    ]);

} catch (PDOException $e) {
    if (isset($filepath) && file_exists($filepath)) {
        unlink($filepath);
    }
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $e->getMessage()]);
}
?>