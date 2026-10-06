<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require 'db_connect.php';

try {
    // Fetch all fertilizer prices
    // Assuming there's a fertilizer_pricing table or we use a predefined pricing structure

    // For now, return standard government-regulated prices
    // These should ideally come from a fertilizer_pricing table in database
    $prices = [
        [
            'id' => 'urea',
            'type' => 'urea',
            'name' => 'Urea',
            'nameHindi' => 'यूरिया',
            'pricePerBag' => 266.50,
            'bagWeight' => 50, // kg
            'nutrientFormula' => 'N 46%',
            'isAvailable' => true
        ],
        [
            'id' => 'dap',
            'type' => 'dap',
            'name' => 'DAP',
            'nameHindi' => 'डीएपी',
            'pricePerBag' => 1350.00,
            'bagWeight' => 50, // kg
            'nutrientFormula' => 'N 18%, P 46%',
            'isAvailable' => true
        ],
        [
            'id' => 'npk',
            'type' => 'npk',
            'name' => 'NPK',
            'nameHindi' => 'एनपीके',
            'pricePerBag' => 1470.00,
            'bagWeight' => 50, // kg
            'nutrientFormula' => 'N 12%, P 32%, K 16%',
            'isAvailable' => true
        ],
        [
            'id' => 'mop',
            'type' => 'mop',
            'name' => 'MOP',
            'nameHindi' => 'एमओपी',
            'pricePerBag' => 1700.00,
            'bagWeight' => 50, // kg
            'nutrientFormula' => 'K 60%',
            'isAvailable' => true
        ]
    ];

    echo json_encode([
        'success' => true,
        'prices' => $prices,
        'lastUpdated' => date('Y-m-d H:i:s')
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>