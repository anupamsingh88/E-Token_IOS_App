<?php
/**
 * view_pdf.php - Universal Mobile-Optimized PDF Viewer
 * Renders uploaded PDFs cleanly inside WebViews and mobile browsers.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$fileParam = $_GET['file'] ?? '';
$fileParam = ltrim(str_replace(['\\', '..'], ['/', ''], $fileParam), '/');

// Security check: only allow files inside uploads/
if (empty($fileParam) || strpos($fileParam, 'uploads/') !== 0 || !preg_match('/\.pdf$/i', $fileParam)) {
    http_response_code(400);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;color:#dc2626;"><h2>अमान्य या अनुपलब्ध फ़ाइल</h2></body></html>';
    exit;
}

$fullPath = __DIR__ . '/' . $fileParam;

if (!file_exists($fullPath)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;color:#dc2626;"><h2>दस्तावेज़ नहीं मिला</h2><p>यह PDF फ़ाइल सर्वर पर मौजूद नहीं है।</p></body></html>';
    exit;
}

// If raw parameter requested, stream the raw PDF
if (isset($_GET['raw'])) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . basename($fullPath) . '"');
    header('Content-Length: ' . filesize($fullPath));
    readfile($fullPath);
    exit;
}

$pdfRawUrl = 'view_pdf.php?file=' . urlencode($fileParam) . '&raw=1';
$fileName = basename($fullPath);
?>
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
    <title><?= htmlspecialchars($fileName) ?></title>
    <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            margin: 0;
            padding: 0;
            background-color: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .toolbar {
            position: sticky;
            top: 0;
            z-index: 100;
            width: 100%;
            background: #1e293b;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .toolbar-title {
            font-size: 13px;
            font-weight: 700;
            color: #f1f5f9;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 60%;
        }
        .toolbar-btn {
            background: #0284c7;
            color: #ffffff;
            text-decoration: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        #container {
            width: 100%;
            max-width: 820px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .pdf-page-canvas {
            width: 100%;
            max-width: 800px;
            height: auto;
            margin-bottom: 16px;
            border-radius: 6px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            background: #ffffff;
        }
        .page-badge {
            background: rgba(255, 255, 255, 0.15);
            color: #cbd5e1;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
            margin-bottom: 6px;
        }
        #loading-indicator {
            margin-top: 40px;
            text-align: center;
            color: #94a3b8;
            font-size: 14px;
        }
        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 12px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fallback-box {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 30px 16px;
            max-width: 400px;
        }
        .fallback-box p {
            color: #94a3b8;
            font-size: 13px;
            margin: 10px 0 16px 0;
            line-height: 1.5;
        }
    </style>
    <!-- PDF.js from Cloudflare CDN with local fallback -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
    <div class="toolbar">
        <div class="toolbar-title"><?= htmlspecialchars($fileName) ?></div>
        <a class="toolbar-btn" href="<?= htmlspecialchars($pdfRawUrl) ?>" target="_blank" download>
            डाउनलोड / खोलें
        </a>
    </div>

    <div id="loading-indicator">
        <div class="spinner"></div>
        <div>PDF लोड हो रहा है...</div>
    </div>

    <div id="container"></div>

    <script>
        const pdfUrl = '<?= $pdfRawUrl ?>';

        if (typeof pdfjsLib === 'undefined') {
            // CDN unavailable (offline or sandboxed) - show clean fallback with direct PDF embed
            showFallback();
        } else {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            loadingTask.promise.then(function(pdf) {
                document.getElementById('loading-indicator').style.display = 'none';
                const container = document.getElementById('container');

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    (function(num) {
                        pdf.getPage(num).then(function(page) {
                            if (pdf.numPages > 1) {
                                const badge = document.createElement('div');
                                badge.className = 'page-badge';
                                badge.innerText = 'पेज ' + num + ' / ' + pdf.numPages;
                                container.appendChild(badge);
                            }

                            const scale = window.devicePixelRatio && window.devicePixelRatio > 1 ? 2.0 : 1.5;
                            const viewport = page.getViewport({ scale: scale });
                            const canvas = document.createElement('canvas');
                            canvas.className = 'pdf-page-canvas';
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            container.appendChild(canvas);

                            const renderContext = {
                                canvasContext: canvas.getContext('2d'),
                                viewport: viewport
                            };
                            page.render(renderContext);
                        });
                    })(pageNum);
                }
            }).catch(function(err) {
                console.warn('PDF.js render error:', err);
                showFallback();
            });
        }

        function showFallback() {
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('container').innerHTML = `
                <div class="fallback-box">
                    <div style="font-size:42px;">📄</div>
                    <div style="font-size:16px;font-weight:bold;margin-top:8px;">PDF दस्तावेज़</div>
                    <p>इसे अपने डिवाइस के PDF रीडर (Google Drive / Adobe Reader) में सीधे खोलकर स्पष्ट रूप से देखें।</p>
                    <a class="toolbar-btn" style="padding:10px 18px;font-size:14px;" href="${pdfUrl}" target="_blank">
                        PDF रीडर में खोलें
                    </a>
                </div>
            `;
        }
    </script>
</body>
</html>

