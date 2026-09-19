<?php
/**
 * Orders.
 *
 *   POST /api/orders.php?action=submit                    public — place an order
 *   GET  /api/orders.php?action=track&code=IM-2026-000001  public — track by number
 *   GET  /api/orders.php?action=list                       admin — full order list
 *   GET  /api/orders.php?action=count&status=Pending        admin — badge count
 *   POST /api/orders.php?action=updateStatus                admin — advance an order
 *
 * Each order item snapshots the product's name/image/price at the moment of
 * purchase, so editing or deleting a product later never changes or breaks
 * a historical order (the original Supabase version joined products(*) live
 * and would show garbage or crash once a product was removed).
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

function row_to_order(array $order, array $items): array
{
    return [
        'id'              => (string) $order['id'],
        'invoiceNumber'   => (int) $order['id'],
        'trackingNumber'  => $order['tracking_number'],
        'customerName'    => $order['customer_name'],
        'phoneNumber'     => $order['phone'],
        'city'            => $order['city'],
        'address'         => $order['address'],
        'note'            => $order['note'],
        'status'          => $order['status'],
        'deliveryPerson'  => $order['delivery_name'],
        'deliveryPhone'   => $order['delivery_phone'],
        'createdAt'       => strtotime($order['created_at']) * 1000,
        'totalAmount'     => array_reduce($items, fn($sum, $i) => $sum + ((float) $i['price'] * (int) $i['quantity']), 0.0),
        'items'           => array_map(static function ($i) {
            return [
                'productId' => $i['product_id'],
                'quantity'  => (int) $i['quantity'],
                'product'   => [
                    'id'    => $i['product_id'],
                    'name'  => ['en' => $i['name_en'], 'ar' => $i['name_ar'], 'ku' => $i['name_ku']],
                    'image' => $i['image'],
                    'price' => (float) $i['price'],
                ],
            ];
        }, $items),
    ];
}

function fetch_order_items(int $orderId): array
{
    $stmt = db()->prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

function fetch_order(int $orderId): ?array
{
    $stmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    return $order ? row_to_order($order, fetch_order_items($orderId)) : null;
}

$action = $_GET['action'] ?? '';

if ($action === 'submit') {
    allow('POST');
    $data = body();

    $customerName = trim((string) ($data['customerName'] ?? ''));
    $phone        = trim((string) ($data['phoneNumber'] ?? ''));
    $city         = trim((string) ($data['city'] ?? ''));
    $address      = trim((string) ($data['address'] ?? ''));
    $note         = trim((string) ($data['note'] ?? ''));
    $items        = is_array($data['items'] ?? null) ? $data['items'] : [];

    if ($customerName === '' || $phone === '' || $city === '' || $address === '') {
        fail(400, 'missing required delivery details');
    }
    if (!preg_match('/^07[0-9]{9}$/', $phone)) {
        fail(400, 'invalid phone number');
    }
    if (empty($items)) {
        fail(400, 'cart is empty');
    }

    // Look up each product server-side rather than trusting client-sent
    // prices, so a tampered request can't check out at an arbitrary price.
    $productStmt = db()->prepare('SELECT * FROM products WHERE id = ?');

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO orders (customer_name, phone, city, address, note, status, tracking_number, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ' . now_sql() . ')'
        )->execute([$customerName, $phone, $city, $address, $note, 'Pending', '']);
        $orderId = last_id();

        $itemInsert = $pdo->prepare(
            'INSERT INTO order_items (order_id, product_id, name_en, name_ar, name_ku, image, quantity, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );

        foreach ($items as $line) {
            $productId = (string) ($line['productId'] ?? '');
            $qty       = max(1, (int) ($line['quantity'] ?? 1));

            $productStmt->execute([$productId]);
            $product = $productStmt->fetch();
            if (!$product) {
                continue; // ignore lines for products that no longer exist
            }

            $unitPrice = ($product['discount_price'] !== null && (float) $product['discount_price'] > 0)
                ? (float) $product['discount_price']
                : (float) $product['price'];

            $itemInsert->execute([
                $orderId, $productId,
                $product['name_en'], $product['name_ar'], $product['name_ku'],
                $product['image'], $qty, $unitPrice,
            ]);
        }

        $year = date('Y');
        $tracking = sprintf('IM-%s-%06d', $year, $orderId);
        $pdo->prepare('UPDATE orders SET tracking_number = ? WHERE id = ?')->execute([$tracking, $orderId]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $final = fetch_order($orderId);
    if (!$final || empty($final['items'])) {
        fail(400, 'none of the items in your cart are available anymore');
    }
    json_out($final);
}

if ($action === 'track') {
    allow('GET');
    $code = strtoupper(trim((string) ($_GET['code'] ?? '')));
    if ($code === '') fail(400, 'tracking code required');

    $stmt = db()->prepare('SELECT id FROM orders WHERE tracking_number = ?');
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    json_out(['order' => $row ? fetch_order((int) $row['id']) : null]);
}

if ($action === 'list') {
    allow('GET');
    require_admin();
    $ids = db()->query('SELECT id FROM orders ORDER BY created_at DESC')->fetchAll(PDO::FETCH_COLUMN);
    json_out(array_map(fn($id) => fetch_order((int) $id), $ids));
}

if ($action === 'count') {
    allow('GET');
    require_admin();
    $status = (string) ($_GET['status'] ?? 'Pending');
    $stmt = db()->prepare('SELECT COUNT(*) FROM orders WHERE status = ?');
    $stmt->execute([$status]);
    json_out(['count' => (int) $stmt->fetchColumn()]);
}

if ($action === 'updateStatus') {
    allow('POST');
    require_admin();
    $data = body();

    $orderId = (int) ($data['orderId'] ?? 0);
    $status  = (string) ($data['status'] ?? '');
    $valid   = ['Pending', 'Delivering', 'Delivered', 'Canceled'];
    if (!$orderId || !in_array($status, $valid, true)) {
        fail(400, 'invalid order or status');
    }
    if ($status === 'Delivering' && trim((string) ($data['deliveryPerson'] ?? '')) === '') {
        fail(400, 'courier name is required to ship');
    }

    $sets = ['status = ?'];
    $params = [$status];
    if (isset($data['deliveryPerson']) && $data['deliveryPerson'] !== '') {
        $sets[] = 'delivery_name = ?';
        $params[] = (string) $data['deliveryPerson'];
    }
    if (isset($data['deliveryPhone']) && $data['deliveryPhone'] !== '') {
        $sets[] = 'delivery_phone = ?';
        $params[] = (string) $data['deliveryPhone'];
    }
    $params[] = $orderId;

    db()->prepare('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

    $updated = fetch_order($orderId);
    if (!$updated) fail(404, 'order not found');
    json_out($updated);
}

fail(400, 'unknown action');
