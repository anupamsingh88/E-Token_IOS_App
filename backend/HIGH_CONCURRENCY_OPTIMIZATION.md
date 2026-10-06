# High Concurrency Optimization - 5 Million Users + 10,000 Concurrent Writes

## Context
- **Estimated Users:** 50 lakh+ (5 million+)
- **Peak Concurrent:** 10,000 users hitting simultaneously
- **Critical Requirement:** Reads ✅ fine | Writes ❌ MUST NOT BLOCK

---

## ⚠️ CRITICAL PROBLEMS IN CURRENT CODE

### Problem 1: **Synchronous Logging Bottleneck** (app_logger.php)
```php
// CURRENT: Every API call = Synchronous DB INSERT
INSERT INTO app_logs VALUES (...) // BLOCKS until DB responds
```
**Impact:** 10,000 concurrent requests = 10,000 waiting for DB writes  
**Result:** Database connection pool exhausted, timeouts

### Problem 2: **Pre-INSERT Read Checks** (book_slot.php)
```php
// Multiple SELECTs before INSERT
SELECT COUNT(*) FROM product_bookings WHERE farmer_id = ?  // Lock acquired
SELECT COUNT(*) FROM product_bookings WHERE farmer_id = ?  // Wait...
SELECT farmer_info FROM...                                  // Still waiting
INSERT INTO...                                              // Finally
```
**Impact:** Row locks accumulate, causing write stalls
**Result:** Booking requests timeout during peak hours

### Problem 3: **Heavy Transactions** (approve_booking.php)
```php
BEGIN TRANSACTION;
// Multiple UPDATEs with complex WHERE clauses
UPDATE product_bookings SET status = 'Booked' ...
UPDATE product_bookings SET status = 'Cancelled' ...
UPDATE retailer_stock SET ... WHERE retailer_id = ? AND date = ?
COMMIT;
```
**Impact:** Long transactions hold locks across tables
**Result:** Other writes get blocked waiting for lock release

---

## 🔧 SOLUTION ARCHITECTURE

### Solution 1: **Asynchronous Logging with Queue + Batch Processing**

```php
// ==================== app_logger_async.php ====================
// NEW: Non-blocking logging with Redis Queue
require_once 'db_connect.php';
require_once 'redis_client.php';  // Ensure Redis is available

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

try {
    // ASYNC: Push to Redis queue (non-blocking, ~1ms)
    $redis = new Redis();
    $redis->connect('127.0.0.1', 6379, 1);  // 1 second timeout
    
    $queue_key = 'app_logs:queue';
    $redis->lPush($queue_key, json_encode($data));  // O(1) operation
    
    // Set expiry on queue (auto-cleanup after 24 hours if not processed)
    $redis->expire($queue_key, 86400);
    
    http_response_code(202);  // Accepted
    echo json_encode(['success' => true, 'queued' => true]);
    $redis->close();
    
} catch (Exception $e) {
    // Fallback: Direct insert if Redis fails (slower but doesn't crash)
    try {
        $stmt = $conn->prepare("INSERT INTO app_logs 
            (log_level, message, api_url, method, status_code, farmer_id, retailer_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
        
        // Only log essentials to avoid large writes
        $stmt->bind_param("sssssss",
            $data['log_level'] ?? 'INFO',
            $data['message'] ?? '',
            $data['api_url'] ?? '',
            $data['method'] ?? '',
            $data['status_code'] ?? 0,
            $data['farmer_id'] ?? null,
            $data['retailer_id'] ?? null
        );
        
        $stmt->execute();
        http_response_code(200);
        echo json_encode(['success' => true, 'queued' => false]);
    } catch (Exception $e2) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Logging failed']);
    }
}

$conn->close();
?>
```

