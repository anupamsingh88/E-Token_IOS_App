<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'db_connect.php';



// Support both JSON input and multipart/form-data
$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);
if (!is_array($data)) {
    $data = $_POST;
} else {
    $data = array_merge($data, $_POST);
}

if (!isset($data['farmer_id']) || empty($data['farmer_id'])) {
    echo json_encode(["status" => "error", "message" => "Farmer ID is required"], JSON_UNESCAPED_UNICODE);
    exit;
}

$farmer_id = $data['farmer_id'];

// 1. Fetch current farmer data from DB
$fetch_stmt = $conn->prepare("SELECT farmer_id, status, aadhaar_photo, khatauni_photo, profile_photo FROM farmer_info WHERE farmer_id = ?");
if (!$fetch_stmt) {
    echo json_encode(["status" => "error", "message" => "Database query error"], JSON_UNESCAPED_UNICODE);
    exit;
}

$fetch_stmt->bind_param("s", $farmer_id);
$fetch_stmt->execute();
$current_farmer = $fetch_stmt->get_result()->fetch_assoc();
$fetch_stmt->close();

if (!$current_farmer) {
    echo json_encode(["status" => "error", "message" => "किसान का रिकॉर्ड नहीं मिला"], JSON_UNESCAPED_UNICODE);
    exit;
}

$current_status = (int)$current_farmer['status'];

