<?php
/**
 * api.php – Secure JSON file persistence API for Invoice Generator
 */

define('DEBUG_MODE', true);
define('DATA_DIR',   __DIR__ . '/data/');
define('AUTH_FILE',  DATA_DIR . 'auth.json');
define('PDF_DIR',    DATA_DIR . 'pdfs/');
define('DEFAULT_PW', 'pristine123');

define('BANK_DIR',   DATA_DIR . 'bank/');
const ALLOWED_TYPES = ['surgeries', 'invoices', 'logs', 'draft', 'auth', 'upload-pdf', 'config', 'audit', 'archive', 'bank'];

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Authentication logic ───────────────────────────────────────────────────
ensureDataDir();

/** Verifies if the request is authorized. */
function isAuthorized(): bool {
    // Get provided password as a token
    $provided = $_SERVER['HTTP_X_AUTH'] ?? '';
    if (!$provided) return false;

    // Load or create default auth
    if (!file_exists(AUTH_FILE)) {
        $hash = password_hash(DEFAULT_PW, PASSWORD_DEFAULT);
        file_put_contents(AUTH_FILE, json_encode(['hash' => $hash]));
    }

    $authData = json_decode(file_get_contents(AUTH_FILE), true);
    return password_verify($provided, $authData['hash'] ?? '');
}

/** Output a JSON error response and exit. */
function jsonError(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// ── Special Route: Login ──────────────────────────────────────────────────
if (($_GET['type'] ?? '') === 'login') {
    if (isAuthorized()) {
        echo json_encode(['ok' => true]);
    } else {
        jsonError(401, 'Invalid password.');
    }
    exit;
}

// ── Special Route: PDF Upload ─────────────────────────────────────────────
if (($_GET['type'] ?? '') === 'upload-pdf' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isAuthorized()) jsonError(401, 'Unauthorized.');
    if (!is_dir(PDF_DIR)) mkdir(PDF_DIR, 0755, true);
    
    $name = $_GET['name'] ?? 'invoice.pdf';
    $name = str_replace(['/', '\\'], '', $name); // Basic sanitize
    
    $body = file_get_contents('php://input');
    if (!$body) jsonError(400, 'Empty content.');
    
    file_put_contents(PDF_DIR . $name, $body);
    echo json_encode(['ok' => true, 'url' => 'data/pdfs/' . $name]);
    exit;
}

// ── Special Route: Change Password ────────────────────────────────────────
if (($_GET['type'] ?? '') === 'change-password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // First verify current password (which should be in X-Auth)
    if (!isAuthorized()) jsonError(401, 'Unauthorized.');
    
    $body = json_decode(file_get_contents('php://input'), true);
    $newPw = $body['newPassword'] ?? '';
    if (strlen($newPw) < 4) jsonError(400, 'Password too short.');
    
    $hash = password_hash($newPw, PASSWORD_DEFAULT);
    file_put_contents(AUTH_FILE, json_encode(['hash' => $hash]));
    echo json_encode(['ok' => true]);
    exit;
}



// ── Special Route: Bank Records ───────────────────────────────────────────
if (($_GET['type'] ?? '') === 'bank') {
    if (!isAuthorized()) jsonError(401, 'Unauthorized.');
    if (!is_dir(BANK_DIR)) mkdir(BANK_DIR, 0755, true);

    $name = $_GET['name'] ?? '';
    if (!$name) {
        // List CSVS files
        $files = array_values(array_filter(scandir(BANK_DIR), function($f) {
            return str_ends_with(strtolower($f), '.csv');
        }));
        echo json_encode($files);
        exit;
    }

    // Read and interpret CSV with robust delimiter detection
    $name = str_replace(['/', '\\'], '', $name);
    $path = BANK_DIR . $name;
    if (!file_exists($path)) jsonError(404, 'File not found.');

    $rows = [];
    $content = file_get_contents($path);
    // Strip UTF-8 BOM if present
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
    $lines = explode("\n", $content);
    if (count($lines) < 2) jsonError(400, 'Empty file.');

    // Detect delimiter
    $firstLine = $lines[0];
    $delimiter = str_contains($firstLine, ';') ? ';' : ',';

    $headers = str_getcsv($lines[0], $delimiter);
    $headers = array_map('trim', $headers);

    for ($i = 1; $i < count($lines); $i++) {
        $line = trim($lines[$i]);
        if (!$line) continue;
        $data = str_getcsv($line, $delimiter);
        if (count($headers) === count($data)) {
            $row = array_combine($headers, array_map('trim', $data));
            $rows[] = $row;
        }
    }
    echo json_encode($rows);
    exit;
}
if (!isAuthorized()) {
    jsonError(401, 'Authentication required.');
}

$type   = $_GET['type'] ?? '';
if (!in_array($type, ALLOWED_TYPES, true)) {
    jsonError(400, 'Invalid type.');
}

$method = $_SERVER['REQUEST_METHOD'];
$file   = DATA_DIR . $type . '.json';

if ($method === 'GET') {
    handleGet($file);
} elseif ($method === 'POST') {
    handlePost($file);
} else {
    jsonError(405, 'Method not allowed.');
}

// ── Handlers ───────────────────────────────────────────────────────────────

function handleGet(string $file): void {
    $type = $_GET['type'] ?? '';
    if (!file_exists($file)) {
        // Return {} for single-object types like config, [] for others
        $singleTypes = ['config', 'auth'];
        echo in_array($type, $singleTypes, true) ? '{}' : '[]';
        exit;
    }
    echo file_get_contents($file);
    exit;
}

function handlePost(string $file): void {
    $body = file_get_contents('php://input');
    if ($body === null || $body === '') jsonError(400, 'Empty content.');
    
    // Check for valid JSON (null is a valid JSON value)
    $decoded = json_decode($body);
    if ($decoded === null && trim($body) !== 'null') jsonError(400, 'Invalid JSON.');

    $written = file_put_contents($file, $body, LOCK_EX);
    if ($written === false) jsonError(500, 'Write failed.');
    echo json_encode(['ok' => true]);
    exit;
}

function ensureDataDir(): void {
    if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);
}
