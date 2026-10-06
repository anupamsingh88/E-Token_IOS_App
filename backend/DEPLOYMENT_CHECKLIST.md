#!/usr/bin/env php
```
╔═════════════════════════════════════════════════════════════════════════╗
║                  HIGH CONCURRENCY DEPLOYMENT CHECKLIST                  ║
║          For 5M+ Users with 10,000 Concurrent Writes                    ║
║                                                                          ║
║  Author: SFMS Optimization Suite                                        ║
║  Date: 2026-03-06                                                       ║
║  Target: Zero write blocking under peak load                            ║
╚═════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### PHASE 0: Planning (Day 1)
- [ ] Review all documentation in order:
  1. HIGH_CONCURRENCY_OPTIMIZATION.md (overview)
  2. This checklist
  3. Individual deployment guides
  
- [ ] Assess current infrastructure:
  - [ ] RAM available (need 24GB+ for InnoDB buffer)
  - [ ] Redis availability (or install new)
  - [ ] CPU cores (affects thread pool sizing)
  - [ ] Network bandwidth
  - [ ] Disk I/O capacity
  
- [ ] Get buy-in from DevOps/SysAdmin team
- [ ] Schedule maintenance window (expect 30-60 min downtime)
- [ ] Backup current database (CRITICAL!)

---

## 🔧 PHASE 1: IMMEDIATE IMPROVEMENTS (Day 1-2)

### 1.1 Database Backup
```bash
# Full backup before any changes
mysqldump -u root -p sfms_app > sfms_app_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh sfms_app_backup_*.sql
```
**Status:** [ ] Complete

### 1.2 Create Composite Indexes
```bash
# Execute index creation script
mysql -u root -p sfms_app < create_composite_indexes.sql

# Verify indexes created
mysql -u root -p sfms_app << 'EOF'
SHOW INDEX FROM product_bookings;
SHOW INDEX FROM app_logs;
SHOW INDEX FROM farmer_info;
EOF
```
**Status:** [ ] Complete
**Expected Time:** 5-10 minutes

### 1.3 Deploy Async Logger
```bash
# Copy async logger to API directory
cp app_logger_async.php /var/www/html/backend/
cp process_logs_batch.php /var/www/html/backend/

# Test async logger
php -r "
require 'db_connect.php';
\$redis = new Redis();
\$redis->connect('127.0.0.1', 6379, 1);
echo 'Redis connected: ';
var_dump(\$redis->ping());
"
```
**Status:** [ ] Complete
**Fallback:** If Redis fails, sync logging still works

### 1.4 Deploy Optimized Booking
```bash
# Backup original
cp book_slot.php book_slot.php.backup

# Deploy optimized version
cp book_slot_optimized.php book_slot.php

# Test new endpoint
curl -X POST http://localhost/backend/book_slot.php \
  -H "Content-Type: application/json" \
  -d '{
    "farmer_id": "FARMER000001",
    "retailer_id": "00001",
    "booking_date": "2026-03-06",
    "items": [{"product": "Urea", "quantity": 5}]
  }'
```
**Status:** [ ] Complete

---

## 🚀 PHASE 2: INFRASTRUCTURE SETUP (Day 2-3)

### 2.1 Install & Configure Redis
```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y redis-server

# Edit Redis config
sudo nano /etc/redis/redis.conf

# Key settings:
# maxmemory 2gb
# maxmemory-policy allkeys-lru
# appendonly yes

# Restart Redis
sudo systemctl restart redis-server

# Test Redis
redis-cli ping  # Should return PONG
redis-cli LLEN app_logs:queue  # Should return 0
```
**Status:** [ ] Complete
**Verification:**
```bash
redis-cli INFO server | head -10
redis-cli INFO stats
```

### 2.2 Install Supervisor (for batch processor)
```bash
# Install
sudo apt-get install -y supervisor

# Create config
sudo cp supervisor_config.conf /etc/supervisor/conf.d/app_logs_processor.conf

# Update and start
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start app_logs_processor:*

# Verify status
sudo supervisorctl status app_logs_processor:*
```
**Status:** [ ] Complete
**Monitor:**
```bash
# Watch log processor working
redis-cli MONITOR | grep LPUSH
# Or
tail -f /var/log/supervisor/app_logs_processor_*.log
```

### 2.3 MySQL Configuration Optimization
```bash
# Backup current config
sudo cp /etc/mysql/mysql.conf.d/mysqld.cnf \
        /etc/mysql/mysql.conf.d/mysqld.cnf.backup.$(date +%s)

