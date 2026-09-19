-- Imation (computer store) — SQLite schema for local development only.
-- Loaded by local-sqlite-init.php. Production always uses schema.sql (MySQL).

CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash CHAR(64) NOT NULL UNIQUE,
    admin_id   INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_key    VARCHAR(160) PRIMARY KEY,
    failures       INTEGER NOT NULL DEFAULT 0,
    last_failed_at DATETIME NOT NULL,
    locked_until   DATETIME NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id         VARCHAR(64) PRIMARY KEY,
    name_en    VARCHAR(191) NOT NULL,
    name_ar    VARCHAR(191) NOT NULL,
    name_ku    VARCHAR(191) NOT NULL,
    image      TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id               VARCHAR(64) PRIMARY KEY,
    category_id      VARCHAR(64) NULL,
    name_en          VARCHAR(191) NOT NULL,
    name_ar          VARCHAR(191) NOT NULL,
    name_ku          VARCHAR(191) NOT NULL,
    description_en   TEXT,
    description_ar   TEXT,
    description_ku   TEXT,
    price            DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_price   DECIMAL(12,2) NULL,
    image            TEXT,
    is_available     TINYINT(1) NOT NULL DEFAULT 1,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name    VARCHAR(191) NOT NULL,
    phone            VARCHAR(32) NOT NULL,
    city             VARCHAR(64) NOT NULL,
    address          TEXT NOT NULL,
    note             TEXT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'Pending',
    tracking_number  VARCHAR(32) NOT NULL DEFAULT '',
    delivery_name    VARCHAR(191) NULL,
    delivery_phone   VARCHAR(32) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);

CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    product_id  VARCHAR(64) NULL,
    name_en     VARCHAR(191) NOT NULL,
    name_ar     VARCHAR(191) NOT NULL,
    name_ku     VARCHAR(191) NOT NULL,
    image       TEXT,
    quantity    INTEGER NOT NULL,
    price       DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS settings (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    logo             TEXT,
    hero_image       TEXT,
    about_image      TEXT,
    about_text_en    TEXT,
    about_text_ar    TEXT,
    about_text_ku    TEXT,
    phone1           VARCHAR(32),
    phone2           VARCHAR(32),
    instagram        VARCHAR(255),
    facebook         VARCHAR(255),
    tiktok           VARCHAR(255),
    google_maps_url  VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS rate_limits (
    limit_key    VARCHAR(190) PRIMARY KEY,
    hits         INTEGER NOT NULL DEFAULT 0,
    window_start DATETIME NOT NULL
);