### **Batch Log Processor** (Runs every 5 seconds, via cron/supervisor)
```php
// ==================== process_logs_batch.php ====================
// Run via: php process_logs_batch.php (or cron: */5 * * * * /usr/bin/php ...)

require_once 'db_connect.php';
require_once 'redis_client.php';

$redis = new Redis();
$redis->connect('127.0.0.1', 6379, 1);

$queue_key = 'app_logs:queue';
$batch_size = 1000;  // Process max 1000 logs per batch
$batch = [];

// Pop up to 1000 logs from queue (O(n) but efficient)
for ($i = 0; $i < $batch_size; $i++) {
    $item = $redis->rPop($queue_key);
    if (!$item) break;
    $batch[] = json_decode($item, true);
}

if (empty($batch)) {
    // Queue is empty
    echo "No logs to process\n";
    exit;
}

try {
    // BULK INSERT: 1000 logs in single INSERT (much faster)
    $values = [];
    $placeholders = [];
    $types = '';
    $params = [];
    
    foreach ($batch as $log) {
        $placeholders[] = "(?, ?, ?, ?, ?, ?, ?, NOW())";
        $types .= "sssssss";
        
        $params[] = $log['log_level'] ?? 'INFO';
        $params[] = $log['message'] ?? '';
        $params[] = $log['api_url'] ?? '';
        $params[] = $log['method'] ?? '';
        $params[] = $log['status_code'] ?? 0;
        $params[] = $log['farmer_id'] ?? null;
        $params[] = $log['retailer_id'] ?? null;
    }
    
    $sql = "INSERT INTO app_logs 
            (log_level, message, api_url, method, status_code, farmer_id, retailer_id, created_at)
            VALUES " . implode(',', $placeholders);
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    
    echo "✅ Processed " . count($batch) . " logs\n";
    
} catch (Exception $e) {
    // On error, push failed logs back to queue for retry
    foreach ($batch as $log) {
        $redis->lPush($queue_key, json_encode($log));
    }
    echo "❌ Error: " . $e->getMessage() . "\n";
}

$conn->close();
$redis->close();
?>
```

---

## Solution 2: **Optimized Booking with Minimal Locks**

