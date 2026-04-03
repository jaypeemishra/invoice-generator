<?php
// security.php
// Protective wrapper to ensure every API call is session-authenticated via 2FA
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['2fa_passed']) || $_SESSION['2fa_passed'] !== true) {
    header('Content-Type: application/json', true, 403);
    echo json_encode([
        'status' => 'error',
        'message' => '403 Forbidden - 2FA authentication required.'
    ]);
    exit;
}
