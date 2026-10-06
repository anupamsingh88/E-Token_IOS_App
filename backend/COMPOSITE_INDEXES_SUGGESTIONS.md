# Composite Indexes Suggestions for SFMS Database

## Overview
Based on analysis of all PHP files and database queries, here are the recommended **composite indexes** for optimal query performance.

---

## 1. **product_bookings Table** 
Most frequently queried table. High transaction volume expected.

### Index 1.1: Farmer Bookings with Date Filter
```sql
CREATE INDEX idx_farmer_booking_date_status 
ON product_bookings(farmer_id, booking_date, status);
```
**Used by:** `book_slot.php` (daily limit check), `get_farmer_bookings.php`
**Query:** `SELECT * WHERE farmer_id = ? AND booking_date = ? AND status != 'Cancelled'`

---

### Index 1.2: Farmer Pending Bookings
```sql
CREATE INDEX idx_farmer_status_created 
ON product_bookings(farmer_id, status, created_at DESC);
```
**Used by:** `book_slot.php` (pending count), `cancel_booking.php`
**Query:** `SELECT COUNT(*) WHERE farmer_id = ? AND status = 'Pending'`

---

### Index 1.3: Farmer Quota Check (Product-based)
```sql
CREATE INDEX idx_farmer_product_status 
ON product_bookings(farmer_id, product, status);
```
**Used by:** `book_slot.php` (quota calculation)
**Query:** `SELECT SUM(quantity) WHERE farmer_id = ? AND product = ? AND status != 'Cancelled'`

---

### Index 1.4: Retailer Pending Bookings
```sql
CREATE INDEX idx_retailer_status_created 
ON product_bookings(retailer_id, status, created_at ASC);
```
**Used by:** `get_pending_bookings.php`
**Query:** `SELECT * WHERE retailer_id = ? AND status = 'Pending' ORDER BY created_at ASC`

---

### Index 1.5: Order ID Lookups
```sql
CREATE INDEX idx_order_status 
ON product_bookings(order_id, status);
```
**Used by:** `approve_booking.php`
**Query:** `SELECT * WHERE order_id = ? AND status = 'Pending'`

---

### Index 1.6: Farmer Bookings with Sorting
```sql
CREATE INDEX idx_farmer_booking_sort 
ON product_bookings(farmer_id, booking_date DESC, created_at DESC);
```
**Used by:** `get_farmer_bookings.php` (complex JOIN query)
**Query:** `SELECT * WHERE farmer_id = ? ORDER BY booking_date DESC, created_at DESC`

---

## 2. **app_logs Table**
Heavy logging reads for filtering and analytics.

### Index 2.1: Log Level + Date Range
```sql
CREATE INDEX idx_loglevel_created 
ON app_logs(log_level, created_at DESC);
```
**Used by:** `view_logs.php` (filter by level)
**Query:** `SELECT * WHERE log_level = ? AND created_at >= NOW() - INTERVAL 24 HOUR ORDER BY created_at DESC`

---

### Index 2.2: Farmer Activity Logs
```sql
CREATE INDEX idx_farmer_logs_created 
ON app_logs(farmer_id, created_at DESC);
```
**Used by:** `view_logs.php` (farmer-specific logs)
**Query:** `SELECT * WHERE farmer_id LIKE ? ORDER BY created_at DESC`

---

### Index 2.3: Retailer Activity Logs
```sql
CREATE INDEX idx_retailer_logs_created 
ON app_logs(retailer_id, created_at DESC);
```
**Used by:** `view_logs.php` (retailer-specific logs)
**Query:** `SELECT * WHERE retailer_id LIKE ? ORDER BY created_at DESC`

---

### Index 2.4: API Endpoint Tracking
```sql
CREATE INDEX idx_api_url_created 
ON app_logs(api_url, created_at DESC);
```
**Used by:** `view_logs.php` (filter by endpoint)
**Query:** `SELECT * WHERE api_url LIKE ? ORDER BY created_at DESC`

---

## 3. **farmer_info Table**

### Index 3.1: Status-based Queries with Sorting
```sql
CREATE INDEX idx_status_created 
ON farmer_info(status, created_at DESC);
```
**Used by:** `get_pending_approvals.php`
**Query:** `SELECT * WHERE approval_status = 'pending' ORDER BY created_at DESC`

