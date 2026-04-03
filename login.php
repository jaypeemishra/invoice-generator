<?php
// login.php
// Standardizes the 2FA login procedure.
// Verifies your password and Google Authenticator OTP to secure clinical access.
session_start();

require_once 'config.php';
require_once 'lib/GoogleAuthenticator.php';

$error = null;
$config = include 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    $otp = $_POST['otp'] ?? '';
    
    // Check password
    if (password_verify($password, $config['hashed_password'])) {
        $ga = new GoogleAuthenticator();
        if ($ga->verifyCode($config['google_2fa_secret'], $otp, 2)) {
            // SUCCESS!
            $_SESSION['2fa_passed'] = true;
            header('Location: index.html');
            exit;
        } else {
            $error = "Invalid 2FA Authenticator Code.";
        }
    } else {
        $error = "Incorrect Login Password.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clinical Login - Pristine Clinical Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { inter: ['Inter', 'sans-serif'] },
                    colors: {
                        brand: {
                            50:  '#f0f7f7',
                            100: '#e1efef',
                            500: '#D9A5A0',
                            600: '#024544',
                            700: '#023433',
                            900: '#011e1d',
                        }
                    }
                }
            }
        };
    </script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-6 font-inter tracking-tight">
    <div class="bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] w-full max-w-lg p-12 text-center border border-slate-100 flex flex-col items-center">
        
        <div class="w-16 h-16 bg-brand-700 rounded-2xl flex items-center justify-center text-white text-2xl mb-8 shadow-xl">🔐</div>
        
        <h2 class="text-3xl font-black text-brand-900 mb-2">Clinical Portal</h2>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">Pristine Aesthetics – Secure Access Required</p>

        <?php if ($error): ?>
            <div class="w-full bg-red-50 border border-red-100 text-red-700 text-xs font-black p-5 rounded-3xl mb-8 px-8 leading-relaxed uppercase tracking-widest flex items-center gap-3">
                <span class="text-xl">⚠️</span>
                <span><?php echo $error; ?></span>
            </div>
        <?php endif; ?>

        <form action="login.php" method="POST" class="w-full space-y-6">
            <div class="text-left w-full">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">Login Password</label>
                <input type="password" name="password" required class="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl px-6 text-sm font-black focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" placeholder="••••••••" />
            </div>

            <div class="text-left w-full">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">2FA OTP Code</label>
                <input type="text" name="otp" required maxlength="6" inputmode="numeric" class="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl px-6 text-2xl font-black tracking-[0.4em] focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none text-center" placeholder="000 000" />
            </div>

            <button type="submit" class="w-full h-16 bg-brand-700 hover:bg-brand-900 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all transform active:scale-95 mt-4 hover:shadow-brand-700/20">Verify & Access</button>
        </form>

        <p class="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-12 px-6 leading-relaxed">
            Clinical identification required under the Data Protection Act to view practitioner financial records.
        </p>
    </div>
</body>
</html>
