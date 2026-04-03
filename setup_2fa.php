<?php
// setup_2fa.php
// Setup tool for creating the 2FA secret and generating the QR code.
// DELETING this file after a successful setup is MANDATORY.

require_once 'lib/GoogleAuthenticator.php';
$ga = new GoogleAuthenticator();

$secret = $ga->createSecret();
$qrCodeUrl = $ga->getQRCodeGoogleUrl('Pristine Clinical Dashboard', $secret, 'Pristine Aesthetics');

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Setup - Pristine Clinical Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-6">
    <div class="bg-white rounded-[2.5rem] shadow-2xl p-12 max-w-lg w-full text-center border border-slate-100">
        <h2 class="text-3xl font-black text-slate-800 mb-6">Setup Clinical 2FA</h2>
        <p class="text-sm text-slate-500 mb-10 leading-relaxed px-4">
            Scan the QR code below using your Google Authenticator app. You must link this secret to your device to access the clinical data portal.
        </p>

        <div class="flex justify-center mb-10">
            <img src="<?php echo $qrCodeUrl; ?>" alt="QR Code" class="rounded-3xl shadow-lg p-2 border border-slate-50 bg-white">
        </div>

        <div class="bg-slate-100 p-5 rounded-2xl mb-10 overflow-x-auto">
            <p class="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest text-left">Manual Secret</p>
            <p class="font-mono text-lg font-black text-slate-700 tracking-tighter text-left"><?php echo $secret; ?></p>
        </div>

        <div class="bg-red-50 border border-red-100 p-6 rounded-3xl text-left mb-10">
            <p class="text-xs font-bold text-red-700 leading-relaxed">
                Step 1: Copy this secret into your config.php file.<br>
                Step 2: Delete this setup_2fa.php file immediately afterwards.<br>
                Step 3: This secret is the only key to your data.
            </p>
        </div>

        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Critical Security Warning: This page is for INITIAL setup only.
        </p>
    </div>
</body>
</html>
