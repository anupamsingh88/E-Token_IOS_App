<?php
/**
 * Get Pending Approvals API
 * Fetches all pending farmer and retailer registrations for SuperAdmin review
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once 'db_connect.php';

try {
    // Fetch pending farmers
    $farmerQuery = "SELECT id, farmer_id, name, mobile, aadhaar, village, district, tehsil, block, 
                           khasra_number, khasra_rukba, approval_status, is_active, created_at
                    FROM farmer_info 
                    WHERE approval_status = 'pending'
                    ORDER BY created_at DESC";
    $farmerResult = $conn->query($farmerQuery);
    
    $pendingFarmers = [];
    while ($row = $farmerResult->fetch_assoc()) {
        $pendingFarmers[] = [
            'id' => intval($row['id']),
            'farmer_id' => $row['farmer_id'],
            'name' => $row['name'],
            'mobile' => $row['mobile'],
            'aadhaar' => $row['aadhaar'],
            'village' => $row['village'],
            'district' => $row['district'],
            'tehsil' => $row['tehsil'],
            'block' => $row['block'],
            'khasra_number' => $row['khasra_number'],
            'land_area' => floatval($row['khasra_rukba']),
            'status' => $row['approval_status'],
            'is_active' => boolval($row['is_active']),
            'created_at' => $row['created_at']
        ];
    }
    
    // Fetch pending retailers
    $retailerQuery = "SELECT id, retailer_id, name, mobile, shop_name, address, district, 
                             tehsil, block, license_number, approval_status, is_active, created_at
                      FROM retailers 
                      WHERE approval_status = 'pending'
                      ORDER BY created_at DESC";
    $retailerResult = $conn->query($retailerQuery);
    
    $pendingRetailers = [];
    while ($row = $retailerResult->fetch_assoc()) {
        $pendingRetailers[] = [
            'id' => intval($row['id']),
            'retailer_id' => $row['retailer_id'],
            'name' => $row['name'],
            'mobile' => $row['mobile'],
            'shop_name' => $row['shop_name'],
            'address' => $row['address'],
            'district' => $row['district'],
            'tehsil' => $row['tehsil'],
            'block' => $row['block'],
            'license_number' => $row['license_number'],
            'status' => $row['approval_status'],
            'is_active' => boolval($row['is_active']),
            'created_at' => $row['created_at']
        ];
    }
    
    // Get counts
    $farmerStatsQuery = "SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
                            SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
                            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
                         FROM farmer_info";
    $farmerStats = $conn->query($farmerStatsQuery)->fetch_assoc();
    
    $retailerStatsQuery = "SELECT 
                              COUNT(*) as total,
                              SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
                              SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
                              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
                           FROM retailers";
    $retailerStats = $conn->query($retailerStatsQuery)->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'data' => [
            'pending_farmers' => $pendingFarmers,
            'pending_retailers' => $pendingRetailers,
            'stats' => [
                'farmers' => [
                    'total' => intval($farmerStats['total']),
                    'pending' => intval($farmerStats['pending']),
                    'approved' => intval($farmerStats['approved']),
                    'active' => intval($farmerStats['active'])
                ],
                'retailers' => [
                    'total' => intval($retailerStats['total']),
                    'pending' => intval($retailerStats['pending']),
                    'approved' => intval($retailerStats['approved']),
                    'active' => intval($retailerStats['active'])
                ]
            ]
        ],
        'message' => 'Pending approvals retrieved successfully'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching pending approvals: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
