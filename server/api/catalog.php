<?php
/**
 * Categories and products.
 *
 *   GET  /api/catalog.php?resource=categories            public
 *   POST /api/catalog.php?resource=categories             admin — replaces the whole set
 *   GET  /api/catalog.php?resource=products               public
 *   POST /api/catalog.php?resource=products                admin — replaces the whole set
 *
 * The admin UI always sends its full, current list on every save or delete
 * (it edits a local copy of the array and posts the result). So a POST here
 * means "this is now the complete list": every row is upserted, and any row
 * whose id is missing from the payload is deleted. That is also what fixes
 * the original app's delete bug, where an Supabase upsert() never actually
 * removed a row that was left out of the array.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

/** Guard rails so one bad payload can't fill the database or break a column. */
const MAX_ITEMS_PER_SAVE = 2000;
const MAX_PRICE          = 1000000000; // one billion dinar

function price_field($value, string $label): float
{
    if (!is_numeric($value)) {
        fail(400, "$label must be a number");
    }
    $price = (float) $value;
    if ($price < 0) {
        fail(400, "$label cannot be negative");
    }
    if ($price > MAX_PRICE) {
        fail(400, "$label is unrealistically high");
    }
    return $price;
}

function row_to_category(array $row): array
{
    return [
        'id'    => $row['id'],
        'name'  => ['en' => $row['name_en'], 'ar' => $row['name_ar'], 'ku' => $row['name_ku']],
        'image' => $row['image'],
    ];
}

function row_to_product(array $row): array
{
    $product = [
        'id'          => $row['id'],
        'categoryId'  => $row['category_id'],
        'name'        => ['en' => $row['name_en'], 'ar' => $row['name_ar'], 'ku' => $row['name_ku']],
        'description' => ['en' => $row['description_en'], 'ar' => $row['description_ar'], 'ku' => $row['description_ku']],
        'price'       => (float) $row['price'],
        'image'       => $row['image'],
        'isAvailable' => (bool) $row['is_available'],
        'createdAt'   => strtotime($row['created_at']) * 1000,
    ];
    if ($row['discount_price'] !== null && (float) $row['discount_price'] > 0) {
        $product['discountPrice'] = (float) $row['discount_price'];
    }
    return $product;
}

function list_categories(): array
{
    $rows = db()->query('SELECT * FROM categories ORDER BY created_at ASC')->fetchAll();
    return array_map('row_to_category', $rows);
}

function list_products(): array
{
    $rows = db()->query('SELECT * FROM products ORDER BY created_at DESC')->fetchAll();
    return array_map('row_to_product', $rows);
}

