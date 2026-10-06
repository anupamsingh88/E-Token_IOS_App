<?php
include("scripts/settings.php");

// Set JSON header & CORS
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Auth Check (Removed as per user request for "Basic API")
// No Token validation required.



// 2. Fetch Data
// Inputs
$dealer_id = $_REQUEST['id'] ?? $_REQUEST['retailer_id'] ?? '';
$date_from = $_REQUEST['from_date'] ?? date('Y-m-01');
$date_to = $_REQUEST['to_date'] ?? date('Y-m-t');

if (empty($dealer_id)) {
    echo json_encode(['status' => 'error', 'message' => 'Retailer ID (id) is required.']);
    exit;
}

// Get Retailer Name
$retailer_name = "Unknown";
$sql_ret = "SELECT agency_name FROM reference_ids WHERE dealer_id = '" . mysqli_real_escape_string($conn, $dealer_id) . "'";
$res_ret = mysqli_query($conn, $sql_ret);
if ($res_ret && mysqli_num_rows($res_ret) > 0) {
    $retailer_name = mysqli_fetch_assoc($res_ret)['agency_name'];
}

// helper functions (copied/adapted from beneficiary_sales_report.php)
function get_table_name_api($year, $month) {
    if ($year == 2026) {
        switch ((int)$month) {
            case 1: return 'pos_jan';
            case 2: return 'pos_feb';
            case 3: return 'pos_march';
            default: return 'pos_march';
        }
    }
    if ($year == 2025) {
        $m = (int)$month;
        if ($m == 1) return 'sale_jan25';
        if ($m == 2) return 'sale_feb25';
        if ($m == 3) return 'sale_march25';
        if ($m >= 4 && $m <= 8) return 'pos_sale_2025';
        if ($m == 9) return 'pos_sep';
        if ($m == 10) return 'pos_oct';
        if ($m == 11) return 'pos_nov';
        if ($m == 12) return 'pos_dec';
    }
    return null;
}

function get_tables_api($conn, $from_date, $to_date) {
    $tables = [];
    try {
        $start = new DateTime($from_date);
        $end = new DateTime($to_date);
        $end->modify('+1 day'); 
        $interval = DateInterval::createFromDateString('1 month');
        $period = new DatePeriod($start, $interval, $end);
        
        $check_add = function($year, $month) use ($conn, &$tables) {
            $t = get_table_name_api($year, $month);
            if ($t) {
                $check = mysqli_query($conn, "SHOW TABLES LIKE '$t'");
                if ($check && mysqli_num_rows($check) > 0) $tables[] = $t;
            }
        };

        // Add start month
        $check_add($start->format('Y'), $start->format('m'));
        foreach ($period as $dt) {
            $check_add($dt->format('Y'), $dt->format('m'));
        }
        // Add end month
        $end_real = new DateTime($to_date);
        $check_add($end_real->format('Y'), $end_real->format('m'));
        
        return array_values(array_unique(array_filter($tables)));
    } catch (Exception $e) { return []; }
}

$tables = get_tables_api($conn, $date_from, $date_to);
$beneficiary_count = 0;
$total_quantity = 0;
$product_sales = [];

if (!empty($tables)) {
    $union_parts = [];
    foreach ($tables as $tbl) {
        $part = "SELECT retailer_id, buyer_name, buyer_address, quantity_mt, invoice_date, product FROM `$tbl`";
        $part .= " WHERE (CASE 
                        WHEN invoice_date LIKE '%/%' THEN STR_TO_DATE(invoice_date, '%m/%d/%Y')
                        ELSE STR_TO_DATE(invoice_date, '%Y-%m-%d')
                    END) BETWEEN '$date_from' AND '$date_to'";
        $part .= " AND retailer_id = '" . mysqli_real_escape_string($conn, $dealer_id) . "'";
        $union_parts[] = $part;
    }
    
    $union_sql = implode(" UNION ALL ", $union_parts);

    // 1. Total Beneficiaries & Quantity
    $sql_summary = "SELECT 
                        COUNT(DISTINCT buyer_name, buyer_address) as ben_count,
                        COALESCE(SUM(quantity_mt), 0) as total_qty
                    FROM ($union_sql) as alias_main";
    
    $res_summary = mysqli_query($conn, $sql_summary);
    if ($res_summary) {
        $row = mysqli_fetch_assoc($res_summary);
        $beneficiary_count = $row['ben_count'];
        $total_quantity = $row['total_qty'];
    }

    // 2. Product-wise Breakdown
    $sql_prod = "SELECT product, COALESCE(SUM(quantity_mt), 0) as qty 
                 FROM ($union_sql) as alias_prod 
                 GROUP BY product";
    $res_prod = mysqli_query($conn, $sql_prod);
    if ($res_prod) {
        while ($row = mysqli_fetch_assoc($res_prod)) {
            $product_sales[] = [
                'product_name' => $row['product'],
                'quantity' => (float)$row['qty']
            ];
        }
    }
}

// Response
echo json_encode([
    'status' => 'success',
    'metadata' => [
        'retailer_id' => $dealer_id,
        'retailer_name' => $retailer_name,
        'from_date' => $date_from,
        'to_date' => $date_to
    ],
    'data' => [
        'total_beneficiaries' => (int)$beneficiary_count,
        'total_quantity_mt' => (float)$total_quantity,
        'sales_breakdown' => $product_sales
    ]
]);
?>
