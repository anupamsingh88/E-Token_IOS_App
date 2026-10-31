<?php
/**
 * upload_temp_pdf.php
 * Secure endpoint to stage a PDF temporarily for in-browser / in-app viewing via view_pdf.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$tempDir = __DIR__ . '/uploads/temp_previews/';
if (!is_dir($tempDir)) {
    @mkdir($tempDir, 0755, true);
}

// Auto-cleanup: remove preview files older than 2 hours to avoid disk buildup
if (is_dir($tempDir)) {
    $now = time();
    $files = glob($tempDir . '*');
    if ($files) {
        foreach ($files as $f) {
            if (is_file($f) && ($now - filemtime($f) > 7200)) {
                @unlink($f);
            }
        }
    }
}

$fileKey = null;
if (isset($_FILES['pdf'])) {
    $fileKey = 'pdf';
} elseif (isset($_FILES['file'])) {
    $fileKey = 'file';
}

if (!$fileKey || !isset($_FILES[$fileKey]['tmp_name']) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
    echo json_encode([
        'success' => false,
        'message' => 'कोई वैध PDF फ़ाइल प्राप्त नहीं हुई'
    ]);
    exit;
}

$uploadedFile = $_FILES[$fileKey];

// Size limit: 15MB
if ($uploadedFile['size'] > 15 * 1024 * 1024) {
    echo json_encode([
        'success' => false,
        'message' => 'फ़ाइल का आकार 15MB से कम होना चाहिए'
    ]);
    exit;
}

// Generate unique safe filename
$ext = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));
if ($ext !== 'pdf') {
    $ext = 'pdf';
}

$uniqueName = 'temp_preview_' . bin2hex(random_bytes(8)) . '_' . time() . '.' . $ext;
$targetPath = $tempDir . $uniqueName;

if (move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
    echo json_encode([
        'success' => true,
        'file_path' => 'uploads/temp_previews/' . $uniqueName,
        'file_name' => $uniqueName,
        'message' => 'PDF सफलतापूर्वक तैयार किया गया'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'फ़ाइल सहेजने में विफल'
    ]);
}
?>

