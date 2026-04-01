<?php
/**
 * api.php – Secure JSON file persistence API for Invoice Generator
 */

define('DEBUG_MODE', true);
define('DATA_DIR',   __DIR__ . '/data/');
define('AUTH_FILE',  DATA_DIR . 'auth.json');
define('DEFAULT_PW', 'pristine123');

const ALLOWED_TYPES = ['surgeries', 'invoices', 'logs', 'draft', 'auth'];

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

// ── Protected Routes ──────────────────────────────────────────────────────
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
    if (!file_exists($file)) {
        echo '[]';
        exit;
    }
    echo file_get_contents($file);
    exit;
}

function handlePost(string $file): void {
    $body = file_get_contents('php://input');
    if (!$body) jsonError(400, 'Empty content.');
    if (json_decode($body) === null) jsonError(400, 'Invalid JSON.');

    $written = file_put_contents($file, $body, LOCK_EX);
    if ($written === false) jsonError(500, 'Write failed.');
    echo json_encode(['ok' => true]);
    exit;
}

function ensureDataDir(): void {
    if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);
}
