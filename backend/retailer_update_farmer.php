<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

include 'db_connect.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['farmer_id'])) {
    echo json_encode(["status" => "error", "message" => "Farmer ID is required"]);
    exit;
}

$farmer_id = $data['farmer_id'];
$name = $data['name'] ?? null;
$mobile = $data['mobile'] ?? null;
$aadhaar = $data['aadhaar'] ?? null;
$khatauni_number = $data['khatauni_number'] ?? null;
$khasra_rukba = $data['khasra_rukba'] ?? null;

$update_parts = [];
$params = [];
$types = "";

if ($name !== null) { $update_parts[] = "name = ?"; $params[] = $name; $types .= "s"; }
if ($mobile !== null) { $update_parts[] = "mobile = ?"; $params[] = $mobile; $types .= "s"; }
if ($aadhaar !== null) { $update_parts[] = "aadhaar = ?"; $params[] = $aadhaar; $types .= "s"; }
if ($khatauni_number !== null) { $update_parts[] = "khatauni_number = ?"; $params[] = $khatauni_number; $types .= "s"; }
if ($khasra_rukba !== null) { $update_parts[] = "khasra_rukba = ?"; $params[] = $khasra_rukba; $types .= "d"; }

if (empty($update_parts)) {
    echo json_encode(["status" => "error", "message" => "No fields to update"]);
    exit;
}

$params[] = $farmer_id;
$types .= "s";

$query = "UPDATE farmer_info SET " . implode(", ", $update_parts) . " WHERE farmer_id = ?";
$stmt = $conn->prepare($query);

if ($stmt) {
    $stmt->bind_param($types, ...$params);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Farmer details updated successfully"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Update failed: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Database error"]);
}

$conn->close();
?>
