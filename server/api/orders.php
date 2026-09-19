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

/** Cities the shop delivers to — mirrors constants.ts on the front end. */
const IRAQ_CITIES = [
    'Baghdad', 'Erbil', 'Sulaymaniyah', 'Duhok', 'Basra', 'Mosul', 'Najaf', 'Karbala',
    'Kirkuk', 'Anbar', 'Maysan', 'Muthanna', 'Qadisiyah', 'Dhi Qar', 'Babil', 'Wasit',
    'Diyala', 'Salah al-Din',
];

const MAX_LINES_PER_ORDER = 50;
const MAX_QTY_PER_LINE    = 99;

/**
 * A tracking number nobody can guess.
 *
 * It used to be IM-<year>-<order id>, which counts up one at a time: anyone
 * could ask for the next number and read that customer's name, phone and
 * street address. This draws from an alphabet with no look-alike characters
 * (no O/0, no I/1) so it survives being read down the phone.
 */
function generate_tracking_number(): string
{
    $alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $check = db()->prepare('SELECT 1 FROM orders WHERE tracking_number = ?');

    for ($attempt = 0; $attempt < 12; $attempt++) {
        $code = '';
        for ($i = 0; $i < 8; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $candidate = 'IM-' . date('Y') . '-' . $code;

        $check->execute([$candidate]);
        if (!$check->fetchColumn()) {
            return $candidate;
        }
    }
    fail(500, 'could not allocate a tracking number — please try again');
}

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

    // Checkout is open to the public, so it is the obvious thing to flood.
    // Ten orders an hour from one address is far above real use and far
    // below what would bury the shop owner in junk.
    rate_limit('order-submit', 10, 60);

    $data = body();

    $customerName = str_field($data['customerName'] ?? '', 'Full name', 100, true);
    $phone        = str_field($data['phoneNumber'] ?? '', 'Phone number', 20, true);
    $city         = str_field($data['city'] ?? '', 'City', 64, true);
    $address      = str_field($data['address'] ?? '', 'Address', 500, true);
    $note         = str_field($data['note'] ?? '', 'Note', 1000);
    $items        = is_array($data['items'] ?? null) ? $data['items'] : [];

    if (!preg_match('/^07[0-9]{9}$/', $phone)) {
        fail(400, 'invalid phone number');
    }
    if (!in_array($city, IRAQ_CITIES, true)) {
        fail(400, 'we do not deliver to that city');
    }
    if (empty($items)) {
        fail(400, 'cart is empty');
    }
    if (count($items) > MAX_LINES_PER_ORDER) {
        fail(400, 'too many different items in one order');
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
            $qty       = min(MAX_QTY_PER_LINE, max(1, (int) ($line['quantity'] ?? 1)));

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

        $tracking = generate_tracking_number();
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

    // Tracking numbers are unguessable, and this makes grinding through
    // them pointless as well as useless.
    rate_limit('order-track', 30, 15);

    $code = strtoupper(str_field($_GET['code'] ?? '', 'Tracking number', 40, true));

    $stmt = db()->prepare('SELECT id FROM orders WHERE tracking_number = ?');
    $stmt->execute([$code]);
    $row = $stmt->fetch();

    if (!$row) {
        json_out(['order' => null]);
    }

    // The tracking page never shows the phone number, so it is not sent.
    // Whoever holds the code can already see the name and address they
    // typed; there is no reason to hand out anything beyond that.
    $order = fetch_order((int) $row['id']);
    unset($order['phoneNumber'], $order['deliveryPhone']);
    json_out(['order' => $order]);
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
    if (!in_array($status, ['Pending', 'Delivering', 'Delivered', 'Canceled'], true)) {
        fail(400, 'unknown status');
    }
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
    $courier      = str_field($data['deliveryPerson'] ?? '', 'Courier name', 100);
    $courierPhone = str_field($data['deliveryPhone'] ?? '', 'Courier phone', 20);

    if ($status === 'Delivering' && $courier === '') {
        fail(400, 'courier name is required to ship');
    }
    if ($courierPhone !== '' && !preg_match('/^07[0-9]{9}$/', $courierPhone)) {
        fail(400, 'invalid courier phone number');
    }

    $sets = ['status = ?'];
    $params = [$status];
    if ($courier !== '') {
        $sets[] = 'delivery_name = ?';
        $params[] = $courier;
    }
    if ($courierPhone !== '') {
        $sets[] = 'delivery_phone = ?';
        $params[] = $courierPhone;
    }
    $params[] = $orderId;

    db()->prepare('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

    $updated = fetch_order($orderId);
    if (!$updated) fail(404, 'order not found');
    json_out($updated);
}

fail(400, 'unknown action');
