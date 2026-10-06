#!/bin/bash
# ============================================================================
# SETUP SCRIPT - High Concurrency Optimization
# Installs and configures all necessary components
# 
# Run: bash /var/www/html/backend/setup_high_concurrency.sh
# ============================================================================

set -e  # Exit on any error

echo "========================================================"
echo "SFMS High Concurrency Setup"
echo "========================================================"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# ============================================================================
# STEP 1: Install Redis
# ============================================================================

echo "[1/5] Installing Redis..."
apt-get update
apt-get install -y redis-server

# Start Redis
systemctl start redis-server
systemctl enable redis-server

echo "✅ Redis installed and started"
echo ""

# ============================================================================
# STEP 2: Optimize MySQL Configuration
# ============================================================================

echo "[2/5] Backing up and updating MySQL configuration..."

# Backup current config
cp /etc/mysql/mysql.conf.d/mysqld.cnf /etc/mysql/mysql.conf.d/mysqld.cnf.backup.$(date +%s)

# Copy optimized config (append critical values)
echo "" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "# === High Concurrency Optimizations (Added $(date)) ===" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "max_connections = 1000" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "innodb_buffer_pool_size = 24G" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "innodb_log_file_size = 512M" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "innodb_flush_log_at_trx_commit = 2" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "innodb_flush_method = O_DIRECT" >> /etc/mysql/mysql.conf.d/mysqld.cnf

# Validate config
mysqld --validate-config > /dev/null 2>&1 && echo "✅ MySQL config valid" || echo "⚠️ MySQL config validation failed"

# Restart MySQL
systemctl restart mysql
echo "✅ MySQL restarted with optimizations"
echo ""

# ============================================================================
# STEP 3: Install Supervisor (for batch log processor)
# ============================================================================

echo "[3/5] Installing Supervisor..."

apt-get install -y supervisor

# Create supervisor config for log processor
cat > /etc/supervisor/conf.d/app_logs_processor.conf << 'EOF'
[program:app_logs_processor]
command=/usr/bin/php /var/www/html/backend/process_logs_batch.php
user=www-data
autostart=true
autorestart=true
numprocs=4
process_name=%(program_name)s_%(process_num)02d
stdout_logfile=/var/log/supervisor/%(program_name)s_%(process_num)02d.log
stdout_logfile_maxbytes=100MB
stdout_logfile_backups=5
stderr_logfile=/var/log/supervisor/%(program_name)s_%(process_num)02d_err.log
stderr_logfile_maxbytes=100MB
stderr_logfile_backups=5
startsecs=10
stopwaitsecs=10
priority=999
EOF

# Update supervisor
supervisorctl reread
supervisorctl update
supervisorctl start app_logs_processor:*

echo "✅ Supervisor installed with log processor workers"
echo ""

# ============================================================================
# STEP 4: Optimize System Limits
# ============================================================================

echo "[4/5] Optimizing system limits..."

# Add to limits for high file descriptors
echo "redis soft nofile 65536" >> /etc/security/limits.conf
echo "redis hard nofile 65536" >> /etc/security/limits.conf
echo "www-data soft nofile 65536" >> /etc/security/limits.conf
echo "www-data hard nofile 65536" >> /etc/security/limits.conf

# Sysctl optimizations
echo "net.core.somaxconn = 2048" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 2048" >> /etc/sysctl.conf
echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf

sysctl -p > /dev/null 2>&1

echo "✅ System limits optimized"
echo ""

# ============================================================================
# STEP 5: Create Log Directories
# ============================================================================

echo "[5/5] Creating log directories..."

mkdir -p /var/log/app
mkdir -p /var/log/supervisor
touch /var/log/app_logs_processor.log
chown www-data:www-data /var/log/app
chown www-data:www-data /var/log/app_logs_processor.log

echo "✅ Log directories created"
echo ""

# ============================================================================
# VERIFICATION
# ============================================================================

echo "========================================================"
echo "SETUP COMPLETE - VERIFICATION"
echo "========================================================"
echo ""

# Check Redis
echo "🔍 Redis status:"
systemctl status redis-server | grep Active

# Check MySQL
echo ""
echo "🔍 MySQL status:"
systemctl status mysql | grep Active

# Check Supervisor
echo ""
echo "🔍 Supervisor log processors:"
supervisorctl status | grep app_logs

# Check system limits
echo ""
echo "🔍 System limits:"
sysctl net.core.somaxconn net.ipv4.tcp_max_syn_backlog

# ============================================================================
# DEPLOYMENT STEPS
# ============================================================================

echo ""
echo "========================================================"
echo "NEXT STEPS"
echo "========================================================"
echo ""
echo "1. Deploy optimized PHP files:"
echo "   - Copy app_logger_async.php to your API"
echo "   - Copy book_slot_optimized.php to your API"
echo ""
echo "2. Test Redis connectivity:"
echo "   - redis-cli ping"
echo ""
echo "3. Monitor log queue processing:"
echo "   - redis-cli LLEN app_logs:queue"
echo "   - tail -f /var/log/supervisor/app_logs_processor_*.log"
echo ""
echo "4. Run load test:"
echo "   - See load_test.php"
echo ""
echo "5. Monitor performance:"
echo "   - mysql -e 'SHOW PROCESSLIST;'"
echo "   - mysqladmin status"
echo "   - systemctl status mysql"
echo ""
echo "========================================================"
echo ""
