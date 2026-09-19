<?php
/**
 * Copy this file to `config.php` on the server and fill in your details.
 * config.php is git-ignored — never commit real credentials.
 *
 * On Hostinger: hPanel → Databases → MySQL Databases shows the host, database
 * name and user. The host is usually "localhost".
 */

return [
    'db_host' => 'localhost',
    'db_name' => 'uXXXXXX_imation',
    'db_user' => 'uXXXXXX_admin',
    'db_pass' => 'CHANGE_ME',

    // Where uploaded product photos are written.
    //
    // This path is relative to wherever THIS FILE sits, which differs
    // between the two layouts:
    //
    //   on the server   config.php is in public_html/  -> __DIR__ . '/uploads'
    //   local dev       config.php is in server/       -> __DIR__ . '/../uploads'
    //
    // Get it wrong on the server and photos are written one level above
    // public_html, where the web server will never serve them: uploads
    // appear to succeed and every image 404s.
    'upload_dir' => __DIR__ . '/uploads',
    'upload_url' => '/uploads',
];
