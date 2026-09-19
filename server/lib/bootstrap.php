<?php
/**
 * Shared setup for every endpoint: config, database handle, JSON helpers,
 * and admin authentication.
 *
 * No Composer, no framework — plain PDO, so it runs on any Hostinger plan.
 * This mirrors the pattern used by talal-tech.com (same author, same host).
 */

declare(strict_types=1);

date_default_timezone_set('Asia/Baghdad');
mb_internal_encoding('UTF-8');

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_exception_handler(static function (Throwable $e): void {
    error_log((string) $e);
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'server error']);
    exit;
});

// ---------------------------------------------------------------- config --
$configPath = __DIR__ . '/../config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'server not configured: copy config.example.php to config.php']);
    exit;
}
/** @var array $CONFIG */
$CONFIG = require $configPath;

// ------------------------------------------------------------------- db ---
function db_driver(): string
{
    global $CONFIG;
    return $CONFIG['driver'] ?? 'mysql';
}

function db(): PDO
{
    static $pdo = null;
    global $CONFIG;

    if ($pdo === null) {
        try {
            if (db_driver() === 'sqlite') {
                @mkdir(dirname($CONFIG['db_path']), 0777, true);
                $pdo = new PDO('sqlite:' . $CONFIG['db_path'], null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                $pdo->exec('PRAGMA foreign_keys = ON');
            } else {
                $dsn = sprintf(
                    'mysql:host=%s;dbname=%s;charset=utf8mb4',
                    $CONFIG['db_host'],
                    $CONFIG['db_name']
                );
                $pdo = new PDO($dsn, $CONFIG['db_user'], $CONFIG['db_pass'], [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            }
        } catch (PDOException $e) {
            fail(500, 'database connection failed');
        }
    }
    return $pdo;
}

/** The current timestamp, in whichever dialect is running. */
function now_sql(): string
{
    return db_driver() === 'sqlite' ? "datetime('now')" : 'NOW()';
}

/** True autoincrement id of the last INSERT. */
function last_id(): int
{
    return (int) db()->lastInsertId();
}

// -------------------------------------------------------------- output ----
function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): void
{
    json_out(['error' => $message], $status);
}

/** Read a JSON request body into an array. */
function body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Restrict an endpoint to specific HTTP verbs. */
function allow(string ...$methods): string
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if (!in_array($method, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        fail(405, 'method not allowed');
    }
    return $method;
}

// ---------------------------------------------------------------- auth ----
const SESSION_COOKIE = 'im_admin';
const SESSION_DAYS   = 7;

function hash_token(string $token): string
{
    return hash('sha256', $token);
}

function start_session_for(int $adminId): string
{
    $token = bin2hex(random_bytes(32));
    $expires = new DateTimeImmutable('+' . SESSION_DAYS . ' days');

    db()->prepare(
        'INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)'
    )->execute([hash_token($token), $adminId, $expires->format('Y-m-d H:i:s')]);

    db()->exec('DELETE FROM admin_sessions WHERE expires_at < ' . now_sql());

    setcookie(SESSION_COOKIE, $token, [
        'expires'  => $expires->getTimestamp(),
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    return $token;
}

function end_session(): void
{
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token !== '') {
        db()->prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
            ->execute([hash_token($token)]);
    }
    setcookie(SESSION_COOKIE, '', [
        'expires' => time() - 3600, 'path' => '/', 'httponly' => true,
    ]);
}

/** Returns the admin row for the current session, or null. */
function current_admin(): ?array
{
    $token = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($token === '') {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT a.id, a.username
           FROM admin_sessions s
           JOIN admins a ON a.id = s.admin_id
          WHERE s.token_hash = ? AND s.expires_at > ' . now_sql()
    );
    $stmt->execute([hash_token($token)]);
    $row = $stmt->fetch();

    return $row ?: null;
}

/** Stop the request unless a valid admin session is present. */
function require_admin(): array
{
    $admin = current_admin();
    if (!$admin) {
        fail(401, 'not signed in');
    }
    return $admin;
}

// ------------------------------------------------------------- helpers ----
/** Decode a JSON column, tolerating NULL and malformed values. */
function json_col(?string $raw, $fallback = [])
{
    if ($raw === null || $raw === '') {
        return $fallback;
    }
    $decoded = json_decode($raw, true);
    return $decoded === null ? $fallback : $decoded;
}

/**
 * If $value is a data: URI, decode and save it under the configured upload
 * directory and return its public URL. Otherwise (already a plain URL, or
 * empty) return it unchanged — mirrors the original app's "upload only if
 * it's a fresh data: URI" behaviour so unedited images are never re-saved.
 */
function save_data_uri_image(?string $value): ?string
{
    global $CONFIG;

    if ($value === null || $value === '' || strpos($value, 'data:') !== 0) {
        return $value;
    }

    if (!preg_match('/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/', $value, $m)) {
        return $value;
    }

    $ext = strtolower($m[1]);
    $ext = $ext === 'svg+xml' ? 'svg' : preg_replace('/[^a-z0-9]/', '', $ext);
    $ext = $ext ?: 'png';

    $binary = base64_decode($m[2], true);
    if ($binary === false) {
        return $value;
    }
    if (strlen($binary) > 10 * 1024 * 1024) {
        fail(413, 'image too large (max 10MB)');
    }

    @mkdir($CONFIG['upload_dir'], 0777, true);
    $filename = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $path = rtrim($CONFIG['upload_dir'], '/\\') . '/' . $filename;

    if (file_put_contents($path, $binary) === false) {
        fail(500, 'failed to save uploaded image');
    }

    return rtrim($CONFIG['upload_url'], '/') . '/' . $filename;
}