function save_categories(array $items): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $ids = [];
        $upsert = $pdo->prepare(
            db_driver() === 'sqlite'
                ? 'INSERT INTO categories (id, name_en, name_ar, name_ku, image) VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET name_en=excluded.name_en, name_ar=excluded.name_ar, name_ku=excluded.name_ku, image=excluded.image'
                : 'INSERT INTO categories (id, name_en, name_ar, name_ku, image) VALUES (?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_ar=VALUES(name_ar), name_ku=VALUES(name_ku), image=VALUES(image)'
        );

        foreach ($items as $item) {
            $id = str_field($item['id'] ?? '', 'Category id', 64);
            if ($id === '') continue;
            $ids[] = $id;
            $image = save_data_uri_image($item['image'] ?? null);
            $upsert->execute([
                $id,
                str_field($item['name']['en'] ?? '', 'Category name (English)', 150),
                str_field($item['name']['ar'] ?? '', 'Category name (Arabic)', 150),
                str_field($item['name']['ku'] ?? '', 'Category name (Kurdish)', 150),
                $image,
            ]);
        }

        if (empty($ids)) {
            $pdo->exec('DELETE FROM categories');
        } else {
            $in = implode(', ', array_fill(0, count($ids), '?'));
            $pdo->prepare("DELETE FROM categories WHERE id NOT IN ($in)")->execute($ids);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function save_products(array $items): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $ids = [];
        $upsert = $pdo->prepare(
            db_driver() === 'sqlite'
                ? 'INSERT INTO products (id, category_id, name_en, name_ar, name_ku, description_en, description_ar, description_ku, price, discount_price, image, is_available, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET category_id=excluded.category_id, name_en=excluded.name_en, name_ar=excluded.name_ar,
                     name_ku=excluded.name_ku, description_en=excluded.description_en, description_ar=excluded.description_ar,
                     description_ku=excluded.description_ku, price=excluded.price, discount_price=excluded.discount_price,
                     image=excluded.image, is_available=excluded.is_available'
                : 'INSERT INTO products (id, category_id, name_en, name_ar, name_ku, description_en, description_ar, description_ku, price, discount_price, image, is_available, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), name_en=VALUES(name_en), name_ar=VALUES(name_ar),
                     name_ku=VALUES(name_ku), description_en=VALUES(description_en), description_ar=VALUES(description_ar),
                     description_ku=VALUES(description_ku), price=VALUES(price), discount_price=VALUES(discount_price),
                     image=VALUES(image), is_available=VALUES(is_available)'
        );

        foreach ($items as $item) {
            $id = str_field($item['id'] ?? '', 'Product id', 64);
            if ($id === '') continue;
            $ids[] = $id;
            $image = save_data_uri_image($item['image'] ?? null);

            // A timestamp from the client only decides display order, but an
            // absurd one would still land in a DATETIME column, so it is
            // clamped to something a date can actually hold.
            $createdAtMs = isset($item['createdAt']) ? (int) $item['createdAt'] : (int) (microtime(true) * 1000);
            $createdAtSec = intdiv($createdAtMs, 1000);
            if ($createdAtSec < 0 || $createdAtSec > time() + 86400) {
                $createdAtSec = time();
            }
            $createdAt = date('Y-m-d H:i:s', $createdAtSec);

            $price = price_field($item['price'] ?? 0, 'Price');
            $discount = null;
            if (isset($item['discountPrice']) && $item['discountPrice'] !== '' && (float) $item['discountPrice'] > 0) {
                $discount = price_field($item['discountPrice'], 'Discount price');
            }
            $categoryId = str_field($item['categoryId'] ?? '', 'Category', 64);

            $upsert->execute([
                $id,
                $categoryId !== '' ? $categoryId : null,
                str_field($item['name']['en'] ?? '', 'Product name (English)', 150),
                str_field($item['name']['ar'] ?? '', 'Product name (Arabic)', 150),
                str_field($item['name']['ku'] ?? '', 'Product name (Kurdish)', 150),
                str_field($item['description']['en'] ?? '', 'Description (English)', 5000),
                str_field($item['description']['ar'] ?? '', 'Description (Arabic)', 5000),
                str_field($item['description']['ku'] ?? '', 'Description (Kurdish)', 5000),
                $price,
                $discount,
                $image,
                !empty($item['isAvailable']) ? 1 : 0,
                $createdAt,
            ]);
        }

        if (empty($ids)) {
            $pdo->exec('DELETE FROM products');
        } else {
            $in = implode(', ', array_fill(0, count($ids), '?'));
            $pdo->prepare("DELETE FROM products WHERE id NOT IN ($in)")->execute($ids);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

$resource = $_GET['resource'] ?? '';

if ($resource === 'categories') {
    $method = allow('GET', 'POST');
    if ($method === 'GET') {
        json_out(list_categories());
    }
    require_admin();
    $items = body_list();
    if (count($items) > MAX_ITEMS_PER_SAVE) fail(400, 'too many categories in one save');
    save_categories($items);
    json_out(list_categories());
}

if ($resource === 'products') {
    $method = allow('GET', 'POST');
    if ($method === 'GET') {
        json_out(list_products());
    }
    require_admin();
    $items = body_list();
    if (count($items) > MAX_ITEMS_PER_SAVE) fail(400, 'too many products in one save');
    save_products($items);
    json_out(list_products());
}

fail(400, 'unknown resource');
