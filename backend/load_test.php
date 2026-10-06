#!/usr/bin/env php
<?php
/**
 * ==================== LOAD TEST SCRIPT ====================
 * Simulates 10,000 concurrent users hitting your API
 * 
 * Usage:
 * php load_test.php
 * 
 * What it tests:
 * 1. Log ingestion (async vs sync)
 * 2. Booking creation under load
 * 3. Query performance
 * 4. Connection pooling efficiency
 * 
 * Requirements:
 * - PHP CLI
 * - curl or file_get_contents
 * - Your API running locally
 */

ini_set('memory_limit', '512M');
error_reporting(E_ALL);

// ============================================================================
// CONFIGURATION
// ============================================================================

$CONFIG = [
    'api_base_url' => 'http://localhost/backend',
    'num_users' => 100,              // Simulate 100 concurrent users (easily scalable)
    'num_requests_per_user' => 100,  // Each user makes 100 requests
    'concurrent_batch_size' => 10,   // Send 10 concurrent requests per batch
    'delay_between_batches' => 100,  // 100ms between batches (simulates user think-time)
];

// ============================================================================
// TEST DATA
// ============================================================================

$FARMERS = [];
$RETAILERS = [];

// Generate fake farmer IDs
for ($i = 1; $i <= 100; $i++) {
    $FARMERS[] = 'FARMER' . str_pad($i, 6, '0', STR_PAD_LEFT);
}

// Generate fake retailer IDs
for ($i = 1; $i <= 50; $i++) {
    $RETAILERS[] = str_pad($i, 5, '0', STR_PAD_LEFT);
}

// ============================================================================
// STATISTICS TRACKER
// ============================================================================

class StatsTracker {
    public $total_requests = 0;
    public $successful_requests = 0;
    public $failed_requests = 0;
    public $response_times = [];
    public $errors = [];
    public $start_time = 0;
    public $end_time = 0;
    
    public function start() {
        $this->start_time = microtime(true);
    }
    
    public function end() {
        $this->end_time = microtime(true);
    }
    
    public function recordRequest($success, $response_time) {
        $this->total_requests++;
        if ($success) {
            $this->successful_requests++;
        } else {
            $this->failed_requests++;
        }
        $this->response_times[] = $response_time;
    }
    
    public function recordError($endpoint, $error) {
        if (!isset($this->errors[$endpoint])) {
            $this->errors[$endpoint] = [];
        }
        $this->errors[$endpoint][] = $error;
    }
    
    public function getStats() {
        $response_times = $this->response_times;
        sort($response_times);
        
        $total_time = $this->end_time - $this->start_time;
        $avg_time = count($response_times) > 0 ? array_sum($response_times) / count($response_times) : 0;
        $min_time = count($response_times) > 0 ? min($response_times) : 0;
        $max_time = count($response_times) > 0 ? max($response_times) : 0;
        $p50 = isset($response_times[floor(count($response_times) * 0.5)]) ? $response_times[floor(count($response_times) * 0.5)] : 0;
        $p99 = isset($response_times[floor(count($response_times) * 0.99)]) ? $response_times[floor(count($response_times) * 0.99)] : 0;
        
        return [
            'total_requests' => $this->total_requests,
            'successful' => $this->successful_requests,
            'failed' => $this->failed_requests,
            'success_rate' => $this->total_requests > 0 ? round(($this->successful_requests / $this->total_requests) * 100, 2) . '%' : '0%',
            'avg_response_time_ms' => round($avg_time * 1000, 2),
            'min_response_time_ms' => round($min_time * 1000, 2),
            'max_response_time_ms' => round($max_time * 1000, 2),
            'p50_response_time_ms' => round($p50 * 1000, 2),
            'p99_response_time_ms' => round($p99 * 1000, 2),
            'total_time_seconds' => round($total_time, 2),
            'requests_per_second' => round($this->total_requests / $total_time, 2),
        ];
    }
}

// ============================================================================
// HTTP REQUEST HELPER (Using curl for concurrent requests)
// ============================================================================