---

### Index 3.2: Village-based Lookups
```sql
CREATE INDEX idx_village_status 
ON farmer_info(village_id, status);
```
**Used by:** Analytics and reporting queries
**Query:** `SELECT * WHERE village_id = ? AND status = 'approved'`

---

### Index 3.3: District Filtering
```sql
CREATE INDEX idx_district_created 
ON farmer_info(district_id, created_at DESC);
```
**Used by:** District-wise reporting
**Query:** `SELECT * WHERE district_id = ? ORDER BY created_at DESC`

---

## 4. **retailer_info Table**

### Index 4.1: Status + Created Date
```sql
CREATE INDEX idx_retailer_status_created 
ON retailer_info(status, created_at DESC);
```
**Used by:** `get_pending_approvals.php`
**Query:** `SELECT * WHERE approval_status = 'pending' ORDER BY created_at DESC`

---

### Index 4.2: District-based Seller Search
```sql
CREATE INDEX idx_retailer_district_status 
ON retailer_info(district_id, status);
```
**Used by:** Retailer discovery queries
**Query:** `SELECT * WHERE district_id = ? AND status = 'active'`

---

## 5. **retailer_daily_stock Table**

### Index 5.1: Query by Retail & Date Range (Already has UNIQUE)
```sql
CREATE INDEX idx_retailer_date_range 
ON retailer_daily_stock(retailer_id, date DESC);
```
**Used by:** Stock reports and daily updates
**Query:** `SELECT * WHERE retailer_id = ? AND date BETWEEN ? AND ?`

---

## 6. **retailer_change_requests Table**

### Index 6.1: Farmer Change Status
```sql
CREATE INDEX idx_farmer_change_status 
ON retailer_change_requests(farmer_id, status, created_at DESC);
```
**Used by:** Pending retailer change requests
**Query:** `SELECT * WHERE farmer_id = ? AND status = 'pending' ORDER BY created_at DESC`

---

### Index 6.2: Status-based Bulk Operations
```sql
CREATE INDEX idx_change_status_created 
ON retailer_change_requests(status, created_at DESC);
```
**Used by:** Admin approvals dashboard
**Query:** `SELECT * WHERE status = 'pending' ORDER BY created_at DESC`

---

## 7. **app_content Table**

### Index 7.1: Category + Display Order
```sql
CREATE INDEX idx_content_category_order 
ON app_content(category, display_order);
```
**Used by:** `get_app_content.php`
**Query:** `SELECT * WHERE category = ? AND is_active = 1 ORDER BY display_order`

---

### Index 7.2: Content Key Lookup
```sql
CREATE INDEX idx_content_key 
ON app_content(content_key);
```
**Note:** May want to ensure UNIQUE is already on content_key
**Used by:** Direct content retrieval by key

---

## 8. **system_logs Table**

### Index 8.1: Level + Timestamp
```sql
CREATE INDEX idx_syslog_level_time 
ON system_logs(level, timestamp DESC);
```
**Used by:** Error analysis and debugging
**Query:** `SELECT * WHERE level = 'ERROR' ORDER BY timestamp DESC`

---

## Implementation Order (Priority)

### **HIGH PRIORITY** (Critical for performance)
1. `product_bookings(farmer_id, booking_date, status)` - Most frequent queries
2. `product_bookings(farmer_id, status, created_at DESC)` - Daily operations
3. `app_logs(log_level, created_at DESC)` - Logging performance
4. `product_bookings(retailer_id, status, created_at ASC)` - Admin dashboard
5. `farmer_info(status, created_at DESC)` - Approval workflows

### **MEDIUM PRIORITY** (Improves analytics)
6. `product_bookings(farmer_id, product, status)` - Quota validation
7. `product_bookings(order_id, status)` - Order tracking
8. `app_logs(farmer_id, created_at DESC)` - User tracing
9. `retailer_info(district_id, status)` - Location searches
10. `retailer_daily_stock(retailer_id, date DESC)` - Stock reports

