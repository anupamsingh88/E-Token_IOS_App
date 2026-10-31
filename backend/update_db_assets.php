<?php
/**
 * Update DB Assets & Fertilizer Images Script
 * Automatically sets up and updates image/icon paths in database:
 * 1. Ensures retailer_image_url column exists in fertilizer_products
 * 2. Sets bori imageUrl and retailer_image_url for all fertilizer products
 * 3. Sets app logo, icon, and background paths in app_settings table
 */

header('Content-Type: text/plain; charset=utf-8');
require_once __DIR__ . '/db_connect.php';

echo "=== Urvarak Database Assets & Icons Setup ===\n\n";

if (!$conn) {
    die("ERROR: Database connection failed.\n");
}

// -------------------------------------------------------------
// Step 1: Ensure retailer_image_url column in fertilizer_products
// -------------------------------------------------------------
echo "1. Checking 'retailer_image_url' column in fertilizer_products...\n";
try {
    $res = $conn->query("SHOW COLUMNS FROM fertilizer_products LIKE 'retailer_image_url'");
    if ($res && $res->num_rows == 0) {
        if ($conn->query("ALTER TABLE fertilizer_products ADD COLUMN retailer_image_url VARCHAR(255) NULL DEFAULT NULL AFTER imageUrl")) {
            echo "   -> Added 'retailer_image_url' column successfully.\n";
        } else {
            echo "   -> Warning: Could not add column: " . $conn->error . "\n";
        }
    } else {
        echo "   -> 'retailer_image_url' column already exists.\n";
    }
} catch (Exception $e) {
    echo "   -> Exception: " . $e->getMessage() . "\n";
}

// -------------------------------------------------------------
// Step 2: Update Bori Images in fertilizer_products
// -------------------------------------------------------------
echo "\n2. Updating fertilizer products bori images...\n";

$products = [
    [
        'type_id' => 'urea',
        'imageUrl' => 'assets/urvarak_setu/UREA_bori.jpeg',
        'retailer_image_url' => 'assets/upcdc/urea_bori.png'
    ],
    [
        'type_id' => 'dap',
        'imageUrl' => 'assets/urvarak_setu/DAP_bori.png',
        'retailer_image_url' => 'assets/upcdc/dap_bori.png'
    ],
    [
        'type_id' => 'npk',
        'imageUrl' => 'assets/urvarak_setu/NPK_bori.png',
        'retailer_image_url' => 'assets/upcdc/npk_bori.png'
    ],
    [
        'type_id' => 'mop',
        'imageUrl' => 'assets/urvarak_setu/MOP_bori.png',
        'retailer_image_url' => 'assets/upcdc/mop_bori.png'
    ],
    [
        'type_id' => 'tsp',
        'imageUrl' => 'assets/urvarak_setu/TSP_bori.png',
        'retailer_image_url' => 'assets/upcdc/tsp_bori.png'
    ]
];

foreach ($products as $p) {
    $type_id = $conn->real_escape_string($p['type_id']);
    $farmerImg = $conn->real_escape_string($p['imageUrl']);
    $retailerImg = $conn->real_escape_string($p['retailer_image_url']);

    $sql = "UPDATE fertilizer_products 
            SET imageUrl = '$farmerImg', retailer_image_url = '$retailerImg' 
            WHERE LOWER(type_id) = '$type_id'";
    
    if ($conn->query($sql)) {
        if ($conn->affected_rows > 0) {
            echo "   -> Updated product [{$p['type_id']}]: imageUrl & retailer_image_url\n";
        } else {
            echo "   -> Product [{$p['type_id']}] already has latest image or not found.\n";
        }
    } else {
        echo "   -> Error updating [{$p['type_id']}]: " . $conn->error . "\n";
    }
}

// -------------------------------------------------------------
// Step 3: Update App Settings (Logos, Icons, Backgrounds)
// -------------------------------------------------------------
echo "\n3. Updating app_settings (Logo, Icon, Backgrounds)...\n";

$settings = [
    // UPCDC Retailer App Branding
    'retailer_app_logo_url'     => 'assets/upcdc/icon.png',
    'retailer_app_icon_url'     => 'assets/upcdc/icon.png',
    'retailer_app_bg_image_url' => 'assets/upcdc/retailer.png',

    // Urvarak Setu Farmer App Branding
    'farmer_app_logo_url'       => 'assets/urvarak_setu/icon.png',
    'farmer_app_icon_url'       => 'assets/urvarak_setu/icon.png',
    'farmer_app_bg_image_url'   => 'assets/urvarak_setu/Farmer in golden wheat field.png',

    // Fallbacks
    'logo_url'                  => 'assets/upcdc/icon.png',
    'icon_url'                  => 'assets/upcdc/icon.png',
];

foreach ($settings as $key => $val) {
    $eKey = $conn->real_escape_string($key);
    $eVal = $conn->real_escape_string($val);

    $sql = "INSERT INTO app_settings (setting_key, setting_value, setting_type) 
            VALUES ('$eKey', '$eVal', 'text') 
            ON DUPLICATE KEY UPDATE setting_value = '$eVal', setting_type = 'text'";

    if ($conn->query($sql)) {
        echo "   -> Setting saved: {$key} => {$val}\n";
    } else {
        echo "   -> Error saving setting {$key}: " . $conn->error . "\n";
    }
}

// -------------------------------------------------------------
// Step 4: Clear Micro-Cache if exists
// -------------------------------------------------------------
echo "\n4. Clearing fertilizer prices micro-cache...\n";
$cacheFile = __DIR__ . '/.cache_fertilizer_prices.json';
if (file_exists($cacheFile)) {
    @unlink($cacheFile);
    echo "   -> Cache file deleted.\n";
} else {
    echo "   -> No cache file to delete.\n";
}

echo "\n=== Setup Completed Successfully! ===\n";
echo "Now you can change any image/icon URL directly from the database anytime,\n";
echo "or keep these default paths.\n";
?>