```php
// ==================== book_slot_optimized.php ====================

require_once 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

$farmer_id = $data['farmer_id'] ?? '';
$retailer_id = $data['retailer_id'] ?? '';
$booking_date = $data['booking_date'] ?? '';
$items = $data['items'] ?? [];

// === OPTIMIZATION 1: Cache farmer data to reduce SELECT queries ===
// Check if farmer_id exists in cache
$cache_key = "farmer:{$farmer_id}";
$farmer_data = apc_fetch($cache_key);  // APC is in-process, ultra-fast

if ($farmer_data === false) {
    // Cache miss - load from DB
    $stmt = $conn->prepare("SELECT khasra_rukba, status FROM farmer_info WHERE farmer_id = ? LIMIT 1");
    $stmt->bind_param("s", $farmer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Farmer not found']);
        exit;
    }
    
    $farmer_data = $result->fetch_assoc();
    
    // Cache for 5 minutes (farmer land area doesn't change often)
    apc_store($cache_key, $farmer_data, 300);
}

$land_area = floatval($farmer_data['khasra_rukba']);

// === OPTIMIZATION 2: Single SELECT with GROUP BY for quota checks ===
// Instead of loop querying, get all quota info in one query
$quota_query = "SELECT 
                    product, 
                    SUM(quantity) as booked_qty,
                    (SELECT COUNT(DISTINCT CASE WHEN order_id IS NULL THEN id ELSE order_id END)
                     FROM product_bookings 
                     WHERE farmer_id = ? AND booking_date = ? AND status != 'Cancelled') as daily_count,
                    (SELECT COUNT(DISTINCT CASE WHEN order_id IS NULL THEN id ELSE order_id END)
                     FROM product_bookings 
                     WHERE farmer_id = ? AND status = 'Pending') as pending_count
                FROM product_bookings 
                WHERE farmer_id = ? AND status != 'Cancelled'
                GROUP BY product";

$stmt = $conn->prepare($quota_query);
$stmt->bind_param("ssss", $farmer_id, $booking_date, $farmer_id, $farmer_id);
$stmt->execute();
$quota_result = $stmt->get_result();

$booked_by_product = [];
$metadata = [];
while ($row = $quota_result->fetch_assoc()) {
    $booked_by_product[$row['product']] = intval($row['booked_qty']);
    $metadata['daily_count'] = intval($row['daily_count']);
    $metadata['pending_count'] = intval($row['pending_count']);
}

// === OPTIMIZATION 3: Validate BEFORE transaction ===
// Don't hold locks while validating - do validation first
$limits = ['Urea' => 30, 'DAP' => 20, 'NPK' => 25, 'MOP' => 15];  // Cached

if ($metadata['daily_count'] >= 3) {
    echo json_encode(['success' => false, 'message' => 'Daily limit reached']);
    exit;
}

if ($metadata['pending_count'] >= 3) {
    echo json_encode(['success' => false, 'message' => 'Pending limit reached']);
    exit;
}

// Validate each product
foreach ($items as $item) {
    $product = $item['product'];
    $qty = intval($item['quantity']);
    
    $limit = $limits[$product] ?? 0;
    $max_allowed = floor($land_area * $limit);
    $booked = $booked_by_product[$product] ?? 0;
    
    if (($booked + $qty) > $max_allowed) {
        echo json_encode([
            'success' => false,
            'message' => "Quota exceeded for {$product}. Max: {$max_allowed}, Used: {$booked}, Requested: {$qty}"
        ]);
        exit;
    }
}

// === OPTIMIZATION 4: Short transaction - INSERT ONLY ===
// All validation done BEFORE lock acquisition
$conn->begin_transaction();

try {
    $order_id = 'ORD' . date('ymd') . strtoupper(substr(uniqid(), -4));
    
    // Single INSERT statement for all items (minimal lock duration)
    $ins_stmt = $conn->prepare("INSERT INTO product_bookings 
        (retailer_id, farmer_id, order_id, booking_date, product, quantity, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())");
    
    foreach ($items as $item) {
        $ins_stmt->bind_param("sssssi", 
            $retailer_id, 
            $farmer_id, 
            $order_id, 
            $booking_date,
            $item['product'],
            $item['quantity']
        );
        $ins_stmt->execute();
    }
    
    $conn->commit();
    
    // Invalidate farmer cache after write
    apc_delete($cache_key);
    
    echo json_encode(['success' => true, 'order_id' => $order_id]);
    
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => 'Booking failed: ' . $e->getMessage()]);
}

$conn->close();
?>
```

---

## Solution 3: **Connection Pooling Configuration**

```ini
# ==================== my.cnf (MySQL Configuration) ====================

[mysqld]

# === Connection & Thread Pool ===
max_connections = 500              # Increased from default 151
max_allowed_packet = 64M            # For large batch inserts
thread_stack = 256K
thread_cache_size = 400             # Cache threads for reuse

# === InnoDB Optimization (for high concurrency) ===
innodb_buffer_pool_size = 8G        # 50-80% of RAM
innodb_log_file_size = 512M         # Larger logs = fewer disk sync waits
innodb_flush_log_at_trx_commit = 2  # Balance between safety & speed
innodb_flush_method = O_DIRECT      # Bypass OS cache
innodb_thread_concurrency = 0       # Auto-tune for systems
innodb_lock_wait_timeout = 30       # Default 50s, reduce to avoid timeouts

# === Query Cache (for repeated reads) ===
query_cache_size = 256M
query_cache_type = 1

# === Slow Query Log ===
slow_query_log = 1
long_query_time = 2
log_slow_queries = /var/log/mysql/slow.log

# === Binary Logging (for replication) ===
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW                 # Row-based for accuracy
binlog_row_image = MINIMAL          # Smaller logs
expire_logs_days = 7
```

---

## Solution 4: **PHP-FPM & Connection Pooling**