### **LOW PRIORITY** (Nice to have)
11. `app_content(category, display_order)` - CMS optimization
12. `system_logs(level, timestamp DESC)` - System monitoring
13. `retailer_change_requests(farmer_id, status, created_at DESC)` - Change tracking

---

## Full SQL Script (Ready to Execute)

```sql
-- ========== PRODUCT_BOOKINGS INDEXES ==========
CREATE INDEX idx_farmer_booking_date_status ON product_bookings(farmer_id, booking_date, status);
CREATE INDEX idx_farmer_status_created ON product_bookings(farmer_id, status, created_at DESC);
CREATE INDEX idx_farmer_product_status ON product_bookings(farmer_id, product, status);
CREATE INDEX idx_retailer_status_created ON product_bookings(retailer_id, status, created_at ASC);
CREATE INDEX idx_order_status ON product_bookings(order_id, status);
CREATE INDEX idx_farmer_booking_sort ON product_bookings(farmer_id, booking_date DESC, created_at DESC);

-- ========== APP_LOGS INDEXES ==========
CREATE INDEX idx_loglevel_created ON app_logs(log_level, created_at DESC);
CREATE INDEX idx_farmer_logs_created ON app_logs(farmer_id, created_at DESC);
CREATE INDEX idx_retailer_logs_created ON app_logs(retailer_id, created_at DESC);
CREATE INDEX idx_api_url_created ON app_logs(api_url, created_at DESC);

-- ========== FARMER_INFO INDEXES ==========
CREATE INDEX idx_farmer_status_created ON farmer_info(status, created_at DESC);
CREATE INDEX idx_farmer_village_status ON farmer_info(village_id, status);
CREATE INDEX idx_farmer_district_created ON farmer_info(district_id, created_at DESC);

-- ========== RETAILER_INFO INDEXES ==========
CREATE INDEX idx_retailer_status_created ON retailer_info(status, created_at DESC);
CREATE INDEX idx_retailer_district_status ON retailer_info(district_id, status);

-- ========== RETAILER_DAILY_STOCK INDEXES ==========
CREATE INDEX idx_retailer_date_range ON retailer_daily_stock(retailer_id, date DESC);

-- ========== RETAILER_CHANGE_REQUESTS INDEXES ==========
CREATE INDEX idx_farmer_change_status ON retailer_change_requests(farmer_id, status, created_at DESC);
CREATE INDEX idx_change_status_created ON retailer_change_requests(status, created_at DESC);

-- ========== APP_CONTENT INDEXES ==========
CREATE INDEX idx_content_category_order ON app_content(category, display_order);
CREATE INDEX idx_content_key ON app_content(content_key);

-- ========== SYSTEM_LOGS INDEXES ==========
CREATE INDEX idx_syslog_level_time ON system_logs(level, timestamp DESC);
```

---

## Notes

1. **Composite Index Order Matters**: Columns are ordered by:
   - Equality conditions first (WHERE = ?)
   - Range conditions second (WHERE BETWEEN, >, <)
   - ORDER BY columns last

2. **Avoid Over-indexing**: Monitor query performance after implementation. Remove underutilized indexes.

3. **Maintenance**: Monitor index fragmentation. Rebuild/optimize regularly:
   ```sql
   OPTIMIZE TABLE table_name;
   ANALYZE TABLE table_name;
   ```

4. **Storage Cost**: Each index consumes disk space. Monitor database size growth.

5. **Write Performance**: Too many indexes can slow down INSERT/UPDATE/DELETE operations.

---

## Verification Commands

After creating indexes, verify they exist:
```sql
-- Check indexes on product_bookings
SHOW INDEX FROM product_bookings;

-- Check all indexes on a table
SHOW INDEXES FROM app_logs;

-- Get index sizes
SELECT OBJECT_SCHEMA, OBJECT_NAME, COUNT_READ, COUNT_WRITE, COUNT_FETCH, COUNT_INSERT, COUNT_UPDATE, COUNT_DELETE 
FROM performance_schema.table_io_waits_summary_by_index_usage 
WHERE OBJECT_SCHEMA != 'mysql' 
ORDER BY COUNT_READ DESC;
```

---

**Generated Analysis Date:** 2026-03-06  
**Database:** sfms_app  
**Total Indexes Recommended:** 20 Composite Indexes
