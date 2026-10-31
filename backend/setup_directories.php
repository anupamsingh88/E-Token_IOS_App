<?php
/**
 * SFMS Directory Setup & Permission Utility
 * 
 * Run this script by visiting in your browser:
 * https://risingayodhya.com/Urvarak/backend/setup_directories.php
 */

header('Content-Type: text/html; charset=utf-8');

$directories = [
    // Uploads folders
    __DIR__ . '/uploads',
    __DIR__ . '/uploads/kisan_cards',
    __DIR__ . '/uploads/aadhaar_cards',
    __DIR__ . '/uploads/farmer_photos',
    __DIR__ . '/uploads/khatauni_photos',
    __DIR__ . '/uploads/temp_previews',
    __DIR__ . '/uploads/icons',
    __DIR__ . '/uploads/logos',

    // Assets folders
    __DIR__ . '/assets',
    __DIR__ . '/assets/upcdc',
    __DIR__ . '/assets/urvarak_setu',

    // Logs & cache
    __DIR__ . '/logs'
];

$results = [];

foreach ($directories as $dir) {
    $exists = file_exists($dir);
    $created = false;
    $writable = false;
    $error = null;

    if (!$exists) {
        // Try creating directory recursively
        try {
            if (@mkdir($dir, 0777, true)) {
                $created = true;
                $exists = true;
                @chmod($dir, 0777);
            } else {
                $lastErr = error_get_last();
                $error = $lastErr ? $lastErr['message'] : 'Failed to create directory';
            }
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    } else {
        // Try to ensure it has write permissions
        @chmod($dir, 0777);
    }

    if ($exists) {
        $writable = is_writable($dir);
        // Put an empty index.html for security if missing
        $indexFile = $dir . '/index.html';
        if (!file_exists($indexFile)) {
            @file_put_contents($indexFile, '<!DOCTYPE html><html><head><title>Access Denied</title></head><body>Directory access is forbidden.</body></html>');
        }
    }

    $relPath = str_replace(str_replace('\\', '/', __DIR__), '', str_replace('\\', '/', $dir));
    $relPath = ltrim($relPath, '/');

    $results[] = [
        'path' => $relPath ?: '.',
        'exists' => $exists,
        'created' => $created,
        'writable' => $writable,
        'error' => $error
    ];
}
?>
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Setup & Permissions Check</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
        .container { max-width: 750px; margin: 0 auto; background: #1e293b; border-radius: 14px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); border: 1px solid #334155; }
        h1 { margin-top: 0; color: #38bdf8; font-size: 22px; display: flex; align-items: center; gap: 10px; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { text-align: left; padding: 10px 14px; background: #0f172a; color: #cbd5e1; font-size: 12px; text-transform: uppercase; border-radius: 6px; }
        td { padding: 12px 14px; border-bottom: 1px solid #334155; font-size: 14px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #065f46; color: #6ee7b7; border: 1px solid #059669; }
        .badge-created { background: #1e3a8a; color: #93c5fd; border: 1px solid #3b82f6; }
        .badge-error { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
        .badge-warn { background: #78350f; color: #fcd34d; border: 1px solid #d97706; }
        .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; font-size: 13px; color: #64748b; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📁 Folder & Permissions Auto-Setup</h1>
        <p>Yeh script live server par saare zaroori folders (kisan cards, uploads, assets, aur unke sub-directories) ko auto-create karke full write permissions set karta hai.</p>

        <table>
            <thead>
                <tr>
                    <th>Folder Path</th>
                    <th>Status</th>
                    <th>Writable</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($results as $r): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($r['path']) ?></strong></td>
                        <td>
                            <?php if ($r['created']): ?>
                                <span class="badge badge-created">✨ Abhi Create Hua</span>
                            <?php elseif ($r['exists']): ?>
                                <span class="badge badge-success">✓ Maujood Hai</span>
                            <?php else: ?>
                                <span class="badge badge-error">✗ Failed: <?= htmlspecialchars($r['error'] ?: 'Error') ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($r['writable']): ?>
                                <span class="badge badge-success">✓ Yes (Writable)</span>
                            <?php else: ?>
                                <span class="badge badge-warn">⚠ Read-Only</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <div class="footer">
            Server User: <strong><?= @get_current_user() ?: 'PHP' ?></strong> | PHP Version: <strong><?= phpversion() ?></strong>
        </div>
    </div>
</body>
</html>

