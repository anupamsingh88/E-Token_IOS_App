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

$has_new_kisan_panjikaran_photo = isset($_FILES['kisan_panjikaran_photo']) && (
    is_array($_FILES['kisan_panjikaran_photo']['error'])
        ? ($_FILES['kisan_panjikaran_photo']['error'][0] === UPLOAD_ERR_OK)
        : ($_FILES['kisan_panjikaran_photo']['error'] === UPLOAD_ERR_OK)
);

$is_updating_media = $has_new_farmer_photo || $has_new_aadhaar_photo || $has_new_khatauni_photo || $has_new_kisan_panjikaran_photo;

// 3. Setup directories
$archive_base = __DIR__ . '/uploads/Previous media/';
$archive_dirs = [
    'adhhar'   => $archive_base . 'adhhar/',
    'photo'    => $archive_base . 'photo/',
    'khatauni' => $archive_base . 'khatauni copy/',
    'kisan_card' => $archive_base . 'kisan_cards/'
];

foreach ($archive_dirs as $d) {
    if (!file_exists($d)) {
        @mkdir($d, 0777, true);
    }
}

$active_dirs = [
    'farmer_photos'   => __DIR__ . '/uploads/farmer_photos/',
    'aadhaar_cards'   => __DIR__ . '/uploads/aadhaar_cards/',
    'khatauni_photos' => __DIR__ . '/uploads/khatauni_photos/',
    'kisan_cards'     => __DIR__ . '/uploads/kisan_cards/'
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

$new_kisan_panjikaran_photo_paths = [];
if ($has_new_kisan_panjikaran_photo) {
    if (!empty($current_farmer['kisan_panjikaran_photo'])) {
        $old_kp_files = explode(',', $current_farmer['kisan_panjikaran_photo']);
        foreach ($old_kp_files as $okp) {
            archive_existing_file(trim($okp), $archive_dirs['kisan_card']);
        }
    }
    if (is_array($_FILES['kisan_panjikaran_photo']['name'])) {
        for ($i = 0; $i < count($_FILES['kisan_panjikaran_photo']['name']); $i++) {
            if ($_FILES['kisan_panjikaran_photo']['error'][$i] === UPLOAD_ERR_OK) {
                $tmp = $_FILES['kisan_panjikaran_photo']['tmp_name'][$i];
                $orig_name = $_FILES['kisan_panjikaran_photo']['name'][$i];
                $ext = pathinfo($orig_name, PATHINFO_EXTENSION);
                if (!$ext) $ext = 'jpg';
                $filename = 'kisan_card_' . $farmer_id . '_' . time() . '_' . $i . '.' . $ext;
                if (move_uploaded_file($tmp, $active_dirs['kisan_cards'] . $filename)) {
                    $new_kisan_panjikaran_photo_paths[] = 'uploads/kisan_cards/' . $filename;
                }
            }
        }
    } else {
        if ($_FILES['kisan_panjikaran_photo']['error'] === UPLOAD_ERR_OK) {
            $tmp = $_FILES['kisan_panjikaran_photo']['tmp_name'];
            $orig_name = $_FILES['kisan_panjikaran_photo']['name'];
            $ext = pathinfo($orig_name, PATHINFO_EXTENSION);
            if (!$ext) $ext = 'jpg';
            $filename = 'kisan_card_' . $farmer_id . '_' . time() . '.' . $ext;
            if (move_uploaded_file($tmp, $active_dirs['kisan_cards'] . $filename)) {
                $new_kisan_panjikaran_photo_paths[] = 'uploads/kisan_cards/' . $filename;
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
    $rawRukba = trim((string)$khasra_rukba);
    if (preg_match('/^[6-9][0-9]{9}$/', $rawRukba) || strlen($rawRukba) >= 10) {
        echo json_encode(["status" => "error", "message" => "जमीन के क्षेत्रफल में मोबाइल नंबर नहीं भरा जा सकता"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $val = (float)$khasra_rukba;
    if ($val > 1000) {
        $val = 1000.0;
    }
    $update_parts[] = "khasra_rukba = ?";
    $params[] = round($val, 4);
    $types .= "d";
}

$registry_id = $data['registry_id'] ?? null;
$kisan_code = $data['kisan_panjikaran_number'] ?? ($data['kisan_code'] ?? null);

if ($registry_id !== null) {
    $cleanReg = trim((string)$registry_id);
    $update_parts[] = "registry_id = ?";
    $params[] = ($cleanReg !== '' ? $cleanReg : null);
    $types .= "s";
}

if ($kisan_code !== null) {
    $cleanKisan = trim((string)$kisan_code);
    $update_parts[] = "kisan_panjikaran_number = ?";
    $params[] = ($cleanKisan !== '' ? $cleanKisan : null);
    $types .= "s";
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

if (!empty($new_kisan_panjikaran_photo_paths)) {
    $update_parts[] = "kisan_panjikaran_photo = ?";
    $params[] = implode(',', $new_kisan_panjikaran_photo_paths);
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
                "khatauni_photo" => (!empty($new_khatauni_photo_paths) ? implode(',', $new_khatauni_photo_paths) : $current_farmer['khatauni_photo']),
                "kisan_panjikaran_photo" => (!empty($new_kisan_panjikaran_photo_paths) ? implode(',', $new_kisan_panjikaran_photo_paths) : ($current_farmer['kisan_panjikaran_photo'] ?? null))
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        error_log("retailer_update_farmer execute error: " . $stmt->error);
        echo json_encode(["status" => "error", "message" => "अपडेट विफल रहा। कृपया दर्ज की गई जानकारी जांचें।"], JSON_UNESCAPED_UNICODE);
    }
    $stmt->close();
} else {
    error_log("retailer_update_farmer prepare error: " . $conn->error);
    echo json_encode(["status" => "error", "message" => "तकनीकी समस्या आई। कृपया पुनः प्रयास करें।"], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
