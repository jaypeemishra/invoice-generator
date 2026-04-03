<?php
// Configuration for 2FA protection
// Replace 'PASSWORD_HERE' with your hashed password and 'SECRET_HERE' after running setup_2fa.php
return [
    'hashed_password' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Default: 'password' (change this!)
    'google_2fa_secret' => '', // To be filled by setup_2fa.php or manual entry
];
