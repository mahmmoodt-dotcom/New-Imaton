<?php
/**
 * Router for PHP's built-in dev server (`php -S host:port -t server router.php`).
 *
 * The server's docroot is `server/`, so `/api/*` resolves normally. Uploaded
 * photos live one level up in `uploads/` (see config.php's upload_dir) —
 * outside that docroot, so the built-in server 404s on them by default.
 * This intercepts exactly `/uploads/*` and serves it from the real
 * directory; everything else falls through to normal built-in handling.
 * Production serves `/uploads` as a plain static path via the real
 * webserver's own docroot, so this file is dev-only.
 */

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (strncmp($path, '/uploads/', 9) === 0) {
    $file = __DIR__ . '/../' . $path;
    if (is_file($file)) {
        $mime = match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            default => 'application/octet-stream',
        };
        header('Content-Type: ' . $mime);
        readfile($file);
        return true;
    }
    http_response_code(404);
    return true;
}

return false;
