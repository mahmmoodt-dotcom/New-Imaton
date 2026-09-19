<?php
/**
 * One-time local setup: creates the SQLite file used by config.php and
 * loads schema.sqlite.sql + seed.sqlite.sql into it. Safe to re-run — both
 * files use INSERT OR IGNORE / CREATE TABLE IF NOT EXISTS.
 *
 *   php server/local-sqlite-init.php
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
if (($config['driver'] ?? 'mysql') !== 'sqlite') {
    fwrite(STDERR, "config.php is not set to the sqlite driver — nothing to do.\n");
    exit(1);
}

@mkdir(dirname($config['db_path']), 0777, true);

$pdo = new PDO('sqlite:' . $config['db_path']);
$pdo->exec('PRAGMA foreign_keys = ON');
$pdo->exec(file_get_contents(__DIR__ . '/schema.sqlite.sql'));
$pdo->exec(file_get_contents(__DIR__ . '/seed.sqlite.sql'));

echo "SQLite database ready at {$config['db_path']}\n";