# Apply optimized config (manually or via script)
# Critical settings:
# max_connections = 1000
# innodb_buffer_pool_size = 24G (adjust to 50-80% of RAM)
# innodb_log_file_size = 512M
# innodb_flush_log_at_trx_commit = 2

# Validate
sudo mysqld --validate-config

# Restart MySQL
sudo systemctl restart mysql

# Verify settings
mysql -e 'SHOW VARIABLES LIKE "max_connections";'
mysql -e 'SHOW VARIABLES LIKE "innodb_buffer_pool_size";'
```
**Status:** [ ] Complete
**⚠️ WARNING:** Changing innodb_log_file_size requires:
1. Shutdown MySQL
2. Delete old log files: rm /var/lib/mysql/ib_logfile*
3. Restart MySQL (recreates log files)

### 2.4 System Limits Optimization
```bash
# Add to /etc/security/limits.conf
sudo bash -c 'cat >> /etc/security/limits.conf << EOF
redis soft nofile 65536
redis hard nofile 65536
www-data soft nofile 65536
www-data hard nofile 65536
mysql soft nofile 65536
mysql hard nofile 65536
EOF'

# Kernel parameters
sudo bash -c 'cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 2048
net.ipv4.tcp_max_syn_backlog = 2048
vm.overcommit_memory = 1
EOF'

# Apply
sudo sysctl -p

# Verify
sysctl net.core.somaxconn
sysctl net.ipv4.tcp_max_syn_backlog
```
**Status:** [ ] Complete

---

## 📊 PHASE 3: TESTING & VALIDATION (Day 3-4)

### 3.1 Unit Testing
```bash
# Test individual components in order

echo "1. Testing async logger..."
curl -X POST http://localhost/backend/app_logger_async.php \
  -H "Content-Type: application/json" \
  -d '{"log_level": "INFO", "message": "Test", "api_url": "/test"}'

echo "2. Checking Redis queue..."
redis-cli LLEN app_logs:queue  # Should be > 0

echo "3. Running batch processor..."
php /var/www/html/backend/process_logs_batch.php

echo "4. Verifying DB inserts..."
mysql -e "SELECT COUNT(*) FROM app_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE);"

echo "5. Testing optimized booking..."
curl -X POST http://localhost/backend/book_slot.php \
  -H "Content-Type: application/json" \
  -d '{
    "farmer_id": "FARMER000001",
    "retailer_id": "00001",
    "booking_date": "2026-03-06",
    "items": [{"product": "Urea", "quantity": 5}]
  }'
```
**Status:** [ ] All tests passing

### 3.2 Load Testing
```bash
# Run load test (simulates 10K concurrent requests)
php /var/www/html/backend/load_test.php

# Expected results:
# - P50 response time: < 100ms
# - P99 response time: < 200ms
# - Success rate: 99.5%+
# - Requests/second: > 1000
```
**Status:** [ ] Load test passing
**Performance Targets:**

| Metric | Target | Status |
|--------|--------|--------|
| P50 latency | < 100ms | [ ] |
| P99 latency | < 200ms | [ ] |
| Success rate | > 99% | [ ] |
| Throughput | > 1000 req/sec | [ ] |
| Write blocking | 0% | [ ] |

### 3.3 Stress Testing
```bash
# Test at 2x expected load
# Modify load_test.php: num_users = 200

php load_test.php

# Monitor system resources
# In separate terminal:
watch -n 1 'mysql -e "SHOW STATUS LIKE \"Threads%\";"'
watch -n 1 'redis-cli INFO stats'
watch -n 1 'top -b -n 1 | head -15'
```
**Status:** [ ] Stress test passing

### 3.4 Monitor Writes Under Load
```bash
# While load test running, in another terminal:

# Check for blocked queries
watch -n 1 'mysql -e "SHOW PROCESSLIST WHERE COMMAND != \"Sleep\";"'

# Check InnoDB locks
watch -n 1 'mysql -e "SHOW ENGINE InnoDB STATUS\G" | grep -A 20 "WAITING FOR"'

# Check lock waits
mysql -e "SELECT * FROM performance_schema.events_waits_current WHERE OBJECT_SCHEMA = \"sfms_app\";"

