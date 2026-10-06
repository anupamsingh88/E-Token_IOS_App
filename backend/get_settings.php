<?php
/**
 * Get App Settings API
 * Single source of truth — reads ONLY from app_settings table.
 * advisory_tips, app_instructions, notices — all stored as JSON rows here.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once 'db_connect.php';

try {
    // ── Auto-seed default rows if app_settings is missing key content rows ──
    $existsCheck = $conn->query("SELECT setting_key FROM app_settings WHERE setting_key = 'advisory_tips' LIMIT 1");
    if ($existsCheck && $existsCheck->num_rows === 0) {

        $defaultAdvisoryTips = json_encode([
            ["id" => 1, "title" => "यूरिया का सही उपयोग", "description" => "खरीफ मौसम में यूरिया का उपयोग बुवाई के 3-4 सप्ताह बाद करें।", "type" => "general", "season" => "Kharif", "order" => 1],
            ["id" => 2, "title" => "DAP का उपयोग", "description" => "DAP का उपयोग बुवाई के समय करें — बेहतर पैदावार के लिए।", "type" => "general", "season" => "All", "order" => 2],
            ["id" => 3, "title" => "NPK संतुलन", "description" => "NPK का संतुलित उपयोग मिट्टी की गुणवत्ता बढ़ाता है।", "type" => "general", "season" => "All", "order" => 3],
        ], JSON_UNESCAPED_UNICODE);

        $defaultInstructions = json_encode([
            ["title" => "Step 1: रजिस्ट्रेशन करें", "description" => "पहली बार? 'नया रजिस्ट्रेशन' पर जाएं। अपना मोबाइल नंबर और आधार नंबर दर्ज करें। OTP से वेरीफाई करें।"],
            ["title" => "Step 2: लॉगिन करें", "description" => "अपना रजिस्टर्ड मोबाइल नंबर डालें → OTP प्राप्त करें → लॉगिन करें।"],
            ["title" => "Step 3: Retailer चुनें", "description" => "'स्लॉट बुक करें' पर जाएं → तारीख चुनें → अपने नजदीकी retailer को चुनें।"],
            ["title" => "Step 4: उर्वरक चुनें", "description" => "Urea, DAP, NPK, MOP में से जरूरत अनुसार मात्रा चुनें — अपने कोटा के अनुसार।"],
            ["title" => "Step 5: Slot Book करें", "description" => "'Book Slot' बटन दबाएं। Booking confirmation आपको दिखेगी। तारीख पर retailer के पास जाएं और fertilizer लें।"],
        ], JSON_UNESCAPED_UNICODE);

        $defaultNotices = json_encode([
            "वितरण समय: सुबह 9 बजे से शाम 5 बजे तक।",
            "आधार कार्ड साथ लाना अनिवार्य है।",
            "एक सीजन में कोटा से अधिक उर्वरक नहीं मिलेगा।",
        ], JSON_UNESCAPED_UNICODE);

        // Insert all content rows into app_settings
        $inserts = [
            ['advisory_tips',          $defaultAdvisoryTips,     'json'],
            ['app_instructions',        $defaultInstructions,      'json'],
            ['notices',                 $defaultNotices,           'json'],
            ['helpline_number',         '1800-180-1551',           'text'],
            ['helpline_title',          'किसान सहायता केंद्र',     'text'],
            ['helpline_description',    'किसी भी सहायता के लिए कॉल करें', 'text'],
            ['helpline_button_text',    'कॉल करें',                'text'],
            ['farmer_advice_title',     '🌾 किसान सलाह',           'text'],
            ['notices_title',           '📢 महत्वपूर्ण सूचना',     'text'],
            ['advice_screen_title',     '💡 ऐप निर्देश और सहायता','text'],
            ['advice_screen_subtitle',  'ऐप का उपयोग कैसे करें',  'text'],
        ];

        $ins = $conn->prepare(
            "INSERT IGNORE INTO app_settings (setting_key, setting_value, setting_type)
             VALUES (?, ?, ?)"
        );
        foreach ($inserts as [$key, $value, $type]) {
            $ins->bind_param('sss', $key, $value, $type);
            $ins->execute();
        }
        $ins->close();
    }

    // ── Read ALL settings from app_settings ─────────────────────────────────
    $result = $conn->query(
        "SELECT setting_key, setting_value, setting_type FROM app_settings ORDER BY setting_key"
    );

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $settings = [];
    while ($row = $result->fetch_assoc()) {
        $key   = $row['setting_key'];
        $value = $row['setting_value'];
        $type  = $row['setting_type'];

        switch ($type) {
            case 'number':
                $settings[$key] = floatval($value);
                break;
            case 'boolean':
                $settings[$key] = (bool)$value;
                break;
            case 'json':
                $decoded = json_decode($value, true);
                $settings[$key] = ($decoded !== null) ? $decoded : $value;
                break;
            default:
                $settings[$key] = $value;
        }
    }

    // ── Seasonal settings (kept separate — business logic table) ────────────
    $seasonResult = $conn->query(
        "SELECT season_name, fertilizer_type, allotment_per_hectare
         FROM seasonal_settings WHERE is_active = 1
         ORDER BY season_name, fertilizer_type"
    );
    $seasonalSettings = [];
    if ($seasonResult) {
        while ($row = $seasonResult->fetch_assoc()) {
            $season = $row['season_name'];
            if (!isset($seasonalSettings[$season])) $seasonalSettings[$season] = [];
            $seasonalSettings[$season][$row['fertilizer_type']] = floatval($row['allotment_per_hectare']);
        }
    }
    $settings['seasonal_settings'] = $seasonalSettings;

    echo json_encode([
        'success' => true,
        'data'    => $settings,
        'message' => 'Settings retrieved successfully'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching settings: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>