```ini
# ==================== php-fpm.conf ====================

[www]
; Increase number of PHP workers
pm = dynamic
pm.max_children = 200              # Max processes
pm.start_servers = 50              # Initial processes
pm.min_spare_servers = 20
pm.max_spare_servers = 100
pm.max_requests = 5000             # Restart process after 5000 reqs

; Database connection pooling
; Note: Use connection pooling library instead

[global]
; Enable opcache to reduce PHP parsing overhead
opcache.enable = 1
opcache.memory_consumption = 256
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0    # Don't check file timestamps in production
```

---

## Solution 5: **Database Connection Pooling (PHP)**

```php
// ==================== DBPool.php ====================
// Connection pooling library to reuse DB connections

class DBPool {
    private static $instance = null;
    private $connections = [];
    private $max_connections = 50;
    private $available = [];
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        // Try to get available connection
        if (!empty($this->available)) {
            return array_pop($this->available);
        }
        
        // Create new if under limit
        if (count($this->connections) < $this->max_connections) {
            $conn = $this->createConnection();
            $this->connections[] = $conn;
            return $conn;
        }
        
        // Wait for available connection (blocking, but rare)
        while (empty($this->available)) {
            usleep(100000);  // 100ms wait
        }
        return array_pop($this->available);
    }
    
    public function releaseConnection($conn) {
        // Return connection to pool for reuse
        $this->available[] = $conn;
    }
    
    private function createConnection() {
        $conn = new mysqli('localhost', 'root', 'mysql', 'sfms_app');
        if ($conn->connect_error) {
            throw new Exception('DB Connection failed');
        }
        $conn->set_charset("utf8mb4");
        return $conn;
    }
}

// Usage in your code:
// $pool = DBPool::getInstance();
// $conn = $pool->getConnection();
// ... do work ...
// $pool->releaseConnection($conn);
```

---

## Solution 6: **Caching Layer (Redis)**

```php
// ==================== CacheManager.php ====================

class CacheManager {
    private $redis;
    
    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect('127.0.0.1', 6379);
    }
    
    // Get farmer quota from cache
    public function getFarmerQuota($farmer_id) {
        $key = "quota:{$farmer_id}:daily";
        
        $quota = $this->redis->get($key);
        if ($quota !== false) {
            return json_decode($quota, true);
        }
        
        return null;  // Cache miss
    }
    
    // Set farmer quota in cache
    public function setFarmerQuota($farmer_id, $quota_data) {
        $key = "quota:{$farmer_id}:daily";
        $this->redis->setex($key, 3600, json_encode($quota_data));  // 1 hour TTL
    }
    
    // Increment farmer's daily booking count (atomic)
    public function incrementDailyBookings($farmer_id, $count = 1) {
        $key = "daily_bookings:{$farmer_id}";
        $result = $this->redis->incrBy($key, $count);
        
        // Auto-reset at midnight
        $ttl = $this->redis->ttl($key);
        if ($ttl === -1) {
            $this->redis->expireAt($key, strtotime('tomorrow 00:00:00'));
        }
        
        return $result;
    }
}
```

---

## Solution 7: **Table Partitioning (Advanced)**

```sql
-- === Partition product_bookings by booking_date ===
-- Splits large table into smaller chunks = faster queries & writes

CREATE TABLE product_bookings_partitioned (
    id INT AUTO_INCREMENT PRIMARY KEY,
    retailer_id INT NOT NULL,
    farmer_id VARCHAR(50) NOT NULL,
    booking_date DATE NOT NULL,
    product ENUM('Urea', 'DAP', 'NPK', 'MOP') NOT NULL,
    quantity INT NOT NULL,
    status ENUM('Pending','Collected', 'Cancelled', 'Approved', 'Extended') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_farmer_date (farmer_id, booking_date),
    INDEX idx_retailer_status (retailer_id, status)
)
ENGINE=InnoDB
PARTITION BY RANGE (YEAR_MONTH(booking_date)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p202603 VALUES LESS THAN (202604),
    -- ... monthly partitions
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Benefit: Query for specific date only searches 1 partition, not whole table
```