# Check query performance
mysql -e "EXPLAIN FORMAT=JSON SELECT * FROM product_bookings WHERE farmer_id = \"FARMER000001\" ORDER BY booking_date DESC LIMIT 10;"
```
**Goal:** Zero "WAITING FOR" locks, all writes complete in < 200ms

---

## 📈 PHASE 4: MONITORING SETUP (Day 4-5)

### 4.1 Slow Query Logging
```bash
# Enable slow query log
mysql -e "SET GLOBAL slow_query_log = 1;"
mysql -e "SET GLOBAL long_query_time = 2;"

# Verify
mysql -e "SHOW VARIABLES LIKE 'slow_query_log%';"
mysql -e "SHOW VARIABLES LIKE 'long_query_time';"

# View slow queries
tail -f /var/log/mysql/slow.log

# Analyze slow queries
pt-query-digest /var/log/mysql/slow.log
```
**Status:** [ ] Complete

### 4.2 Performance Schema Monitoring
```bash
# Check top tables by access
mysql << 'EOF'
SELECT OBJECT_SCHEMA, OBJECT_NAME, COUNT_READ, COUNT_WRITE, COUNT_FETCH, COUNT_INSERT, COUNT_UPDATE, COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA = 'sfms_app'
ORDER BY COUNT_READ + COUNT_WRITE DESC;
EOF

# Check index usage
mysql << 'EOF'
SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, COUNT_READ, COUNT_WRITE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'sfms_app'
ORDER BY COUNT_READ DESC;
EOF
```
**Status:** [ ] Monitoring enabled

### 4.3 Log Rotation
```bash
# Create logrotate config for app logs
sudo tee /etc/logrotate.d/app_logs << 'EOF'
/var/log/app_logs_processor*.log
/var/log/supervisor/app_logs_processor*.log
{
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        supervisorctl restart app_logs_processor:* > /dev/null 2>&1 || true
    endscript
}
EOF

# Test logrotate
sudo logrotate -f /etc/logrotate.d/app_logs
```
**Status:** [ ] Complete

### 4.4 Alerts & Monitoring Dashboard
```bash
# Optional: Install monitoring tools
sudo apt-get install -y prometheus grafana-server

# Or use simpler approach: create monitoring script
cat > /usr/local/bin/monitor_sfms.sh << 'MONITOR'
#!/bin/bash
echo "=== SFMS Health Check ==="
echo "MySQL connections: $(mysql -e 'SHOW STATUS LIKE \"Threads_connected\";' | tail -1)"
echo "Redis queue size: $(redis-cli LLEN app_logs:queue)"
echo "Log processor status: $(supervisorctl status app_logs_processor:* | tail -3)"
echo "Slow queries (last hour): $(tail -100 /var/log/mysql/slow.log | grep 'Query_time' | wc -l)"
echo ""
MONITOR

chmod +x /usr/local/bin/monitor_sfms.sh

# Add to crontab for hourly checks
echo "0 * * * * /usr/local/bin/monitor_sfms.sh >> /var/log/sfms_health.log" | crontab -
```
**Status:** [ ] Complete

---

## 🔄 PHASE 5: PRODUCTION ROLLOUT (Day 5)

### 5.1 Pre-Production Verification
```bash
#!/bin/bash
echo "📋 Pre-Production Checklist"
echo ""

# Check all components
echo "✓ Redis running:"
redis-cli ping

echo "✓ MySQL running with optimizations:"
mysql -e 'SHOW VARIABLES LIKE "max_connections";'

echo "✓ Supervisor processors running:"
supervisorctl status app_logs_processor:*

echo "✓ Async logger deployed:"
curl -s http://localhost/backend/app_logger_async.php || echo "Deploy complete"

echo "✓ All indexes created:"
mysql sfms_app -e 'SHOW INDEX FROM product_bookings;' | wc -l

echo "✓ Batch processor working:"
redis-cli LLEN app_logs:queue

echo ""
echo "✅ All pre-production checks passed!"
```
**Status:** [ ] Complete

### 5.2 Gradual Rollout (Not Big Bang)
```bash
# Option 1: Canary deployment
# 1. Deploy to 10% of users
# 2. Monitor for 24 hours
# 3. Expand to 50%
# 4. Monitor for 24 hours
# 5. Full rollout

# Use feature flags or separate endpoint:
# Old: /backend/book_slot.php
# New: /backend/book_slot.php?use_optimized=1

# In book_slot.php:
if ($_GET['use_optimized'] ?? false) {
    // Include optimized version
    require 'book_slot_optimized.php';
    exit;
}

