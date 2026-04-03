<?php
/**
 * bank-parse.php
 * Dedicated Tide CSV parser — returns structured financial intelligence JSON.
 * Handles UTF-8 BOM, quoted fields, semicolons, and Tide-specific column names.
 */

define('DATA_DIR',  __DIR__ . '/data/');
define('BANK_DIR',  DATA_DIR . 'bank/');
define('AUTH_FILE', DATA_DIR . 'auth.json');
define('DEFAULT_PW','pristine123');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Auth ─────────────────────────────────────────────────────────────────────
function isAuthorized(): bool {
    $provided = $_SERVER['HTTP_X_AUTH'] ?? '';
    if (!$provided) return false;
    if (!file_exists(AUTH_FILE)) {
        file_put_contents(AUTH_FILE, json_encode(['hash' => password_hash(DEFAULT_PW, PASSWORD_DEFAULT)]));
    }
    $auth = json_decode(file_get_contents(AUTH_FILE), true);
    return password_verify($provided, $auth['hash'] ?? '');
}

function jsonError(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if (!isAuthorized()) jsonError(401, 'Unauthorized.');

// ── List or Parse ─────────────────────────────────────────────────────────────
$name = trim($_GET['name'] ?? '');

if (!$name) {
    // Return list of CSV files in bank dir
    if (!is_dir(BANK_DIR)) { echo json_encode([]); exit; }
    $files = array_values(array_filter(scandir(BANK_DIR), fn($f) =>
        preg_match('/\.(csv|xlsx?)$/i', $f)
    ));
    echo json_encode($files);
    exit;
}

// ── Parse specific file ───────────────────────────────────────────────────────
$name = basename($name); // security: strip path traversal
$path = BANK_DIR . $name;
if (!file_exists($path)) jsonError(404, 'File not found.');

$content = file_get_contents($path);
$content = preg_replace('/^\xEF\xBB\xBF/', '', $content); // strip UTF-8 BOM
$lines   = preg_split('/\r?\n/', trim($content));

if (count($lines) < 2) jsonError(400, 'Empty or single-row file.');

// Detect delimiter
$delimiter = str_contains($lines[0], ';') ? ';' : ',';

// Parse headers — strip surrounding quotes and whitespace
$rawHeaders = str_getcsv($lines[0], $delimiter);
$headers    = array_map(fn($h) => strtolower(trim($h, " \t\r\n\"\'")), $rawHeaders);

// Build column index map
function colIdx(array $headers, array $terms): int {
    foreach ($terms as $t) {
        $idx = array_search($t, $headers);
        if ($idx !== false) return $idx;
    }
    // Partial match fallback
    foreach ($terms as $t) {
        foreach ($headers as $i => $h) {
            if (str_contains($h, $t)) return $i;
        }
    }
    return -1;
}

$iDate  = colIdx($headers, ['date']);
$iDesc  = colIdx($headers, ['transaction description','description','details','narrative','particulars']);
$iIn    = colIdx($headers, ['paid in','credit','deposit','received','money in']);
$iOut   = colIdx($headers, ['paid out','debit','payment','withdrawn','money out']);
$iCat   = colIdx($headers, ['category name','category','transaction type','type']);
$iFrom  = colIdx($headers, ['from']);
$iTo    = colIdx($headers, ['to']);
$iStatus= colIdx($headers, ['status', 'state', 'transaction status']);

// Multi-bucket engine for 'All Time' + Financial Years
$buckets = [
    'All Time' => ['totalIn' => 0.0, 'totalOut' => 0.0, 'categories' => [], 'monthly' => [], 'transactions' => []]
];

$getFYBucket = function($dateStr) {
    if (!$dateStr) return null;
    $ts = strtotime($dateStr);
    if (!$ts) return null;
    $m = (int) date('n', $ts);
    $y = (int) date('Y', $ts);
    $fy = ($m >= 4) ? $y : $y - 1;
    $next = substr($fy + 1, -2);
    return "FY $fy/$next";
};

for ($i = 1; $i < count($lines); $i++) {
    $line = trim($lines[$i]);
    if (!$line) continue;

    $cols = str_getcsv($line, $delimiter);
    while (count($cols) < count($headers)) $cols[] = '';

    $iAmt   = colIdx($headers, ['amount', 'value', 'transaction amount']);
    $getCol = fn(int $idx) => $idx >= 0 ? trim($cols[$idx] ?? '', " \t\r\n\"'") : '';

    if ($iStatus >= 0) {
        $status = strtolower($getCol($iStatus));
        if ($status !== '' && !in_array($status, ['cleared', 'completed', 'successful'])) continue;
    }

    $cleanNum = function($str) {
        $str = preg_replace('/[^\d\.\-]/', '', $str);
        return $str === '' ? 0.0 : (float) $str;
    };

    if ($iAmt >= 0 && $iIn === -1 && $iOut === -1) {
        $amt = $cleanNum($getCol($iAmt));
        $amtIn  = $amt > 0 ? $amt : 0;
        $amtOut = $amt < 0 ? abs($amt) : 0;
    } else {
        $amtIn  = $cleanNum($getCol($iIn));
        $amtOut = $cleanNum($getCol($iOut));
    }
    
    $rawDate = $getCol($iDate);
    $date = '';
    if ($rawDate) {
        $ts = strtotime($rawDate);
        $date = $ts ? date('Y-m-d', $ts) : substr($rawDate, 0, 10);
    }
    $month    = substr($date, 0, 7); 
    $desc     = $getCol($iDesc) ?: ($getCol($iFrom) ?: $getCol($iTo));
    $category = $getCol($iCat) ?: 'Other';

    $txObj = [
        'date'        => $date,
        'description' => $desc,
        'paidIn'      => $amtIn,
        'paidOut'     => $amtOut,
        'category'    => $category,
        'isIncome'    => $amtIn  > 0,
        'isExpense'   => $amtOut > 0,
    ];

    $distKeys = ['All Time'];
    $fyKey = $getFYBucket($date);
    if ($fyKey) $distKeys[] = $fyKey;

    foreach ($distKeys as $k) {
        if (!isset($buckets[$k])) {
            $buckets[$k] = ['totalIn' => 0.0, 'totalOut' => 0.0, 'categories' => [], 'monthly' => [], 'transactions' => []];
        }
        $buckets[$k]['totalIn']  += $amtIn;
        $buckets[$k]['totalOut'] += $amtOut;
        
        if ($amtOut > 0) {
            $buckets[$k]['categories'][$category] = ($buckets[$k]['categories'][$category] ?? 0.0) + $amtOut;
        }

        if ($month) {
            if (!isset($buckets[$k]['monthly'][$month])) {
                $buckets[$k]['monthly'][$month] = ['in' => 0.0, 'out' => 0.0, 'cats' => []];
            }
            $buckets[$k]['monthly'][$month]['in']  += $amtIn;
            $buckets[$k]['monthly'][$month]['out'] += $amtOut;
            if ($amtOut > 0) {
                $buckets[$k]['monthly'][$month]['cats'][$category] = ($buckets[$k]['monthly'][$month]['cats'][$category] ?? 0.0) + $amtOut;
            }
        }
        $buckets[$k]['transactions'][] = $txObj;
    }
}

// Finalize buckets
$finalBuckets = [];
foreach ($buckets as $k => $b) {
    arsort($b['categories']);
    $topCatNames = array_slice(array_keys($b['categories']), 0, 4);

    ksort($b['monthly']);
    $monthlyArr = [];
    foreach ($b['monthly'] as $m => $vals) {
        $catBreakdown = [];
        $otherTotal = 0.0;
        foreach ($vals['cats'] as $cName => $cTotal) {
            if (in_array($cName, $topCatNames)) {
                $catBreakdown[$cName] = round($cTotal, 2);
            } else {
                $otherTotal += $cTotal;
            }
        }
        foreach ($topCatNames as $tc) {
            if (!isset($catBreakdown[$tc])) $catBreakdown[$tc] = 0;
        }
        $catBreakdown['Other'] = round($otherTotal, 2);

        $monthlyArr[] = [
            'month' => $m, 
            'in'    => round($vals['in'], 2), 
            'out'   => round($vals['out'], 2),
            'cats'  => $catBreakdown
        ];
    }

    $categoriesArr = [];
    foreach ($b['categories'] as $cat => $total) {
        $categoriesArr[] = ['name' => $cat, 'total' => round($total, 2)];
    }

    $finalBuckets[$k] = [
        'summary' => [
            'totalIn'      => round($b['totalIn'],  2),
            'totalOut'     => round($b['totalOut'], 2),
            'net'          => round($b['totalIn'] - $b['totalOut'], 2),
            'txCount'      => count($b['transactions']),
            'expenseRatio' => $b['totalIn'] > 0 ? round($b['totalOut'] / $b['totalIn'], 4) : 0,
        ],
        'categories'   => $categoriesArr,
        'monthly'      => $monthlyArr,
        'transactions' => $b['transactions']
    ];
}

echo json_encode($finalBuckets, JSON_UNESCAPED_UNICODE);