---

## Solution 8: **Read Replicas & Replication**

```
Master (Write)          Replica 1           Replica 2
    |                      |                   |
    |---(binlog)---------->|                   |
    |---(binlog)-----------|---(binlog)------->|
    
- Master: All WRITES (book_slot, approve_booking)
- Replicas: All READS (get_farmer_bookings, view_logs)
- Reduces load on master ~70%
```

```php
// ==================== db_connect_advanced.php ====================

$write_config = [
    'host' => 'master.db.com',
    'user' => 'root',
    'pass' => 'mysql',
    'db' => 'sfms_app'
];

$read_replicas = [
    ['host' => 'replica1.db.com', 'user' => 'readonly', 'pass' => 'readonly', 'db' => 'sfms_app'],
    ['host' => 'replica2.db.com', 'user' => 'readonly', 'pass' => 'readonly', 'db' => 'sfms_app']
];

// Write to master
$write_conn = new mysqli($write_config['host'], $write_config['user'], 
                         $write_config['pass'], $write_config['db']);

// Read from replica (round-robin)
$replica = $read_replicas[rand(0, count($read_replicas)-1)];
$read_conn = new mysqli($replica['host'], $replica['user'], 
                        $replica['pass'], $replica['db']);

// Usage:
// INSERT/UPDATE/DELETE → use $write_conn
// SELECT             → use $read_conn
```

---

## Implementation Checklist (Priority Order)

### **PHASE 1: Immediate (1-2 weeks)**
- [ ] Implement async logging (app_logger_async + batch processor)
  - **Impact:** Reduces write load by 40-50%
  
- [ ] Optimize book_slot with caching + minimal locks
  - **Impact:** Faster booking, fewer timeouts
  
- [ ] Deploy connection pooling
  - **Impact:** Better resource utilization
  
- [ ] Update my.cnf for high concurrency
  - **Impact:** Better lock handling, reduced waits

### **PHASE 2: Medium-term (2-4 weeks)**
- [ ] Add Redis caching layer
  - **Impact:** 10x faster quota checks
  
- [ ] Implement read replicas
  - **Impact:** 50-70% reduction in write-lock contention
  
- [ ] Database connection pooling library
  - **Impact:** Smoother connection management

### **PHASE 3: Long-term (1-3 months)**
- [ ] Table partitioning by date
  - **Impact:** Faster queries on large tables
  
- [ ] Sharding strategy (if needed after replicas)
  - **Impact:** Horizontal scaling beyond single DB

---

## Performance Targets After Implementation

| Metric | Before | After |
|--------|--------|-------|
| **Concurrent connections** | Limited | 10,000+ |
| **Write latency (p50)** | 200ms | <50ms |
| **Write latency (p99)** | 5000ms | <200ms |
| **Query timeout rate** | 5-10% | <0.1% |
| **DB CPU usage** | 85% | <60% |
| **Connection pool wait** | Common | Rare |

---

## Monitoring Commands

```bash
# Monitor MySQL during load test
mysql -e "SHOW PROCESSLIST;" # Every 30 seconds

# Check lock waits
mysql -e "SHOW ENGINE InnoDB STATUS;" | grep "WAITING"

# Monitor Redis queue
redis-cli LLEN app_logs:queue

# Check slow queries
tail -f /var/log/mysql/slow.log

# Monitor PHP-FPM
php-fpm -T  # Status

# Load testing
siege -c 10000 -r 100 http://your-api.com/book_slot.php
```

---

## References
- MySQL 8.0 Docs: Group Replication & Partitioning
- Redis Best Practices: Queue patterns
- PHP-FPM: Process manager tuning
- InnoDB: Concurrency controls

**Generated:** 2026-03-06  
**For:** 5M+ users, 10K concurrent writes
