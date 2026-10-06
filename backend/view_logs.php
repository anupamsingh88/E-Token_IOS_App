<?php
/**
 * App Log Viewer - Developer Dashboard
 * URL: /backend/view_logs.php
 * 
 * PRIVATE: Do not share this URL publicly!
 * Protected by password.
 */

// ==========================================
// PASSWORD PROTECTION - Change this!
// ==========================================
define('VIEWER_PASSWORD', 'sfms@admin2026');

session_start();

if (isset($_POST['password'])) {
    if ($_POST['password'] === VIEWER_PASSWORD) {
        $_SESSION['log_auth'] = true;
    } else {
        $loginError = 'Galat password!';
    }
}

if (!isset($_SESSION['log_auth'])) {
    // Show login form
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SFMS - Log Viewer Login</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: #1e293b; border-radius: 12px; padding: 40px; width: 360px; border: 1px solid #334155; }
            h2 { color: #38bdf8; margin-bottom: 8px; font-size: 22px; }
            p { color: #64748b; margin-bottom: 28px; font-size: 13px; }
            label { display: block; color: #94a3b8; font-size: 13px; margin-bottom: 6px; }
            input { width: 100%; padding: 12px 16px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 15px; outline: none; }
            input:focus { border-color: #38bdf8; }
            button { width: 100%; margin-top: 20px; padding: 13px; background: #38bdf8; color: #0f172a; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
            button:hover { background: #0ea5e9; }
            .error { color: #f87171; font-size: 13px; margin-top: 12px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>🔐 SFMS Log Viewer</h2>
            <p>Developer only. Unauthorized access prohibited.</p>
            <form method="POST">
                <label>Password</label>
                <input type="password" name="password" placeholder="Enter password" autofocus>
                <button type="submit">Login →</button>
                <?php if (isset($loginError)): ?>
                    <p class="error"><?= htmlspecialchars($loginError) ?></p>
                <?php endif; ?>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Logged in - show dashboard
require 'db_connect.php';

// Auto-create app_logs table if it doesn't exist yet
$conn->query("CREATE TABLE IF NOT EXISTS app_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    log_level   VARCHAR(10)  NOT NULL DEFAULT 'INFO',
    message     TEXT,
    api_url     VARCHAR(500),
    method      VARCHAR(10),
    request_body TEXT,
    status_code INT,
    response    TEXT,
    error_msg   TEXT,
    farmer_id   VARCHAR(50),
    retailer_id VARCHAR(50),
    device_info VARCHAR(300),
    app_version VARCHAR(20),
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level      (log_level),
    INDEX idx_farmer     (farmer_id),
    INDEX idx_retailer   (retailer_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Alter existing table to add retailer_id if it doesn't exist
$checkCol = $conn->query("SHOW COLUMNS FROM app_logs LIKE 'retailer_id'");
if ($checkCol && $checkCol->num_rows === 0) {
    $conn->query("ALTER TABLE app_logs ADD COLUMN retailer_id VARCHAR(50) AFTER farmer_id");
}

// Filters
$filter_level   = $_GET['level']   ?? 'ALL';
$filter_farmer  = $_GET['farmer']  ?? '';
$filter_retailer = $_GET['retailer'] ?? '';
$filter_date    = $_GET['date']    ?? '';
$filter_url     = $_GET['url']     ?? '';
$page           = max(1, (int)($_GET['page'] ?? 1));
$per_page       = 50;
$offset         = ($page - 1) * $per_page;

// Build WHERE clause
$where = ["1=1"];
$params = [];
$types  = '';

if ($filter_level !== 'ALL' && $filter_level !== '') {
    $where[] = "log_level = ?";
    $params[] = $filter_level;
    $types .= 's';
}
if ($filter_farmer !== '') {
    $where[] = "farmer_id LIKE ?";
    $params[] = "%$filter_farmer%";
    $types .= 's';
}
if ($filter_retailer !== '') {
    $where[] = "retailer_id LIKE ?";
    $params[] = "%$filter_retailer%";
    $types .= 's';
}
if ($filter_date !== '') {
    $where[] = "DATE(created_at) = ?";
    $params[] = $filter_date;
    $types .= 's';
}
if ($filter_url !== '') {
    $where[] = "api_url LIKE ?";
    $params[] = "%$filter_url%";
    $types .= 's';
}

$whereStr = implode(' AND ', $where);

// Count total
$countSql = "SELECT COUNT(*) as total FROM app_logs WHERE $whereStr";
$countStmt = $conn->prepare($countSql);
if ($types) $countStmt->bind_param($types, ...$params);
$countStmt->execute();
$totalRows = $countStmt->get_result()->fetch_assoc()['total'];
$totalPages = ceil($totalRows / $per_page);

// Fetch logs
$sql = "SELECT * FROM app_logs WHERE $whereStr ORDER BY created_at DESC LIMIT ? OFFSET ?";
$fetchParams = array_merge($params, [$per_page, $offset]);
$fetchTypes  = $types . 'ii';
$stmt = $conn->prepare($sql);
$stmt->bind_param($fetchTypes, ...$fetchParams);
$stmt->execute();
$logs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Stats
$statsRes = $conn->query("SELECT log_level, COUNT(*) as cnt FROM app_logs WHERE created_at >= NOW() - INTERVAL 24 HOUR GROUP BY log_level");
$stats = [];
while ($row = $statsRes->fetch_assoc()) {
    $stats[$row['log_level']] = $row['cnt'];
}

// Level badge colors
$levelColors = [
    'INFO'    => '#22c55e',
    'WARN'    => '#f59e0b',
    'ERROR'   => '#ef4444',
    'API_REQ' => '#38bdf8',
    'API_RES' => '#818cf8',
    'API_ERR' => '#f87171',
];

// Handle clear old logs
if (isset($_POST['clear_old'])) {
    $conn->query("TRUNCATE TABLE app_logs");
    header('Location: view_logs.php');
    exit;
}
if (isset($_POST['logout'])) {
    session_destroy();
    header('Location: view_logs.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SFMS - App Log Viewer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
        
        /* Header */
        .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .header h1 { font-size: 20px; color: #38bdf8; font-weight: 700; }
        .header span { font-size: 12px; color: #64748b; display: block; }
        .header-actions { display: flex; gap: 10px; }
        .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-danger { background: #991b1b; color: #fecaca; }
        .btn-danger:hover { background: #7f1d1d; }
        .btn-secondary { background: #334155; color: #94a3b8; }
        .btn-secondary:hover { background: #475569; }
        
        /* Stats */
        .stats-bar { background: #1e293b; border-bottom: 1px solid #334155; padding: 12px 24px; display: flex; gap: 20px; overflow-x: auto; }
        .stat-item { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .stat-dot { width: 10px; height: 10px; border-radius: 50%; }
        .stat-label { font-size: 12px; color: #64748b; }
        .stat-count { font-size: 13px; font-weight: 700; }
        
        /* Filters */
        .filters { background: #1e293b; border-bottom: 1px solid #334155; padding: 14px 24px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .filters label { font-size: 12px; color: #64748b; margin-right: 4px; }
        .filters select, .filters input { background: #0f172a; border: 1px solid #334155; color: #e2e8f0; padding: 7px 12px; border-radius: 6px; font-size: 13px; outline: none; }
        .filters select:focus, .filters input:focus { border-color: #38bdf8; }
        .btn-primary { background: #0284c7; color: white; padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; }
        .btn-primary:hover { background: #0369a1; }
        .result-count { margin-left: auto; font-size: 12px; color: #64748b; align-self: center; }
        
        /* Table */
        .table-wrap { overflow-x: auto; padding: 0 24px 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #1e293b; color: #94a3b8; padding: 10px 12px; text-align: left; border-bottom: 1px solid #334155; font-weight: 600; white-space: nowrap; position: sticky; top: 0; z-index: 10; }
        td { padding: 10px 12px; border-bottom: 1px solid #1e293b; vertical-align: top; max-width: 300px; word-break: break-all; }
        tr:hover td { background: #1e293b55; }
        tr.error-row td { background: #450a0a22; }
        
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .url-cell { color: #7dd3fc; font-family: monospace; font-size: 12px; }
        .url-cell small { color: #475569; font-size: 10px; display: block; margin-top: 2px; }
        .response-cell { font-family: monospace; font-size: 11px; color: #a5f3fc; max-height: 64px; overflow: hidden; cursor: pointer; }
        .response-cell.expanded { max-height: none; }
        .error-cell { color: #fca5a5; font-size: 12px; }
        .time-cell { color: #64748b; font-size: 11px; white-space: nowrap; }
        .farmer-cell { color: #86efac; font-weight: 600; font-size: 12px; }
        .status-200 { color: #22c55e; }
        .status-4xx,.status-5xx { color: #ef4444; }
        .status-3xx { color: #f59e0b; }
        
        /* Pagination */
        .pagination { display: flex; gap: 6px; justify-content: center; padding: 20px 24px; align-items: center; }
        .pagination a { padding: 7px 14px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; text-decoration: none; font-size: 13px; }
        .pagination a.active { background: #0284c7; border-color: #0284c7; color: white; }
        .pagination a:hover:not(.active) { background: #334155; }
        .pagination span { color: #475569; font-size: 13px; }
        
        .no-logs { text-align: center; padding: 60px; color: #475569; }
        .no-logs span { font-size: 40px; display: block; margin-bottom: 12px; }

        .expand-btn { font-size: 10px; color: #38bdf8; cursor: pointer; display: block; margin-top: 4px; }
    </style>
</head>
<body>

<div class="header">
    <div>
        <h1>📋 SFMS App Log Viewer</h1>
        <span>Developer Dashboard — Private & Confidential</span>
    </div>
    <div class="header-actions">
        <form method="POST" style="display:inline" onsubmit="return confirm('Saare logs delete ho jayenge. Pakka?')">
            <button class="btn btn-danger" name="clear_old">🗑 Clear Old Logs</button>
        </form>
        <form method="POST" style="display:inline">
            <button class="btn btn-secondary" name="logout">Logout</button>
        </form>
    </div>
</div>

<!-- Stats Bar (last 24 hours) -->
<div class="stats-bar">
    <strong style="color:#64748b;font-size:12px;align-self:center">Last 24h:</strong>
    <?php foreach ($levelColors as $lvl => $color): ?>
        <div class="stat-item">
            <div class="stat-dot" style="background:<?= $color ?>"></div>
            <span class="stat-label"><?= $lvl ?></span>
            <span class="stat-count" style="color:<?= $color ?>"><?= $stats[$lvl] ?? 0 ?></span>
        </div>
    <?php endforeach; ?>
</div>

<!-- Filters -->
<form method="GET">
<div class="filters">
    <div>
        <label>Level</label>
        <select name="level">
            <option value="ALL" <?= $filter_level === 'ALL' ? 'selected' : '' ?>>ALL</option>
            <?php foreach (array_keys($levelColors) as $lvl): ?>
                <option value="<?= $lvl ?>" <?= $filter_level === $lvl ? 'selected' : '' ?>><?= $lvl ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div>
        <label>Farmer ID</label>
        <input type="text" name="farmer" value="<?= htmlspecialchars($filter_farmer) ?>" placeholder="Farmer ID...">
    </div>
    <div>
        <label>Retailer ID</label>
        <input type="text" name="retailer" value="<?= htmlspecialchars($filter_retailer) ?>" placeholder="Retailer ID...">
    </div>
    <div>
        <label>Date</label>
        <input type="date" name="date" value="<?= htmlspecialchars($filter_date) ?>">
    </div>
    <div>
        <label>API URL contains</label>
        <input type="text" name="url" value="<?= htmlspecialchars($filter_url) ?>" placeholder="e.g. login_farmer">
    </div>
    <button type="submit" class="btn-primary">Filter</button>
    <a href="view_logs.php" style="font-size:13px;color:#64748b;align-self:center;text-decoration:none">Reset</a>
    <span class="result-count"><?= number_format($totalRows) ?> records found</span>
</div>
</form>

<div class="table-wrap">
<?php if (empty($logs)): ?>
    <div class="no-logs">
        <span>📭</span>
        Koi logs nahi mile. App use karo toh logs aayenge.
    </div>
<?php else: ?>
<table>
    <thead>
        <tr>
            <th>#</th>
            <th>Time</th>
            <th>Level</th>
            <th>Farmer</th>
            <th>Retailer</th>
            <th>Method</th>
            <th>API URL</th>
            <th>Status</th>
            <th>Response / Error</th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ($logs as $i => $log):
        $isError = in_array($log['log_level'], ['ERROR', 'API_ERR']);
        $statusClass = '';
        if ($log['status_code']) {
            if ($log['status_code'] >= 200 && $log['status_code'] < 300) $statusClass = 'status-200';
            elseif ($log['status_code'] >= 400) $statusClass = 'status-4xx';
            else $statusClass = 'status-3xx';
        }
        $color = $levelColors[$log['log_level']] ?? '#94a3b8';
        // Extract just the filename from URL
        $urlShort = $log['api_url'] ? basename(parse_url($log['api_url'], PHP_URL_PATH)) : '';
    ?>
    <tr class="<?= $isError ? 'error-row' : '' ?>">
        <td style="color:#475569"><?= $log['id'] ?></td>
        <td class="time-cell">
            <?= date('d M', strtotime($log['created_at'])) ?><br>
            <?= date('H:i:s', strtotime($log['created_at'])) ?>
        </td>
        <td><span class="badge" style="background:<?= $color ?>22;color:<?= $color ?>;border:1px solid <?= $color ?>44"><?= $log['log_level'] ?></span></td>
        <td class="farmer-cell"><?= htmlspecialchars($log['farmer_id'] ?? '-') ?></td>
        <td class="farmer-cell" style="color:#60a5fa"><?= htmlspecialchars($log['retailer_id'] ?? '-') ?></td>
        <td><span style="color:#a78bfa;font-weight:600;font-size:12px"><?= htmlspecialchars($log['method'] ?? '') ?></span></td>
        <td class="url-cell">
            <?= htmlspecialchars($urlShort) ?>
            <small><?= htmlspecialchars(substr($log['api_url'] ?? '', 0, 60)) ?></small>
        </td>
        <td class="<?= $statusClass ?>" style="font-weight:700"><?= $log['status_code'] ?: '-' ?></td>
        <td>
            <?php if ($log['error_msg']): ?>
                <div class="error-cell">⚠ <?= htmlspecialchars(substr($log['error_msg'], 0, 200)) ?></div>
            <?php elseif ($log['response']): ?>
                <div class="response-cell" id="resp-<?= $log['id'] ?>"><?= htmlspecialchars(substr($log['response'], 0, 150)) ?></div>
                <?php if (strlen($log['response']) > 150): ?>
                    <span class="expand-btn" onclick="toggleExpand(<?= $log['id'] ?>)">▼ Show more</span>
                <?php endif; ?>
                <div id="full-<?= $log['id'] ?>" style="display:none;font-family:monospace;font-size:11px;color:#a5f3fc;white-space:pre-wrap;max-width:400px"><?= htmlspecialchars($log['response']) ?></div>
            <?php else: ?>
                <span style="color:#475569">—</span>
            <?php endif; ?>
        </td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>

<!-- Pagination -->
<?php if ($totalPages > 1): ?>
<div class="pagination">
    <?php if ($page > 1): ?>
        <a href="?<?= http_build_query(array_merge($_GET, ['page' => $page - 1])) ?>">← Prev</a>
    <?php endif; ?>
    
    <?php
    $start = max(1, $page - 2);
    $end   = min($totalPages, $page + 2);
    for ($p = $start; $p <= $end; $p++):
    ?>
        <a href="?<?= http_build_query(array_merge($_GET, ['page' => $p])) ?>" class="<?= $p === $page ? 'active' : '' ?>"><?= $p ?></a>
    <?php endfor; ?>
    
    <?php if ($page < $totalPages): ?>
        <a href="?<?= http_build_query(array_merge($_GET, ['page' => $page + 1])) ?>">Next →</a>
    <?php endif; ?>
    <span>Page <?= $page ?> of <?= $totalPages ?></span>
</div>
<?php endif; ?>
<?php endif; ?>
</div>

<script>
function toggleExpand(id) {
    const full = document.getElementById('full-' + id);
    const short = document.getElementById('resp-' + id);
    if (full.style.display === 'none') {
        full.style.display = 'block';
        short.style.display = 'none';
    } else {
        full.style.display = 'none';
        short.style.display = 'block';
    }
}
</script>
</body>
</html>
