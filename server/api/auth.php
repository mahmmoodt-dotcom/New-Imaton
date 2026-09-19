<?php
/**
 * Admin authentication.
 *
 *   POST /api/auth.php?action=login   {username, password}
 *   POST /api/auth.php?action=logout
 *   GET  /api/auth.php?action=me
 *
 * The session token lives in an httpOnly cookie, so page scripts can never
 * read it. Only a SHA-256 hash of it is stored server-side.
 *
 * Wrong passwords are counted per client address and per username; ten in
 * a row lock that address / that account for fifteen minutes.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

const LOGIN_MAX_FAILURES = 10;
const LOGIN_LOCK_MINUTES = 15;

function attempt_keys(string $username): array
{
    return [
        'ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
        'user:' . mb_strtolower($username),
    ];
}

function login_locked_until(array $keys): ?DateTimeImmutable
{
    $in   = implode(', ', array_fill(0, count($keys), '?'));
    $stmt = db()->prepare(
        "SELECT locked_until FROM login_attempts WHERE attempt_key IN ($in) AND locked_until IS NOT NULL"
    );
    $stmt->execute($keys);

    $now    = new DateTimeImmutable();
    $latest = null;
    foreach ($stmt->fetchAll() as $row) {
        $until = new DateTimeImmutable($row['locked_until']);
        if ($until > $now && ($latest === null || $until > $latest)) {
            $latest = $until;
        }
    }
    return $latest;
}

function record_login_failure(array $keys): void
{
    $now = new DateTimeImmutable();

    db()->prepare('DELETE FROM login_attempts WHERE last_failed_at < ?')
        ->execute([$now->modify('-1 day')->format('Y-m-d H:i:s')]);

    $read = db()->prepare('SELECT failures FROM login_attempts WHERE attempt_key = ?');

    foreach ($keys as $key) {
        $read->execute([$key]);
        $row      = $read->fetch();
        $failures = $row ? (int) $row['failures'] + 1 : 1;
        $lockedUntil = null;
        if ($failures >= LOGIN_MAX_FAILURES) {
            $lockedUntil = $now->modify('+' . LOGIN_LOCK_MINUTES . ' minutes')->format('Y-m-d H:i:s');
            $failures    = 0;
        }

        if ($row) {
            db()->prepare('UPDATE login_attempts SET failures = ?, last_failed_at = ?, locked_until = ? WHERE attempt_key = ?')
                ->execute([$failures, $now->format('Y-m-d H:i:s'), $lockedUntil, $key]);
        } else {
            db()->prepare('INSERT INTO login_attempts (attempt_key, failures, last_failed_at, locked_until) VALUES (?, ?, ?, ?)')
                ->execute([$key, $failures, $now->format('Y-m-d H:i:s'), $lockedUntil]);
        }
    }
}

function clear_login_failures(array $keys): void
{
    $in = implode(', ', array_fill(0, count($keys), '?'));
    db()->prepare("DELETE FROM login_attempts WHERE attempt_key IN ($in)")->execute($keys);
}

/**
 * Passwords that must never be left in place on a live shop. The dashboard
 * shows a standing warning until the account is off this list — the site
 * ships with admin/admin for local development and that is exactly the kind
 * of thing that survives to production if nobody is nagged about it.
 */
const OBVIOUS_PASSWORDS = [
    'admin', 'admin123', 'password', 'password123', '12345678', '123456789',
    'imation', 'qwerty123', 'letmein', 'changeme',
];

function password_is_obvious(string $hash): bool
{
    foreach (OBVIOUS_PASSWORDS as $guess) {
        if (password_verify($guess, $hash)) {
            return true;
        }
    }
    return false;
}

function admin_password_hash(int $adminId): string
{
    $stmt = db()->prepare('SELECT password_hash FROM admins WHERE id = ?');
    $stmt->execute([$adminId]);
    return (string) $stmt->fetchColumn();
}

$action = $_GET['action'] ?? '';

if ($action === 'me') {
    allow('GET');
    $admin = current_admin();
    if (!$admin) {
        json_out(['admin' => null]);
    }
    json_out([
        'admin' => [
            'id'           => (int) $admin['id'],
            'username'     => $admin['username'],
            'weakPassword' => password_is_obvious(admin_password_hash((int) $admin['id'])),
        ],
    ]);
}

if ($action === 'changePassword') {
    allow('POST');
    $admin = require_admin();

    $data        = body();
    $current     = (string) ($data['currentPassword'] ?? '');
    $next        = (string) ($data['newPassword'] ?? '');
    $adminId     = (int) $admin['id'];

    if (!password_verify($current, admin_password_hash($adminId))) {
        usleep(400000);
        fail(401, 'your current password is not correct');
    }
    if (mb_strlen($next) < 10) {
        fail(400, 'the new password must be at least 10 characters');
    }
    if (mb_strlen($next) > 200) {
        fail(400, 'the new password is too long');
    }
    if (password_verify($next, admin_password_hash($adminId))) {
        fail(400, 'the new password must be different from the current one');
    }
    foreach (OBVIOUS_PASSWORDS as $guess) {
        if (hash_equals(mb_strtolower($guess), mb_strtolower($next))) {
            fail(400, 'that password is too easy to guess — pick something else');
        }
    }

    db()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($next, PASSWORD_DEFAULT), $adminId]);

    // Anyone else holding a session for this account is signed out, so a
    // password change actually evicts an intruder instead of just adding a
    // second valid password holder.
    end_other_sessions_for($adminId);

    json_out(['ok' => true]);
}

if ($action === 'logout') {
    allow('POST');
    end_session();
    json_out(['ok' => true]);
}

if ($action === 'login') {
    allow('POST');

    $data     = body();
    $username = trim((string) ($data['username'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if ($username === '' || $password === '') {
        fail(400, 'username and password are required');
    }

    $keys  = attempt_keys($username);
    $until = login_locked_until($keys);
    if ($until !== null) {
        $minutes = max(1, (int) ceil(($until->getTimestamp() - time()) / 60));
        fail(429, "too many failed attempts — try again in $minutes minute" . ($minutes === 1 ? '' : 's'));
    }

    $stmt = db()->prepare('SELECT id, username, password_hash FROM admins WHERE username = ?');
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($password, $admin['password_hash'])) {
        record_login_failure($keys);
        usleep(400000);
        fail(401, 'incorrect username or password');
    }

    clear_login_failures($keys);
    start_session_for((int) $admin['id']);
    json_out(['admin' => [
        'id'           => (int) $admin['id'],
        'username'     => $admin['username'],
        'weakPassword' => password_is_obvious($admin['password_hash']),
    ]]);
}

fail(400, 'unknown action');
