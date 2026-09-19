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
            $id = (string) ($item['id'] ?? '');
            if ($id === '') continue;
            $ids[] = $id;
            $image = save_data_uri_image($item['image'] ?? null);
            $upsert->execute([
                $id,
                (string) ($item['name']['en'] ?? ''),
                (string) ($item['name']['ar'] ?? ''),
                (string) ($item['name']['ku'] ?? ''),
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
            $id = (string) ($item['id'] ?? '');
            if ($id === '') continue;
            $ids[] = $id;
            $image = save_data_uri_image($item['image'] ?? null);
            $createdAtMs = isset($item['createdAt']) ? (int) $item['createdAt'] : (int) (microtime(true) * 1000);
            $createdAt = date('Y-m-d H:i:s', intdiv($createdAtMs, 1000));
            $discount = isset($item['discountPrice']) && $item['discountPrice'] !== '' && $item['discountPrice'] > 0
                ? (float) $item['discountPrice'] : null;
            $categoryId = (string) ($item['categoryId'] ?? '');

            $upsert->execute([
                $id,
                $categoryId !== '' ? $categoryId : null,
                (string) ($item['name']['en'] ?? ''),
                (string) ($item['name']['ar'] ?? ''),
                (string) ($item['name']['ku'] ?? ''),
                (string) ($item['description']['en'] ?? ''),
                (string) ($item['description']['ar'] ?? ''),
                (string) ($item['description']['ku'] ?? ''),
                (float) ($item['price'] ?? 0),
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
    $items = body();
    if (!is_array($items)) fail(400, 'expected an array of categories');
    save_categories($items);
    json_out(list_categories());
}

if ($resource === 'products') {
    $method = allow('GET', 'POST');
    if ($method === 'GET') {
        json_out(list_products());
    }
    require_admin();
    $items = body();
    if (!is_array($items)) fail(400, 'expected an array of products');
    save_products($items);
    json_out(list_products());
}

fail(400, 'unknown resource');