# Gradually increase percentage over 1 week
```
**Status:** [ ] Strategy defined

### 5.3 Monitoring During Rollout
```bash
# Keep terminal open with real-time stats
watch -n 5 'mysql -e "SHOW STATUS;" | grep "Threads\|Questions\|Slow"'

# Redis queue monitoring
watch -n 5 'redis-cli LLEN app_logs:queue'

# Error rate monitoring
watch -n 5 'mysql -e "SELECT COUNT(*) FROM app_logs WHERE log_level=\"ERROR\" AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);"'

# Response time monitoring
watch -n 5 'tail -20 /var/log/mysql/slow.log | tail -5'
```
**Status:** [ ] Monitoring setup

### 5.4 Rollback Plan
```bash
# If issues occur:

# 1. Stop async logger
supervisorctl stop app_logs_processor:*

# 2. Switch back to original book_slot
cp book_slot.php.backup book_slot.php

# 3. Clear Redis queue
redis-cli DEL app_logs:queue

# 4. Revert MySQL configs
sudo cp /etc/mysql/mysql.conf.d/mysqld.cnf.backup.* /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql

# 5. Drop new indexes (optional)
mysql sfms_app < DROP_INDEXES.sql
```
**Status:** [ ] Rollback documented

---

## ⚡ POST-DEPLOYMENT OPTIMIZATION (Week 2+)

### 6.1 Performance Tuning
- [ ] Analyze slow queries: `pt-query-digest /var/log/mysql/slow.log`
- [ ] Adjust buffer pool size if needed (monitor cache hit ratio)
- [ ] Optimize individual queries based on EXPLAIN plans
- [ ] Add missing indexes if needed
- [ ] Consider table partitioning if over 1B rows

### 6.2 Load Balancing (If needed)
- [ ] Add HAProxy for multi-DB setup
- [ ] Implement read replicas for analytics queries
- [ ] Consider sharding for farmer_id/retailer_id keys

### 6.3 Advanced Caching
- [ ] Implement Redis caching for frequently accessed data
- [ ] Add memcached layer for session data
- [ ] Consider CDN for static assets

---

## 📞 SUPPORT & TROUBLESHOOTING

### Issue: Async logs not being processed
```bash
# Check Redis is running
redis-cli ping

# Check queue size
redis-cli LLEN app_logs:queue

# Check supervisor is running
supervisorctl status app_logs_processor:*

# Check logs
tail -f /var/log/supervisor/app_logs_processor_00.log

# Restart processor
supervisorctl restart app_logs_processor:*
```

### Issue: Slow bookings after optimization
```bash
# Check if new code has cached data
# Solution: Clear cache
php -r "if (function_exists('apc_clear_cache')) apc_clear_cache();"

# Check if missing where clause
# Run: EXPLAIN on new query
mysql -e "EXPLAIN SELECT * FROM product_bookings WHERE farmer_id = 'X'"

# Verify indexes exist
mysql -e "SHOW INDEX FROM product_bookings;"
```

### Issue: High memory usage
```bash
# Check MySQL buffer pool usage
mysql -e "SHOW STATUS LIKE 'Innodb_buffer_pool%';"

# Check Redis memory
redis-cli INFO memory

# Reduce buffer pool size if needed
# Edit /etc/mysql/mysql.conf.d/mysqld.cnf
# innodb_buffer_pool_size = 16G  (reduce from 24G)
# Restart MySQL
```

---

## 📊 EXPECTED IMPROVEMENTS

### Before Optimization
- Write latency (p99): 5000ms+ ❌
- Concurrent connections: 151 ❌
- Timeout rate: 5-10% ❌
- CPU usage: 85%+ ❌
- Query blocking: Common ❌

### After Optimization
- Write latency (p99): < 200ms ✅
- Concurrent connections: 1000+ ✅
- Timeout rate: < 0.1% ✅
- CPU usage: 40-60% ✅
- Query blocking: Rare ✅

---

## 📝 SIGN-OFF

- [ ] Infrastructure Team reviewed
- [ ] Database Admin approved
- [ ] All tests passed
- [ ] Monitoring setup confirmed
- [ ] Rollback plan reviewed
- [ ] Deployment scheduled

**Go-Live Date:** _______________
**Deployment Lead:** _______________
**Monitoring Lead:** _______________

---

**Last Updated:** 2026-03-06  
**Next Review:** After 1 month of production use
