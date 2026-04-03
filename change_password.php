<?php
/**
 * change_password.php
 * Secure tool to generate new password hashes for config.php.
 * Login session is required.
 */
require_once 'security.php';

$message = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $new = $_POST['new_password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';
    
    if ($new === $confirm && strlen($new) >= 8) {
        $hash = password_hash($new, PASSWORD_DEFAULT);
        $message = "Your new secure password hash (copy this into config.php):<br><br><span class='font-mono bg-slate-900 border border-brand-500 rounded p-4 block text-brand-500 text-[10px] break-all'>" . $hash . "</span>";
    } else {
        $error = "Passwords must match and be at least 8 characters.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Change Password - Clinical Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-6 font-inter tracking-tight">
    <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-12 text-center border border-slate-100 flex flex-col items-center">
        <h2 class="text-3xl font-black text-slate-800 mb-2">Security Hub</h2>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">Pristine Aesthetics – Password Update</p>

        <?php if ($message): ?>
            <div class="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl text-left mb-8 w-full">
                <p class="text-xs font-bold text-indigo-700 leading-relaxed"><?php echo $message; ?></p>
            </div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="bg-red-50 border border-red-100 p-5 rounded-3xl text-left mb-8 w-full">
                <p class="text-xs font-bold text-red-700 leading-relaxed uppercase tracking-widest">⚠️ <?php echo $error; ?></p>
            </div>
        <?php endif; ?>

        <form action="change_password.php" method="POST" class="w-full space-y-6">
            <div class="text-left w-full">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">New Clinical Password</label>
                <input type="password" name="new_password" required class="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl px-6 text-sm font-black focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" placeholder="••••••••" />
            </div>

            <div class="text-left w-full">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 px-1">Confirm Password</label>
                <input type="password" name="confirm_password" required class="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl px-6 text-sm font-black focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" placeholder="••••••••" />
            </div>

            <button type="submit" class="w-full h-16 bg-slate-800 hover:bg-black text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all mb-4">Generate Hash</button>
            <a href="index.html" class="text-[9px] font-black uppercase text-slate-400 hover:text-slate-800 transition-all tracking-widest">Back to Dashboard</a>
        </form>
    </div>
</body>
</html>
