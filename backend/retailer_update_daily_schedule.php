<?php
/**
 * Retailer Update Daily Schedule & Capacity API
 * Allows retailer to:
 * 1. Override capacity for a date (action: CAPACITY_CHANGE)
 * 2. Toggle active/inactive for booking with mandatory reason (action: MANUAL_ACTIVATE / MANUAL_INACTIVATE)
 * 3. Mark holiday/store closed with reason (action: HOLIDAY_MARKED)
 * 
 * Records full audit trail in `retailer_capacity_audit_log` (Internal use only).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

$response = ['success' => false, 'message' => ''];

try {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        throw new Exception("Invalid request payload");
    }

    $retailer_id_input = trim($data['retailer_id'] ?? '');
    $schedule_date = trim($data['schedule_date'] ?? date('Y-m-d'));
    $action = trim($data['action'] ?? 'CAPACITY_CHANGE');
    $reason = trim($data['reason'] ?? '');
    
    if (empty($retailer_id_input)) {
        throw new Exception("Retailer ID is required");
    }

    // Resolve public retailer_id from retailer_info
    $stmt_r = $conn->prepare("SELECT id, retailer_id, daily_visitor_capacity FROM retailer_info WHERE id = ? OR retailer_id = ? LIMIT 1");
    $stmt_r->bind_param("ss", $retailer_id_input, $retailer_id_input);
    $stmt_r->execute();
    $r_row = $stmt_r->get_result()->fetch_assoc();
    $stmt_r->close();

    if (!$r_row) {
        throw new Exception("Retailer not found");
    }

    $retailer_id_str = $r_row['retailer_id'];
    $base_capacity = (int)($r_row['daily_visitor_capacity'] ?? 50);

    // Fetch existing schedule for this date if present
    $stmt_cur = $conn->prepare("SELECT custom_capacity, is_active, is_holiday, closure_reason FROM retailer_daily_schedule WHERE retailer_id = ? AND schedule_date = ? LIMIT 1");
    $stmt_cur->bind_param("ss", $retailer_id_str, $schedule_date);
    $stmt_cur->execute();
    $existing_sched = $stmt_cur->get_result()->fetch_assoc();
    $stmt_cur->close();

    $old_capacity = $existing_sched ? ((int)($existing_sched['custom_capacity'] ?? $base_capacity)) : $base_capacity;
    $new_capacity = $old_capacity;
    $is_active = $existing_sched ? (int)$existing_sched['is_active'] : 1;
    $is_holiday = $existing_sched ? (int)$existing_sched['is_holiday'] : 0;
    $closure_reason = $existing_sched ? $existing_sched['closure_reason'] : null;

    // Process Action
    switch ($action) {
        case 'CAPACITY_CHANGE':
            if (!isset($data['custom_capacity'])) {
                throw new Exception("New capacity value is required");
            }
            $new_cap_val = (int)$data['custom_capacity'];
            if ($new_cap_val <= 0 || $new_cap_val > 500) {
                throw new Exception("Capacity must be between 1 and 500");
            }
            $new_capacity = $new_cap_val;
            if (empty($reason)) {
                $reason = "क्षमता $old_capacity से बदलकर $new_capacity की गई";
            }
            break;

        case 'MANUAL_INACTIVATE':
            if (empty($reason)) {
                throw new Exception("कृपया बुकिंग बंद करने का कारण दर्ज करें");
            }
            $is_active = 0;
            $closure_reason = $reason;
            break;

        case 'MANUAL_ACTIVATE':
            if (empty($reason)) {
                throw new Exception("कृपया बुकिंग पुनः सक्रिय करने का कारण दर्ज करें");
            }
            $is_active = 1;
            $is_holiday = 0;
            $closure_reason = null;
            break;

        case 'HOLIDAY_MARKED':
            if (empty($reason)) {
                throw new Exception("कृपया अवकाश / समिति बंद का कारण दर्ज करें");
            }
            $is_holiday = 1;
            $is_active = 0;
            $closure_reason = $reason;
            break;

        default:
            throw new Exception("Invalid action specified");
    }

    // 1. Insert / Update `retailer_daily_schedule`
    $upsert_sql = "
        INSERT INTO retailer_daily_schedule 
            (retailer_id, schedule_date, is_active, is_holiday, custom_capacity, closure_reason, updated_at)
        VALUES 
            (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE 
            is_active = VALUES(is_active),
            is_holiday = VALUES(is_holiday),
            custom_capacity = VALUES(custom_capacity),
            closure_reason = VALUES(closure_reason),
            updated_at = NOW()
    ";
    $stmt_up = $conn->prepare($upsert_sql);
    $stmt_up->bind_param("ssiiss", $retailer_id_str, $schedule_date, $is_active, $is_holiday, $new_capacity, $closure_reason);
    if (!$stmt_up->execute()) {
        throw new Exception("Failed to update daily schedule: " . $conn->error);
    }
    $stmt_up->close();

    // 2. Insert into `retailer_capacity_audit_log` (Audit trail for internal verification)
    $stmt_log = $conn->prepare("
        INSERT INTO retailer_capacity_audit_log 
            (retailer_id, schedule_date, action, reason, old_capacity, new_capacity, created_at)
        VALUES 
            (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt_log->bind_param("ssssii", $retailer_id_str, $schedule_date, $action, $reason, $old_capacity, $new_capacity);
    $stmt_log->execute();
    $stmt_log->close();

    $response['success'] = true;
    $response['message'] = 'दैनिक शेड्यूल सफलतापूर्वक अपडेट किया गया!';
    $response['data'] = [
        'retailer_id' => $retailer_id_str,
        'schedule_date' => $schedule_date,
        'effective_capacity' => $new_capacity,
        'is_active' => $is_active,
        'is_holiday' => $is_holiday,
        'closure_reason' => $closure_reason
    ];

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
$conn->close();
?>