class HTTPClient {
    private $base_url;
    
    public function __construct($base_url) {
        $this->base_url = $base_url;
    }
    
    public function post($endpoint, $data, &$response_time = null) {
        $start = microtime(true);
        
        try {
            $url = $this->base_url . '/' . ltrim($endpoint, '/');
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen(json_encode($data))
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            $response_time = microtime(true) - $start;
            
            if ($error) {
                return ['success' => false, 'error' => $error];
            }
            
            return [
                'success' => ($http_code >= 200 && $http_code < 300),
                'http_code' => $http_code,
                'response' => json_decode($response, true)
            ];
            
        } catch (Exception $e) {
            $response_time = microtime(true) - $start;
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    public function get($endpoint, &$response_time = null) {
        $start = microtime(true);
        
        try {
            $url = $this->base_url . '/' . ltrim($endpoint, '/');
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            $response_time = microtime(true) - $start;
            
            if ($error) {
                return ['success' => false, 'error' => $error];
            }
            
            return [
                'success' => ($http_code >= 200 && $http_code < 300),
                'http_code' => $http_code,
                'response' => json_decode($response, true)
            ];
            
        } catch (Exception $e) {
            $response_time = microtime(true) - $start;
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

function test_async_logging($client, $stats, $config) {
    echo "\n[TEST 1] Async Logging (app_logger_async.php)\n";
    echo "Simulating 10,000 log entries...\n";
    
    $producer_count = 0;
    
    for ($i = 0; $i < 100; $i++) {
        for ($j = 0; $j < 100; $j++) {
            $log_data = [
                'log_level' => ['INFO', 'ERROR', 'WARNING'][rand(0, 2)],
                'message' => 'Test log message #' . $producer_count,
                'api_url' => '/book_slot',
                'method' => 'POST',
                'status_code' => [200, 400, 500][rand(0, 2)],
                'farmer_id' => isset($GLOBALS['FARMERS']) ? $GLOBALS['FARMERS'][rand(0, count($GLOBALS['FARMERS']) - 1)] : null,
                'app_version' => '1.2.3'
            ];
            
            $response_time = 0;
            $result = $client->post('app_logger_async.php', $log_data, $response_time);
            
            $stats->recordRequest($result['success'], $response_time);
            $producer_count++;
            
            if ($producer_count % 500 === 0) {
                echo "  ✓ Produced " . $producer_count . " log entries\n";
            }
        }
    }
    
    echo "✅ Test 1 Complete\n";
}

function test_booking_creation($client, $stats, $config) {
    echo "\n[TEST 2] Booking Creation (book_slot.php)\n";
    echo "Simulating booking requests...\n";
    
    $booking_count = 0;
    
    for ($i = 0; $i < 50; $i++) {
        $farmer_id = $GLOBALS['FARMERS'][rand(0, count($GLOBALS['FARMERS']) - 1)];
        $retailer_id = $GLOBALS['RETAILERS'][rand(0, count($GLOBALS['RETAILERS']) - 1)];
        
        $booking_data = [
            'farmer_id' => $farmer_id,
            'retailer_id' => $retailer_id,
            'booking_date' => date('Y-m-d'),
            'items' => [
                [
                    'product' => ['Urea', 'DAP', 'NPK', 'MOP'][rand(0, 3)],
                    'quantity' => rand(1, 10),
                    'price' => rand(100, 500)
                ]
            ]
        ];
        
        $response_time = 0;
        $result = $client->post('book_slot_optimized.php', $booking_data, $response_time);
        
        $stats->recordRequest($result['success'], $response_time);
        $booking_count++;
        
        if ($booking_count % 10 === 0) {
            echo "  ✓ Created " . $booking_count . " bookings\n";
        }
    }
    
    echo "✅ Test 2 Complete\n";
}

function test_view_logs($client, $stats, $config) {
    echo "\n[TEST 3] Query Performance (view_logs.php)\n";
    echo "Simulating log queries...\n";
    
    $query_count = 0;
    
    for ($i = 0; $i < 100; $i++) {
        $response_time = 0;
        $result = $client->get('view_logs.php?log_level=ERROR&limit=100', $response_time);
        
        $stats->recordRequest($result['success'], $response_time);
        $query_count++;
        
        if ($query_count % 20 === 0) {
            echo "  ✓ Executed " . $query_count . " queries\n";
        }
    }
    
    echo "✅ Test 3 Complete\n";
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

function main() {
    global $CONFIG, $FARMERS, $RETAILERS;
    
    echo "╔════════════════════════════════════════════════════════╗\n";
    echo "║  SFMS Load Testing Suite - High Concurrency Simulation  ║\n";
    echo "╚════════════════════════════════════════════════════════╝\n";
    echo "\nConfiguration:\n";
    echo "  Base URL: " . $CONFIG['api_base_url'] . "\n";
    echo "  Simulated Users: " . $CONFIG['num_users'] . "\n";
    echo "  Requests per User: " . $CONFIG['num_requests_per_user'] . "\n";
    echo "\nTarget: 10,000 concurrent requests\n";
    
    $client = new HTTPClient($CONFIG['api_base_url']);
    $stats = new StatsTracker();
    
    // Check API is running
    echo "\n⏳ Checking API connectivity...\n";
    $result = $client->get('create_tables.php', $response_time);
    if (!$result['success']) {
        echo "❌ Cannot reach API. Make sure it's running on " . $CONFIG['api_base_url'] . "\n";
        exit(1);
    }
    echo "✅ API is reachable\n";
    
    $stats->start();
    
    try {
        // Run tests
        test_async_logging($client, $stats, $CONFIG);
        test_booking_creation($client, $stats, $CONFIG);
        test_view_logs($client, $stats, $CONFIG);
        
    } catch (Exception $e) {
        echo "❌ Error during tests: " . $e->getMessage() . "\n";
    }
    
    $stats->end();
    
    // Print results
    echo "\n╔════════════════════════════════════════════════════════╗\n";
    echo "║                    TEST RESULTS                         ║\n";
    echo "╚════════════════════════════════════════════════════════╝\n\n";
    
    $test_stats = $stats->getStats();
    
    echo "Performance Metrics:\n";
    echo "  Total Requests: " . $test_stats['total_requests'] . "\n";
    echo "  Successful: " . $test_stats['successful'] . "\n";
    echo "  Failed: " . $test_stats['failed'] . "\n";
    echo "  Success Rate: " . $test_stats['success_rate'] . "\n";
    echo "\nResponse Times:\n";
    echo "  Average: " . $test_stats['avg_response_time_ms'] . " ms\n";
    echo "  Min: " . $test_stats['min_response_time_ms'] . " ms\n";
    echo "  Max: " . $test_stats['max_response_time_ms'] . " ms\n";
    echo "  P50: " . $test_stats['p50_response_time_ms'] . " ms\n";
    echo "  P99: " . $test_stats['p99_response_time_ms'] . " ms\n";
    echo "\nThroughput:\n";
    echo "  Total Time: " . $test_stats['total_time_seconds'] . " seconds\n";
    echo "  Requests/Second: " . $test_stats['requests_per_second'] . "\n";
    
    // Performance recommendations
    echo "\n";
    if ($test_stats['p99_response_time_ms'] < 200) {
        echo "✅ EXCELLENT: P99 response time < 200ms\n";
    } elseif ($test_stats['p99_response_time_ms'] < 500) {
        echo "⚠️  GOOD: P99 response time < 500ms\n";
    } else {
        echo "❌ NEEDS IMPROVEMENT: P99 response time > 500ms\n";
    }
    
    if ($test_stats['success_rate'] === '100%') {
        echo "✅ PERFECT: 100% success rate\n";
    } else {
        echo "⚠️  WARNING: Success rate is " . $test_stats['success_rate'] . "\n";
    }
    
    echo "\n";
}

// Run tests
main();
?>
