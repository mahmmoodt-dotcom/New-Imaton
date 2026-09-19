<?php
/**
 * One-time setup: creates the first admin account on the production server.
 *
 * Visit https://yourdomain.com/create-admin.php once, set a real username
 * and password, then DELETE THIS FILE from the server.
 *
 * As a safety net it refuses to do anything once an admin already exists, so
 * it can never be used to add a second account or reset the password of an
 * account someone is actively relying on.
 */

declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

$existing = (int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();

header('Content-Type: text/html; charset=utf-8');

if ($existing > 0) {
    http_response_code(403);
    echo '<p style="font:16px system-ui;padding:2rem">An admin account already exists. '
       . 'Delete <code>create-admin.php</code> from the server.</p>';
    exit;
}

$error = '';
$done  = false;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if (strlen($username) < 3) {
        $error = 'Username must be at least 3 characters.';
    } elseif (strlen($password) < 8) {
        $error = 'Password must be at least 8 characters.';
    } else {
        db()->prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
            ->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
        $done = true;
    }
}
?>
<!doctype html>
<meta charset="utf-8">
<title>Imation — create admin</title>
<style>
  body { font: 15px/1.6 system-ui, sans-serif; background:#0b0f1a; color:#e2e8f0;
         display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0 }
  form, .done { background:#111827; padding:2rem; border-radius:14px; width:min(380px,90vw);
                border:1px solid #1f2937 }
  h1 { font-size:1.1rem; margin:0 0 1.25rem }
  label { display:block; font-size:.8rem; margin:1rem 0 .35rem; color:#94a3b8 }
  input { width:100%; box-sizing:border-box; padding:.6rem .7rem; border-radius:8px;
          border:1px solid #334155; background:#0b1220; color:#fff; font:inherit }
  button { margin-top:1.5rem; width:100%; padding:.7rem; border:0; border-radius:8px;
           background:#e31b23; color:#fff; font:inherit; font-weight:600; cursor:pointer }
  .err { color:#f87171; font-size:.85rem; margin-top:1rem }
  code { background:#0b1220; padding:.15rem .35rem; border-radius:4px }
</style>

<?php if ($done): ?>
  <div class="done">
    <h1>Admin created</h1>
    <p>You can now sign in at <code>/#/admin/login</code>.</p>
    <p style="color:#fbbf24">Now delete <code>create-admin.php</code> from the server.</p>
  </div>
<?php else: ?>
  <form method="post">
    <h1>Create the admin account</h1>
    <label for="u">Username</label>
    <input id="u" name="username" autocomplete="username" required>
    <label for="p">Password (8+ characters)</label>
    <input id="p" name="password" type="password" autocomplete="new-password" required>
    <button type="submit">Create account</button>
    <?php if ($error): ?><div class="err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  </form>
<?php endif; ?>
