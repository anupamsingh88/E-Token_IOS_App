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

$request_id = $data['request_id']; // This is the ID in retailer_change_requests table
$action = $data['action']; // 'approve' or 'reject'
$retailer_id_str = $data['retailer_id']; // This is the new retailer_id (string)

$request_id = $data['request_id']; // This is the ID in retailer_change_requests table
$action = $data['action']; // 'approve' or 'reject'
$retailer_id_str = $data['retailer_id']; // This is the new retailer_id (string)

if ($action === 'approve') {
    $new_status = 'approved';
} else if ($action === 'reject') {
    $new_status = 'rejected';
} else {
    echo json_encode(["status" => "error", "message" => "Invalid action"]);
    exit;
}

// Fetch Info for SMS (Farmer & New Retailer)
$farmer_name = "Farmer";
$farmer_mobile = "";
$retailer_name = "Retailer";
$retailer_mobile = "";

$info_query = "SELECT f.name as farmer_name, f.mobile as farmer_mobile, r.name as retailer_name, r.mobile as retailer_mobile 
               FROM retailer_change_requests rcr
               JOIN farmer_info f ON rcr.farmer_id = f.farmer_id
               JOIN retailer_info r ON rcr.requested_retailer_id = r.retailer_id
               WHERE rcr.id = ?";
$info_stmt = $conn->prepare($info_query);
if ($info_stmt) {
    $info_stmt->bind_param("s", $request_id);
    $info_stmt->execute();
    $res = $info_stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        $farmer_name = $row['farmer_name'];
        $farmer_mobile = $row['farmer_mobile'];
        $retailer_name = $row['retailer_name'];
        $retailer_mobile = $row['retailer_mobile'];
    }
    $info_stmt->close();
}

$conn->begin_transaction();

try {
    // 1. Update the request status
    $query1 = "UPDATE retailer_change_requests SET status = ? WHERE id = ? AND requested_retailer_id = ?";
    $stmt1 = $conn->prepare($query1);
    $stmt1->bind_param("sss", $new_status, $request_id, $retailer_id_str);
    $stmt1->execute();

    // 2. If approved, update the farmer's selected_retailer_id
    if ($new_status === 'approved') {
        // First get the farmer_id from the request
        $get_farmer = "SELECT farmer_id FROM retailer_change_requests WHERE id = ?";
        $stmt_get = $conn->prepare($get_farmer);
        $stmt_get->bind_param("s", $request_id);
        $stmt_get->execute();
        $result = $stmt_get->get_result();
        if ($row = $result->fetch_assoc()) {
            $farmer_id = $row['farmer_id'];

            // Update farmer table
            $query2 = "UPDATE farmer_info SET selected_retailer_id = ? WHERE farmer_id = ?";
            $stmt2 = $conn->prepare($query2);
            $stmt2->bind_param("ss", $retailer_id_str, $farmer_id);
            $stmt2->execute();
            $stmt2->close();
        }
        $stmt_get->close();
    }

    $conn->commit();

    // Send SMS after successful transaction
    if (!empty($farmer_mobile)) {
        $farmer_msg = get_change_request_message($action, $farmer_name, $retailer_name);
        send_notification_sms($farmer_mobile, $farmer_msg);
    }

    if ($action === 'approve' && !empty($retailer_mobile)) {
        $retailer_msg = get_retailer_alert_message($farmer_name);
        send_notification_sms($retailer_mobile, $retailer_msg);
    }

    echo json_encode(["status" => "success", "message" => "Retailer change $new_status successfully"]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Transaction failed: " . $e->getMessage()]);
}

$conn->close();
?>