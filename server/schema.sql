-- Imation (computer store) — MySQL schema for Hostinger production.
-- Import this once via phpMyAdmin (or `mysql < schema.sql`) on a fresh database.

CREATE TABLE IF NOT EXISTS admins (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    admin_id   INT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_key    VARCHAR(160) PRIMARY KEY,
    failures       INT NOT NULL DEFAULT 0,
    last_failed_at DATETIME NOT NULL,
    locked_until   DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
    id         VARCHAR(64) PRIMARY KEY,
    name_en    VARCHAR(191) NOT NULL,
    name_ar    VARCHAR(191) NOT NULL,
    name_ku    VARCHAR(191) NOT NULL,
    image      TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_products_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    customer_name    VARCHAR(191) NOT NULL,
    phone            VARCHAR(32) NOT NULL,
    city             VARCHAR(64) NOT NULL,
    address          TEXT NOT NULL,
    note             TEXT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'Pending',
    tracking_number  VARCHAR(32) NOT NULL DEFAULT '',
    delivery_name    VARCHAR(191) NULL,
    delivery_phone   VARCHAR(32) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_status (status),
    INDEX idx_orders_tracking (tracking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- product_id/name/image/price are snapshotted at order time so a later
-- product edit or delete never changes or breaks a past order's record.
CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    product_id  VARCHAR(64) NULL,
    name_en     VARCHAR(191) NOT NULL,
    name_ar     VARCHAR(191) NOT NULL,
    name_ku     VARCHAR(191) NOT NULL,
    image       TEXT,
    quantity    INT NOT NULL,
    price       DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
    id               INT PRIMARY KEY DEFAULT 1,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_limits (
    limit_key    VARCHAR(190) PRIMARY KEY,
    hits         INT NOT NULL DEFAULT 0,
    window_start DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