// RULE: Only pending (status === 0) registrations can be edited before approval!
if ($current_status !== 0) {
    $msg = ($current_status === 1)
        ? "स्वीकृत (Approved) होने के बाद किसान का विवरण या मीडिया नहीं बदला जा सकता।"
        : "अस्वीकृत (Rejected) किसान का विवरण या मीडिया नहीं बदला जा सकता।";
    echo json_encode(["status" => "error", "message" => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Check which media files are being uploaded
$has_new_farmer_photo = isset($_FILES['farmer_photo']) && (
    is_array($_FILES['farmer_photo']['error'])
        ? ($_FILES['farmer_photo']['error'][0] === UPLOAD_ERR_OK)
        : ($_FILES['farmer_photo']['error'] === UPLOAD_ERR_OK)
);

$has_new_aadhaar_photo = isset($_FILES['aadhaar_photo']) && (
    is_array($_FILES['aadhaar_photo']['error'])
        ? ($_FILES['aadhaar_photo']['error'][0] === UPLOAD_ERR_OK)
        : ($_FILES['aadhaar_photo']['error'] === UPLOAD_ERR_OK)
);

$has_new_khatauni_photo = false;
if (isset($_FILES['khatauni_photo'])) {
    if (is_array($_FILES['khatauni_photo']['error'])) {
        foreach ($_FILES['khatauni_photo']['error'] as $err) {
            if ($err === UPLOAD_ERR_OK) {
                $has_new_khatauni_photo = true;
                break;
            }
        }
    } else {
        $has_new_khatauni_photo = ($_FILES['khatauni_photo']['error'] === UPLOAD_ERR_OK);
    }
}

$is_updating_media = $has_new_farmer_photo || $has_new_aadhaar_photo || $has_new_khatauni_photo;

// 3. Setup directories
$archive_base = __DIR__ . '/uploads/Previous media/';
$archive_dirs = [
    'adhhar'   => $archive_base . 'adhhar/',
    'photo'    => $archive_base . 'photo/',
    'khatauni' => $archive_base . 'khatauni copy/'
];

foreach ($archive_dirs as $d) {
    if (!file_exists($d)) {
        @mkdir($d, 0777, true);
    }
}

$active_dirs = [
    'farmer_photos'   => __DIR__ . '/uploads/farmer_photos/',
    'aadhaar_cards'   => __DIR__ . '/uploads/aadhaar_cards/',
    'khatauni_photos' => __DIR__ . '/uploads/khatauni_photos/'
];

foreach ($active_dirs as $d) {
    if (!file_exists($d)) {
        @mkdir($d, 0777, true);
    }
}

// Helper to safely archive old file
function archive_existing_file($rel_path, $archive_folder) {
    if (empty($rel_path)) return false;
    $clean = ltrim(str_replace('/backend/', '', $rel_path), '/\\');
    $full_path = __DIR__ . '/' . $clean;
    if (file_exists($full_path) && is_file($full_path)) {
        $filename = basename($full_path);
        $dest = $archive_folder . $filename;
        if (file_exists($dest)) {
            $ext = pathinfo($filename, PATHINFO_EXTENSION);
            $base = pathinfo($filename, PATHINFO_FILENAME);
            $dest = $archive_folder . $base . '_' . time() . '.' . $ext;
        }
        return @rename($full_path, $dest);
    }
    return false;
}

// 4. Process media files & archive old ones
$new_profile_photo_path = null;
if ($has_new_farmer_photo) {
    if (!empty($current_farmer['profile_photo'])) {
        archive_existing_file($current_farmer['profile_photo'], $archive_dirs['photo']);
    }
    $tmp = is_array($_FILES['farmer_photo']['tmp_name']) ? $_FILES['farmer_photo']['tmp_name'][0] : $_FILES['farmer_photo']['tmp_name'];
    $orig_name = is_array($_FILES['farmer_photo']['name']) ? $_FILES['farmer_photo']['name'][0] : $_FILES['farmer_photo']['name'];
    $ext = pathinfo($orig_name, PATHINFO_EXTENSION);
    if (!$ext) $ext = 'jpg';
    $filename = 'farmer_photo_' . $farmer_id . '_' . time() . '.' . $ext;
    if (move_uploaded_file($tmp, $active_dirs['farmer_photos'] . $filename)) {
        $new_profile_photo_path = 'uploads/farmer_photos/' . $filename;
    }
}

$new_aadhaar_photo_path = null;
if ($has_new_aadhaar_photo) {
    if (!empty($current_farmer['aadhaar_photo'])) {
        archive_existing_file($current_farmer['aadhaar_photo'], $archive_dirs['adhhar']);
    }
    $tmp = is_array($_FILES['aadhaar_photo']['tmp_name']) ? $_FILES['aadhaar_photo']['tmp_name'][0] : $_FILES['aadhaar_photo']['tmp_name'];
    $orig_name = is_array($_FILES['aadhaar_photo']['name']) ? $_FILES['aadhaar_photo']['name'][0] : $_FILES['aadhaar_photo']['name'];
    $ext = pathinfo($orig_name, PATHINFO_EXTENSION);
    if (!$ext) $ext = 'jpg';
    $filename = 'aadhaar_photo_' . $farmer_id . '_' . time() . '.' . $ext;
    if (move_uploaded_file($tmp, $active_dirs['aadhaar_cards'] . $filename)) {
        $new_aadhaar_photo_path = 'uploads/aadhaar_cards/' . $filename;
    }
}

$new_khatauni_photo_paths = [];
if ($has_new_khatauni_photo) {
    if (!empty($current_farmer['khatauni_photo'])) {
        $old_k_files = explode(',', $current_farmer['khatauni_photo']);
        foreach ($old_k_files as $okf) {
            archive_existing_file(trim($okf), $archive_dirs['khatauni']);
        }
    }
    if (is_array($_FILES['khatauni_photo']['name'])) {
        for ($i = 0; $i < count($_FILES['khatauni_photo']['name']); $i++) {
            if ($_FILES['khatauni_photo']['error'][$i] === UPLOAD_ERR_OK) {
                $tmp = $_FILES['khatauni_photo']['tmp_name'][$i];
                $orig_name = $_FILES['khatauni_photo']['name'][$i];
                $ext = pathinfo($orig_name, PATHINFO_EXTENSION);
                if (!$ext) $ext = 'jpg';
                $filename = 'khatauni_photo_' . $farmer_id . '_' . time() . '_' . $i . '.' . $ext;
                if (move_uploaded_file($tmp, $active_dirs['khatauni_photos'] . $filename)) {
                    $new_khatauni_photo_paths[] = 'uploads/khatauni_photos/' . $filename;
                }
            }
        }
    } else {
        if ($_FILES['khatauni_photo']['error'] === UPLOAD_ERR_OK) {
            $tmp = $_FILES['khatauni_photo']['tmp_name'];
            $orig_name = $_FILES['khatauni_photo']['name'];
            $ext = pathinfo($orig_name, PATHINFO_EXTENSION);
            if (!$ext) $ext = 'jpg';
            $filename = 'khatauni_photo_' . $farmer_id . '_' . time() . '.' . $ext;
            if (move_uploaded_file($tmp, $active_dirs['khatauni_photos'] . $filename)) {
                $new_khatauni_photo_paths[] = 'uploads/khatauni_photos/' . $filename;
            }
        }
    }
}

// 5. Build SQL Update
$name = $data['name'] ?? null;
$mobile = $data['mobile'] ?? null;
$aadhaar = $data['aadhaar'] ?? null;
$khatauni_number = $data['khatauni_number'] ?? null;
$khasra_rukba = isset($data['khasra_rukba']) && $data['khasra_rukba'] !== '' ? $data['khasra_rukba'] : null;

$update_parts = [];
$params = [];
$types = "";

if ($name !== null && trim($name) !== '') {
    $update_parts[] = "name = ?";
    $params[] = trim($name);
    $types .= "s";
}
if ($mobile !== null && trim($mobile) !== '') {
    $update_parts[] = "mobile = ?";
    $params[] = trim($mobile);
    $types .= "s";
}
if ($aadhaar !== null && trim($aadhaar) !== '') {
    $update_parts[] = "aadhaar = ?";
    $params[] = trim($aadhaar);
    $types .= "s";
}
if ($khatauni_number !== null && trim($khatauni_number) !== '') {
    $update_parts[] = "khatauni_number = ?";
    $params[] = trim($khatauni_number);
    $types .= "s";
}
if ($khasra_rukba !== null) {
    $update_parts[] = "khasra_rukba = ?";
    $params[] = (float)$khasra_rukba;
    $types .= "d";
}

if ($new_profile_photo_path !== null) {
    $update_parts[] = "profile_photo = ?";
    $params[] = $new_profile_photo_path;
    $types .= "s";
}

if ($new_aadhaar_photo_path !== null) {
    $update_parts[] = "aadhaar_photo = ?";
    $params[] = $new_aadhaar_photo_path;
    $types .= "s";
}

if (!empty($new_khatauni_photo_paths)) {
    $update_parts[] = "khatauni_photo = ?";
    $params[] = implode(',', $new_khatauni_photo_paths);
    $types .= "s";
}



if (empty($update_parts)) {
    echo json_encode(["status" => "error", "message" => "कोई विवरण या फ़ाइल बदलने के लिए नहीं मिली"], JSON_UNESCAPED_UNICODE);
    exit;
}

$params[] = $farmer_id;
$types .= "s";

$query = "UPDATE farmer_info SET " . implode(", ", $update_parts) . " WHERE farmer_id = ?";
$stmt = $conn->prepare($query);

if ($stmt) {
    $stmt->bind_param($types, ...$params);
    if ($stmt->execute()) {
        echo json_encode([
            "status" => "success",
            "message" => "किसान का विवरण और मीडिया सफलतापूर्वक अपडेट कर दिया गया है",
            "data" => [
                "farmer_id" => $farmer_id,
                "profile_photo" => $new_profile_photo_path ?: $current_farmer['profile_photo'],
                "aadhaar_photo" => $new_aadhaar_photo_path ?: $current_farmer['aadhaar_photo'],
                "khatauni_photo" => (!empty($new_khatauni_photo_paths) ? implode(',', $new_khatauni_photo_paths) : $current_farmer['khatauni_photo'])
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(["status" => "error", "message" => "अपडेट विफल रहा: " . $stmt->error], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "डेटाबेस त्रुटि: " . $conn->error], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
