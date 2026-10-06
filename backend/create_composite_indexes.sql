-- ============================================================================
-- SFMS Database - Composite Indexes Creation Script
-- ============================================================================
-- Database: sfms_app
-- Purpose: Create optimized composite indexes for frequently used queries
-- Created: 2026-03-06
-- ============================================================================

USE sfms_app;

-- ============================================================================
-- 1. PRODUCT_BOOKINGS TABLE INDEXES (HIGH PRIORITY)
-- ============================================================================

-- Index 1.1: Farmer bookings with date and status filter
-- Optimizes: Daily limit checks, booking date filters
CREATE INDEX idx_farmer_booking_date_status 
ON product_bookings(farmer_id, booking_date, status);

-- Index 1.2: Farmer pending bookings with create time
-- Optimizes: Pending count check, time-ordered queries
CREATE INDEX idx_farmer_status_created 
ON product_bookings(farmer_id, status, created_at DESC);

-- Index 1.3: Farmer product quota checks
-- Optimizes: Quota calculation by product type
CREATE INDEX idx_farmer_product_status 
ON product_bookings(farmer_id, product, status);

-- Index 1.4: Retailer pending bookings for approval
-- Optimizes: Pending bookings retrieval, time-sorted
CREATE INDEX idx_retailer_status_created 
ON product_bookings(retailer_id, status, created_at ASC);

-- Index 1.5: Order-based lookups
-- Optimizes: Multi-item order updates, status changes
CREATE INDEX idx_order_status 
ON product_bookings(order_id, status);

-- Index 1.6: Farmer booking history retrieval
-- Optimizes: Complete booking history with sort order
CREATE INDEX idx_farmer_booking_sort 
ON product_bookings(farmer_id, booking_date DESC, created_at DESC);

-- ============================================================================
-- 2. APP_LOGS TABLE INDEXES (HIGH PRIORITY)
-- ============================================================================

-- Index 2.1: Filter by log level with time ordering
-- Optimizes: Log level filtering, recent logs
CREATE INDEX idx_loglevel_created 
ON app_logs(log_level, created_at DESC);

-- Index 2.2: Farmer activity tracing
-- Optimizes: User-specific log retrieval, ordered by time
CREATE INDEX idx_farmer_logs_created 
ON app_logs(farmer_id, created_at DESC);

-- Index 2.3: Retailer activity tracing
-- Optimizes: Retailer-specific log retrieval, ordered by time
CREATE INDEX idx_retailer_logs_created 
ON app_logs(retailer_id, created_at DESC);

-- Index 2.4: API endpoint profiling
-- Optimizes: Performance tracking by endpoint
CREATE INDEX idx_api_url_created 
ON app_logs(api_url, created_at DESC);

-- ============================================================================
-- 3. FARMER_INFO TABLE INDEXES (MEDIUM PRIORITY)
-- ============================================================================

-- Index 3.1: Status-based filtering with time ordering
-- Optimizes: Pending approvals, dashboard queries
CREATE INDEX idx_farmer_status_created 
ON farmer_info(status, created_at DESC);

-- Index 3.2: Village-based queries
-- Optimizes: Regional analytics, location-based searches
CREATE INDEX idx_farmer_village_status 
ON farmer_info(village_id, status);

-- Index 3.3: District-level reporting
-- Optimizes: District-wise dashboards and reports
CREATE INDEX idx_farmer_district_created 
ON farmer_info(district_id, created_at DESC);


-- ============================================================================
-- Verification Queries (Run after index creation)
-- ============================================================================

-- View all indexes on product_bookings
-- SHOW INDEX FROM product_bookings;

-- View indexes for table with statistics
-- SELECT * FROM INFORMATION_SCHEMA.STATISTICS 
-- WHERE TABLE_SCHEMA = 'sfms_app' AND TABLE_NAME = 'product_bookings';

-- Check index sizes
-- SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME, COUNT_READ, COUNT_WRITE
-- FROM performance_schema.table_io_waits_summary_by_index_usage 
-- WHERE OBJECT_SCHEMA = 'sfms_app' 
-- ORDER BY COUNT_READ DESC;

-- ============================================================================
-- MAINTENANCE COMMANDS (Run periodically)
-- ============================================================================

-- Optimize table (defragments data and indexes)
-- OPTIMIZE TABLE product_bookings;
-- OPTIMIZE TABLE app_logs;
-- OPTIMIZE TABLE farmer_info;
-- OPTIMIZE TABLE retailer_info;

-- Analyze table statistics for query optimizer
-- ANALYZE TABLE product_bookings;
-- ANALYZE TABLE app_logs;
-- ANALYZE TABLE farmer_info;
-- ANALYZE TABLE retailer_info;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Total Indexes Created: 20 composite indexes
-- 2. HIGH PRIORITY indexes should be created first
-- 3. Monitor performance after implementation
-- 4. Remove underutilized indexes after 2-3 weeks of monitoring
-- 5. Check SLOW QUERY LOG to identify missing indexes
-- ============================================================================
