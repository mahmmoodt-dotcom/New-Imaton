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

/**
 * Read a JSON request body into an array.
 *
 * A body that will not parse is refused rather than quietly read as "no
 * fields". The catalogue endpoints treat the array they receive as the
 * complete list, so silently turning a garbled request into an empty array
 * would delete every product in the shop.
 */
function body(): array
{
    $raw = file_get_contents('php://input') ?: '';

    // A request larger than PHP's post_max_size arrives with an empty body
    // and no warning. Without this the caller would see a confusing
    // "missing required field" instead of "your photo is too big".
    if ($raw === '' && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        fail(413, 'the data sent was too large for the server to accept — try a smaller photo');
    }

    if (trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        fail(400, 'the request could not be read — nothing was changed');
    }
    return $data;
}

/**
 * The request body as a plain list (a JSON array, not an object).
 * Used where the body means "this is now the entire set".
 */
function body_list(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (trim($raw) === '') {
        fail(400, 'no data was sent — nothing was changed');
    }

    $data = body();
    if (!array_is_list($data)) {
        fail(400, 'expected a list — nothing was changed');
    }
    return $data;
}

/**
 * Cross-site request forgery guard.
 *
 * The session cookie is SameSite=Lax, which already stops a form on another
 * site from posting here with the admin's cookie attached. This is the
 * second lock: a browser always sends Origin on a cross-site POST, so if one
 * is present and it is not us, the request is refused. Requests with no
 * Origin at all (curl, a mobile app) are not a CSRF vector and are allowed.
 */
function check_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }

    $originHost = parse_url($origin, PHP_URL_HOST);
    $selfHost   = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);

    if ($originHost === null || $selfHost === null || strcasecmp($originHost, $selfHost) !== 0) {
        fail(403, 'request blocked: cross-site request');
    }
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
    if ($method !== 'GET' && $method !== 'HEAD') {
        check_same_origin();
    }
    return $method;
}

// -------------------------------------------------------- rate limiting ---
/**
 * Allow at most $max hits on $key per $windowMinutes, per caller.
 *
 * Used to stop a script flooding the shop with fake orders or grinding
 * through tracking numbers. Sign-in has its own stricter lockout in
 * api/auth.php.
 */
function rate_limit(string $key, int $max, int $windowMinutes): void
{
    $full = $key . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $now  = new DateTimeImmutable();

    db()->exec(
        'CREATE TABLE IF NOT EXISTS rate_limits (
           limit_key    VARCHAR(190) PRIMARY KEY,
           hits         INTEGER  NOT NULL DEFAULT 0,
           window_start DATETIME NOT NULL
         )'
    );

    // Forget windows that closed long ago, so the table stays small.
    db()->prepare('DELETE FROM rate_limits WHERE window_start < ?')
        ->execute([$now->modify('-1 day')->format('Y-m-d H:i:s')]);

    $stmt = db()->prepare('SELECT hits, window_start FROM rate_limits WHERE limit_key = ?');
    $stmt->execute([$full]);
    $row = $stmt->fetch();

    $windowOpenedAt = $row ? new DateTimeImmutable($row['window_start']) : null;
    $windowIsOpen   = $windowOpenedAt !== null
        && $windowOpenedAt > $now->modify('-' . $windowMinutes . ' minutes');

    if ($windowIsOpen) {
        if ((int) $row['hits'] >= $max) {
            fail(429, 'too many requests — please wait a few minutes and try again');
        }
        db()->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE limit_key = ?')->execute([$full]);
        return;
    }

    if ($row) {
        db()->prepare('UPDATE rate_limits SET hits = 1, window_start = ? WHERE limit_key = ?')
            ->execute([$now->format('Y-m-d H:i:s'), $full]);
    } else {
        db()->prepare('INSERT INTO rate_limits (limit_key, hits, window_start) VALUES (?, 1, ?)')
            ->execute([$full, $now->format('Y-m-d H:i:s')]);
    }
}

