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

$action = $_GET['action'] ?? '';

if ($action === 'me') {
    allow('GET');
    $admin = current_admin();
    json_out(['admin' => $admin ?: null]);
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
    json_out(['admin' => ['id' => (int) $admin['id'], 'username' => $admin['username']]]);
}

fail(400, 'unknown action');
