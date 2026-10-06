#!/bin/bash
# ============================================================================
# REDIS SETUP & CONFIGURATION
# For high-concurrency log queueing and caching
#
# Installation on Ubuntu/Debian:
# sudo apt-get install redis-server
#
# Configuration: /etc/redis/redis.conf
# ============================================================================

# ============================================================================
# REDIS CONFIGURATION (Add to /etc/redis/redis.conf)
# ============================================================================

# Bind to localhost and specific IP
bind 127.0.0.1 0.0.0.0
protected-mode yes
port 6379

# Accept connections only from localhost in production
# bind 127.0.0.1

# TCP backlog (max pending connections)
tcp-backlog 511

# Client timeout (close if idle for X seconds)
timeout 0

# TCP keepalive probe
tcp-keepalive 300

# === MEMORY ===
maxmemory 2gb                    # Max memory Redis can use
maxmemory-policy allkeys-lru     # LRU eviction: remove oldest when full

# === PERSISTENCE ===
# RDB snapshots (less reliable but faster)
save 900 1                       # Save if 1 key changed in 900s
save 300 10                      # Save if 10 keys changed in 300s
save 60 10000                    # Save if 10000 keys changed in 60s

# AOF (Append Only File - more reliable)
appendonly yes                   # Enable AOF
appendfilename "appendonly.aof"
appendfsync everysec            # Sync every second (balance)

# === NETWORK OPTIMIZATION ===
# Increase socket backlog for high concurrency
tcp-backlog 2048

# === MONITORING ===
loglevel notice
logfile "/var/log/redis/redis-server.log"

# ============================================================================
# STARTUP & MONITORING COMMANDS
# ============================================================================

# Start Redis service
# sudo systemctl start redis-server

# Enable on boot
# sudo systemctl enable redis-server

# Check if running
# sudo systemctl status redis-server

# View logs
# tail -f /var/log/redis/redis-server.log

# Connect to Redis CLI
# redis-cli

# ============================================================================
# REDIS CLI COMMANDS FOR MONITORING
# ============================================================================

# Check queue size:
# redis-cli LLEN app_logs:queue

# View first 10 items in queue:
# redis-cli LRANGE app_logs:queue 0 9

# Clear queue (be careful!):
# redis-cli DEL app_logs:queue

# Check memory usage:
# redis-cli INFO memory

# Check connected clients:
# redis-cli INFO clients

# Flush all data (WARNING: destructive):
# redis-cli FLUSHALL

# Monitor all commands in real time:
# redis-cli MONITOR

# Stats snapshot:
# redis-cli INFO stats

# ============================================================================
# PHP Code to Connect to Redis
# ============================================================================

# In your PHP files, use:
#
# $redis = new Redis();
# $redis->connect('127.0.0.1', 6379, 1);  // 1 second timeout
# 
# // Push to queue
# $redis->lPush('app_logs:queue', json_encode($data));
#
# // Get queue length
# $length = $redis->lLen('app_logs:queue');
#
# // Pop from queue (blocking version)
# $redis->brPop('app_logs:queue', 5);  // 5 second timeout
#
# $redis->close();

# ============================================================================
# SYSTEM OPTIMIZATION FOR PRODUCTION
# ============================================================================

# Increase max file descriptors (for many connections)
# Add to /etc/security/limits.conf:
# redis soft nofile 65536
# redis hard nofile 65536

# Increase TCP backlog
# echo "net.core.somaxconn = 2048" | sudo tee -a /etc/sysctl.conf
# echo "net.ipv4.tcp_max_syn_backlog = 2048" | sudo tee -a /etc/sysctl.conf
# sudo sysctl -p

# Disable memory overcommit (safer)
# sudo sysctl vm.overcommit_memory=1

# ============================================================================
# REDIS BENCHMARK (For load testing)
# ============================================================================

# Benchmark SET operations (10K requests, 50 parallel clients)
# redis-benchmark -h 127.0.0.1 -p 6379 -c 50 -n 10000 -t set

# Benchmark LPUSH operations (queue test)
# redis-benchmark -h 127.0.0.1 -p 6379 -c 50 -n 10000 -t lpush

# Benchmark RPOP operations (consuming)
# redis-benchmark -h 127.0.0.1 -p 6379 -c 50 -n 10000 -t rpop

# Combined test
# redis-benchmark -h 127.0.0.1 -p 6379 -c 100 -n 100000

# ============================================================================