// ------------------------------------------------------ input handling ----
/**
 * A trimmed string, refused if it is longer than the column can hold.
 * Silently truncating customer input would quietly corrupt an order.
 */
function str_field($value, string $label, int $max, bool $required = false): string
{
    $text = trim((string) ($value ?? ''));

    if ($required && $text === '') {
        fail(400, "$label is required");
    }
    if (mb_strlen($text) > $max) {
        fail(400, "$label is too long (maximum $max characters)");
    }
    return $text;
}

/** An http(s) URL, or '' — never a javascript: or data: URL. */
function url_field($value, string $label, int $max = 500): string
{
    $text = str_field($value, $label, $max);
    if ($text === '') {
        return '';
    }
    if (!preg_match('#^https?://#i', $text) && $text[0] !== '/') {
        fail(400, "$label must start with http:// or https://");
    }
    return $text;
}

// ---------------------------------------------------------------- auth ----
const SESSION_COOKIE = 'im_admin';
const SESSION_DAYS   = 7;

function hash_token(string $token): string
{
    return hash('sha256', $token);
}

/**
 * Whether this request reached us over HTTPS.
 *
 * Shared hosting often terminates TLS at a proxy, so $_SERVER['HTTPS'] is
 * empty even though the visitor is on https. Getting this wrong would drop
 * the `secure` flag from the session cookie and let it travel in clear.
 */
function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https') {
        return true;
    }
    return (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
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
        'secure'   => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    return $token;
}

/** Drop every session belonging to an admin except, optionally, this one. */
function end_other_sessions_for(int $adminId): void
{
    $current = $_COOKIE[SESSION_COOKIE] ?? '';
    if ($current === '') {
        db()->prepare('DELETE FROM admin_sessions WHERE admin_id = ?')->execute([$adminId]);
        return;
    }
    db()->prepare('DELETE FROM admin_sessions WHERE admin_id = ? AND token_hash <> ?')
        ->execute([$adminId, hash_token($current)]);
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
        // Already a stored URL. Make sure it is a path or an http(s) URL and
        // not something like javascript: that would end up in an <img src>.
        if ($value !== null && $value !== '' && !preg_match('#^(https?://|/)#i', $value)) {
            fail(400, 'invalid image address');
        }
        return $value;
    }

    if (!preg_match('#^data:image/([a-z0-9.+-]+);base64,(.+)$#i', $value, $m)) {
        fail(400, 'unsupported image format');
    }

    $binary = base64_decode($m[2], true);
    if ($binary === false) {
        fail(400, 'the image could not be read');
    }
    if (strlen($binary) > 6 * 1024 * 1024) {
        fail(413, 'image too large (maximum 6MB)');
    }

    // The extension comes from what the bytes actually are, never from the
    // label the caller attached. Claiming "data:image/php" must not be able
    // to put a .php file in a web-served folder — SVG is refused outright
    // because it can carry script and would run on our own origin.
    $info = @getimagesizefromstring($binary);
    if ($info === false || empty($info[2])) {
        fail(400, 'that file is not a valid image');
    }

    $allowed = [
        IMAGETYPE_PNG  => 'png',
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_GIF  => 'gif',
        IMAGETYPE_WEBP => 'webp',
    ];
    if (!isset($allowed[$info[2]])) {
        fail(400, 'images must be PNG, JPG, GIF or WebP');
    }
    $ext = $allowed[$info[2]];

    if (!is_dir($CONFIG['upload_dir']) && !@mkdir($CONFIG['upload_dir'], 0755, true)) {
        fail(500, 'the uploads folder could not be created');
    }

    $filename = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $path = rtrim($CONFIG['upload_dir'], '/\\') . '/' . $filename;

    if (file_put_contents($path, $binary) === false) {
        fail(500, 'failed to save the uploaded image');
    }
    @chmod($path, 0644);

    return rtrim($CONFIG['upload_url'], '/') . '/' . $filename;
}
