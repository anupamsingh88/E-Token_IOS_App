<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

include 'db_connect.php';
include 'retailer_sms_helper.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['request_id']) || !isset($data['action']) || !isset($data['retailer_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

$request_id = $data['request_id'];
$action = $data['action']; // 'approve' or 'reject'
$retailer_id_input = $data['retailer_id'];

// Resolve the retailer_id to the public ID (e.g. RET-XXX)
$retailer_id_str = $retailer_id_input;
$r_query = "SELECT retailer_id FROM retailer_info WHERE id = ? OR retailer_id = ?";
$r_stmt = $conn->prepare($r_query);
if ($r_stmt) {
    $r_stmt->bind_param("ss", $retailer_id_input, $retailer_id_input);
    $r_stmt->execute();
    $r_res = $r_stmt->get_result();
    if ($row = $r_res->fetch_assoc()) {
        $retailer_id_str = $row['retailer_id'];
    }
    $r_stmt->close();
}

if ($action === 'approve') {
    $new_status = 1; // 1 = Approved
} else if ($action === 'reject') {
    $new_status = 2; // 2 = Rejected
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action"]);
    exit;
}

// Fetch farmer info for SMS before update
$farmer_name = "Farmer";
$farmer_mobile = "";
$info_query = "SELECT name, mobile FROM farmer_info WHERE farmer_id = ?";
$info_stmt = $conn->prepare($info_query);
if ($info_stmt) {
    $info_stmt->bind_param("s", $request_id);
    $info_stmt->execute();
    $res = $info_stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $farmer_name = $row['name'];
        $farmer_mobile = $row['mobile'];
    }
    $info_stmt->close();
}

// Update the farmer's status
$query = "UPDATE farmer_info SET status = ?, approved_by = ?, approved_at = NOW() WHERE farmer_id = ? AND selected_retailer_id = ?";
$stmt = $conn->prepare($query);

if ($stmt) {
    $stmt->bind_param("ssss", $new_status, $retailer_id_str, $request_id, $retailer_id_str);
    if ($stmt->execute()) {
        $affected = $stmt->affected_rows;
        if ($affected === 0) {
            // Check if it was already updated or if the IDs don't match
            echo json_encode(["status" => "error", "message" => "Update failed: No record found or already updated"]);
        } else {
            // Send SMS
            if (!empty($farmer_mobile)) {
                $msg = get_registration_message($action, $farmer_name);
                send_notification_sms($farmer_mobile, $msg);
            }
            echo json_encode(["status" => "success", "message" => "Registration $action successfully"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Database error: " . $stmt->error]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Database prepare error"]);
}

$conn->close();
?>