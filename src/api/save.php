<?php
// Lưu đồng bộ dữ liệu từng thực thể vào MySQL

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '{}', true);
if (!is_array($payload) || empty($payload['entity'])) {
    sendJson(['ok' => false, 'error' => 'Invalid JSON payload'], 400);
}

$entity = (string) $payload['entity'];
$data = isset($payload['data']) && is_array($payload['data']) ? $payload['data'] : [];
$targetEmail = strtolower(trim((string) ($payload['email'] ?? '')));

// Tạo khóa duy nhất cho bản ghi
function uniqueRecordKey(array &$seen, string $rawKey, string $prefix, int $idx): string
{
    $key = trim($rawKey);
    if ($key === '' || isset($seen[$key])) {
        $key = $prefix . ($idx + 1) . '-' . substr(md5((string) $idx), 0, 4);
    }
    $seen[$key] = true;
    return $key;
}

function recallSeenFlag(array $record): int
{
    return (array_key_exists('recallSeenByCustomer', $record) && $record['recallSeenByCustomer'] === false) ? 0 : 1;
}

// Đánh dấu đã khởi tạo dữ liệu gốc
function markDatabaseSeeded(PDO $pdo): void
{
    $stmt = $pdo->prepare(
        "INSERT INTO app_meta (meta_key, meta_value) VALUES ('seeded', '1')
         ON DUPLICATE KEY UPDATE meta_value = '1'"
    );
    $stmt->execute();
}

// Đồng bộ tài khoản, khách hàng và nhân viên
function syncUsersEntity(PDO $pdo, array $users): void
{
    $existingUsers = $pdo->query("SELECT id, email, role FROM users")->fetchAll();
    $existingUserMap = [];
    $prevStaffUserEmails = [];
    foreach ($existingUsers as $eu) {
        $low = strtolower(trim($eu['email']));
        $existingUserMap[$low] = (int) $eu['id'];
        if ($eu['role'] === 'nhanvien') {
            $prevStaffUserEmails[$low] = true;
        }
    }

    $existingStaffByEmail = [];
    foreach ($pdo->query("SELECT * FROM staff")->fetchAll() as $sr) {
        $existingStaffByEmail[strtolower(trim($sr['email']))] = $sr;
    }

    $activeEmails = [];
    $activeCustomerEmails = [];
    $activeStaffUserEmails = [];

    $stmtUpdateUser = $pdo->prepare("UPDATE users SET fullname = ?, email = ?, password = ?, role = ? WHERE id = ?");
    $stmtInsertUser = $pdo->prepare("INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)");

    $stmtUpsertCustomer = $pdo->prepare("
        INSERT INTO customers (user_id, email, fullname, phone, dob, address, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id), email = VALUES(email), fullname = VALUES(fullname),
            phone = VALUES(phone), dob = VALUES(dob), address = VALUES(address), avatar = VALUES(avatar)
    ");

    $stmtUpsertStaff = $pdo->prepare("
        INSERT INTO staff (user_id, email, name, phone, staff_role, area, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id), email = VALUES(email), name = VALUES(name),
            phone = VALUES(phone), staff_role = VALUES(staff_role), area = VALUES(area), avatar = VALUES(avatar)
    ");

    foreach ($users as $u) {
        if (!is_array($u) || empty($u['email'])) {
            continue;
        }
        $email = trim((string) $u['email']);
        $lowEmail = strtolower($email);
        $fullname = (string) ($u['fullname'] ?? '');
        $password = (string) ($u['password'] ?? '');
        $role = in_array($u['role'] ?? '', ['khachhang', 'nhanvien', 'chucoso'], true) ? $u['role'] : 'khachhang';

        $activeEmails[$lowEmail] = true;

        if (isset($existingUserMap[$lowEmail])) {
            $userId = $existingUserMap[$lowEmail];
            $stmtUpdateUser->execute([$fullname, $email, $password, $role, $userId]);
        } else {
            $stmtInsertUser->execute([$fullname, $email, $password, $role]);
            $userId = (int) $pdo->lastInsertId();
            $existingUserMap[$lowEmail] = $userId;
        }

        if ($role === 'khachhang') {
            $activeCustomerEmails[$lowEmail] = true;
            $stmtUpsertCustomer->execute([
                $userId, $email, $fullname,
                (string) ($u['phone'] ?? ''),
                (string) ($u['dob'] ?? ''),
                (string) ($u['address'] ?? ''),
                (string) ($u['avatar'] ?? ''),
            ]);
        } elseif ($role === 'nhanvien') {
            $activeStaffUserEmails[$lowEmail] = true;
            $prevStaff = $existingStaffByEmail[$lowEmail] ?? [];
            $stmtUpsertStaff->execute([
                $userId, $email,
                $fullname !== '' ? $fullname : ($prevStaff['name'] ?? 'Nhân viên'),
                array_key_exists('phone', $u) ? (string) $u['phone'] : (string) ($prevStaff['phone'] ?? ''),
                array_key_exists('staffRole', $u) ? (string) $u['staffRole'] : (string) ($prevStaff['staff_role'] ?? ''),
                array_key_exists('area', $u) ? (string) $u['area'] : (string) ($prevStaff['area'] ?? ''),
                array_key_exists('avatar', $u) ? (string) $u['avatar'] : (string) ($prevStaff['avatar'] ?? ''),
            ]);
        }
    }

    $stmtDelCust = $pdo->prepare("DELETE FROM customers WHERE id = ?");
    foreach ($pdo->query("SELECT id, email FROM customers")->fetchAll() as $c) {
        if (!isset($activeCustomerEmails[strtolower(trim($c['email']))])) {
            $stmtDelCust->execute([(int) $c['id']]);
        }
    }

    $stmtDelStaffByEmail = $pdo->prepare("DELETE FROM staff WHERE LOWER(email) = ?");
    foreach ($prevStaffUserEmails as $oldLowEmail => $_) {
        if (!isset($activeStaffUserEmails[$oldLowEmail])) {
            $stmtDelStaffByEmail->execute([$oldLowEmail]);
        }
    }

    $stmtDelUser = $pdo->prepare("DELETE FROM users WHERE id = ?");
    foreach ($existingUserMap as $low => $uid) {
        if (!isset($activeEmails[$low])) {
            $stmtDelUser->execute([$uid]);
        }
    }
}

// Đồng bộ danh sách nhân viên
function syncStaffEntity(PDO $pdo, array $staffList): void
{
    $userIdByEmail = [];
    foreach ($pdo->query("SELECT id, email FROM users")->fetchAll() as $u) {
        $userIdByEmail[strtolower(trim($u['email']))] = (int) $u['id'];
    }

    $pdo->exec("DELETE FROM staff");
    $stmtIns = $pdo->prepare(
        "INSERT INTO staff (user_id, email, name, phone, staff_role, area, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmtUpdUserName = $pdo->prepare("UPDATE users SET fullname = ? WHERE id = ? AND role = 'nhanvien'");

    $seenEmails = [];
    foreach ($staffList as $idx => $st) {
        if (!is_array($st)) {
            continue;
        }
        $email = trim((string) ($st['email'] ?? ''));
        if ($email === '') {
            $email = 'staff_' . ($idx + 1) . '@local';
        }
        $low = strtolower($email);
        if (isset($seenEmails[$low])) {
            continue;
        }
        $seenEmails[$low] = true;

        $name = (string) ($st['name'] ?? '');
        $uid = $userIdByEmail[$low] ?? null;

        $stmtIns->execute([
            $uid, $email, $name,
            (string) ($st['phone'] ?? ''),
            (string) ($st['role'] ?? ''),
            (string) ($st['area'] ?? ''),
            (string) ($st['avatar'] ?? ''),
        ]);

        if ($uid !== null && $name !== '') {
            $stmtUpdUserName->execute([$name, $uid]);
        }
    }
}

// Đồng bộ dịch vụ
function syncServicesEntity(PDO $pdo, array $services): void
{
    $pdo->exec("DELETE FROM services");
    $stmt = $pdo->prepare("
        INSERT INTO services (
            id, name, category, target, location, duration, price, original_price,
            discount, rating, spec_badge, sale_tag, art_type, art_bg, art_accent,
            short_desc, description, benefits, image, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $seen = [];
    foreach ($services as $idx => $s) {
        if (!is_array($s)) {
            continue;
        }
        $id = uniqueRecordKey($seen, (string) ($s['id'] ?? ''), 'dv-', $idx);
        $benefitsJson = json_encode(is_array($s['benefits'] ?? null) ? array_values($s['benefits']) : [], JSON_UNESCAPED_UNICODE);

        $stmt->execute([
            $id,
            (string) ($s['name'] ?? ''),
            (string) ($s['category'] ?? 'Chăm sóc Mẹ'),
            (string) ($s['target'] ?? 'Mẹ sau sinh'),
            (string) ($s['location'] ?? 'Tại nhà'),
            (string) ($s['duration'] ?? '60 phút'),
            (int) ($s['price'] ?? 0),
            (int) ($s['originalPrice'] ?? 0),
            (int) ($s['discount'] ?? 0),
            (float) ($s['rating'] ?? 5.0),
            (string) ($s['specBadge'] ?? ''),
            (string) ($s['saleTag'] ?? ''),
            (string) ($s['artType'] ?? 'mom-spa'),
            (string) ($s['artBg'] ?? '#fff1f6'),
            (string) ($s['artAccent'] ?? '#ff4d8d'),
            (string) ($s['shortDesc'] ?? ''),
            (string) ($s['desc'] ?? ''),
            $benefitsJson ?: '[]',
            (string) ($s['image'] ?? ''),
            (int) $idx,
        ]);
    }
    markDatabaseSeeded($pdo);
}

// Đồng bộ sản phẩm và hình ảnh
function syncProductsEntity(PDO $pdo, array $products): void
{
    $pdo->exec("DELETE FROM products");
    $stmt = $pdo->prepare("
        INSERT INTO products (
            id, code, name, category, age_group, product_type, shipping, freeship,
            rating, price, original_price, discount, spec_badge, sale_tag, gift,
            art_type, art_bg, art_accent, description, image, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $seen = [];
    foreach ($products as $idx => $p) {
        if (!is_array($p)) {
            continue;
        }
        $code = trim((string) ($p['code'] ?? ''));
        $rawId = trim((string) ($p['id'] ?? ($code !== '' ? $code : str_pad((string) ($idx + 1), 3, '0', STR_PAD_LEFT))));
        $id = uniqueRecordKey($seen, $rawId, 'sp-', $idx);
        if ($code === '') {
            $code = $id;
        }

        $stmt->execute([
            $id, $code,
            (string) ($p['name'] ?? ''),
            (string) ($p['category'] ?? 'Sữa & Dinh dưỡng'),
            (string) ($p['age'] ?? '0 - 6 tháng'),
            (string) ($p['type'] ?? 'Hộp / Lon'),
            (string) ($p['shipping'] ?? 'Siêu tốc 1H'),
            !empty($p['freeship']) ? 1 : 0,
            (float) ($p['rating'] ?? 5.0),
            (int) ($p['price'] ?? 0),
            (int) ($p['originalPrice'] ?? 0),
            (int) ($p['discount'] ?? 0),
            (string) ($p['specBadge'] ?? ''),
            (string) ($p['saleTag'] ?? ''),
            (string) ($p['gift'] ?? ''),
            (string) ($p['artType'] ?? 'milk-can'),
            (string) ($p['artBg'] ?? '#fff1f6'),
            (string) ($p['artAccent'] ?? '#ff4d8d'),
            (string) ($p['desc'] ?? ''),
            (string) ($p['image'] ?? ''),
            (int) $idx,
        ]);
    }
    markDatabaseSeeded($pdo);
}

// Đồng bộ ca trực
function syncShiftsEntity(PDO $pdo, array $shifts): void
{
    $pdo->exec("DELETE FROM shifts");
    $stmt = $pdo->prepare("
        INSERT INTO shifts (
            id, shift_date, week_start, day_name, shift_key, shift_time,
            staff_name, staff_phone, staff_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $seen = [];
    foreach ($shifts as $idx => $s) {
        if (!is_array($s)) {
            continue;
        }
        $id = uniqueRecordKey($seen, (string) ($s['id'] ?? ''), 'shift_', $idx);
        $stmt->execute([
            $id,
            (string) ($s['date'] ?? ''),
            (string) ($s['weekStart'] ?? ''),
            (string) ($s['day'] ?? ''),
            (string) ($s['shiftKey'] ?? 'sang'),
            (string) ($s['time'] ?? ''),
            (string) ($s['staff'] ?? ''),
            (string) ($s['staffPhone'] ?? ''),
            (string) ($s['staffEmail'] ?? ''),
            (string) ($s['createdAt'] ?? ''),
        ]);
    }
}

// Đồng bộ đăng ký dịch vụ
function syncServiceBookingsEntity(PDO $pdo, array $bookings): void
{
    $pdo->exec("DELETE FROM service_bookings");
    $stmt = $pdo->prepare("
        INSERT INTO service_bookings (
            id, service_id, service_name, booking_date, booked_at, status,
            confirmed_by, confirmed_by_email, confirmed_by_phone, confirmed_at,
            recalled_by, recalled_by_email, recalled_by_phone, recalled_at,
            recall_message, recall_seen_by_customer,
            customer_email, customer_name, customer_phone, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $seen = [];
    foreach ($bookings as $idx => $b) {
        if (!is_array($b)) {
            continue;
        }
        $id = uniqueRecordKey($seen, (string) ($b['id'] ?? ''), 'bk_', $idx);
        $stmt->execute([
            $id,
            (string) ($b['serviceId'] ?? ''),
            (string) ($b['name'] ?? ''),
            (string) ($b['date'] ?? ''),
            (string) ($b['bookedAt'] ?? ''),
            (string) ($b['status'] ?? 'pending'),
            (string) ($b['confirmedBy'] ?? ''),
            (string) ($b['confirmedByEmail'] ?? ''),
            (string) ($b['confirmedByPhone'] ?? ''),
            (string) ($b['confirmedAt'] ?? ''),
            (string) ($b['recalledBy'] ?? ''),
            (string) ($b['recalledByEmail'] ?? ''),
            (string) ($b['recalledByPhone'] ?? ''),
            (string) ($b['recalledAt'] ?? ''),
            (string) ($b['recallMessage'] ?? ''),
            recallSeenFlag($b),
            (string) ($b['customerEmail'] ?? ''),
            (string) ($b['customerName'] ?? ''),
            (string) ($b['customerPhone'] ?? ''),
            (int) $idx,
        ]);
    }
}

// Đồng bộ đơn hàng sản phẩm
function syncProductOrdersEntity(PDO $pdo, array $orders): void
{
    $pdo->exec("DELETE FROM product_order_items");
    $pdo->exec("DELETE FROM product_orders");

    $stmtOrder = $pdo->prepare("
        INSERT INTO product_orders (
            code, order_date, ordered_at, customer_email, customer_name, customer_phone,
            customer_address, status, confirmed_by, confirmed_by_email, confirmed_by_phone,
            confirmed_at, recalled_by, recalled_by_email, recalled_by_phone, recalled_at,
            recall_message, recall_seen_by_customer, total_amount, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmtItem = $pdo->prepare("
        INSERT INTO product_order_items (order_code, product_id, product_code, product_name, price, qty)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    $seenCodes = [];
    foreach ($orders as $idx => $ord) {
        if (!is_array($ord)) {
            continue;
        }
        $code = uniqueRecordKey($seenCodes, (string) ($ord['code'] ?? ''), 'DH-', $idx);

        $stmtOrder->execute([
            $code,
            (string) ($ord['date'] ?? ''),
            (string) ($ord['orderedAt'] ?? ''),
            (string) ($ord['customerEmail'] ?? ''),
            (string) ($ord['customerName'] ?? ''),
            (string) ($ord['customerPhone'] ?? ''),
            (string) ($ord['customerAddress'] ?? ''),
            (string) ($ord['status'] ?? 'pending'),
            (string) ($ord['confirmedBy'] ?? ''),
            (string) ($ord['confirmedByEmail'] ?? ''),
            (string) ($ord['confirmedByPhone'] ?? ''),
            (string) ($ord['confirmedAt'] ?? ''),
            (string) ($ord['recalledBy'] ?? ''),
            (string) ($ord['recalledByEmail'] ?? ''),
            (string) ($ord['recalledByPhone'] ?? ''),
            (string) ($ord['recalledAt'] ?? ''),
            (string) ($ord['recallMessage'] ?? ''),
            recallSeenFlag($ord),
            (int) ($ord['totalAmount'] ?? 0),
            (int) $idx,
        ]);

        foreach ((is_array($ord['items'] ?? null) ? $ord['items'] : []) as $it) {
            if (!is_array($it)) {
                continue;
            }
            $stmtItem->execute([
                $code,
                (string) ($it['id'] ?? ''),
                (string) ($it['code'] ?? ''),
                (string) ($it['name'] ?? ''),
                (int) ($it['price'] ?? 0),
                max(1, (int) ($it['qty'] ?? 1)),
            ]);
        }
    }
}

// Đồng bộ giỏ hàng
function syncCartEntity(PDO $pdo, string $email, array $cart): void
{
    $cleanEmail = $email !== '' ? $email : 'guest';
    $stmtDel = $pdo->prepare("DELETE FROM cart_items WHERE LOWER(user_email) = ?");
    $stmtDel->execute([$cleanEmail]);

    $stmtIns = $pdo->prepare("
        INSERT INTO cart_items (user_email, product_id, product_code, product_name, price, qty)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    foreach ($cart as $it) {
        if (!is_array($it) || empty($it['id'])) {
            continue;
        }
        $stmtIns->execute([
            $cleanEmail,
            (string) $it['id'],
            (string) ($it['code'] ?? ''),
            (string) ($it['name'] ?? ''),
            (int) ($it['price'] ?? 0),
            max(1, (int) ($it['qty'] ?? 1)),
        ]);
    }
}

try {
    $pdo = getDbConnection();
    $pdo->beginTransaction();

    switch ($entity) {
        case 'users': syncUsersEntity($pdo, $data); break;
        case 'staff': syncStaffEntity($pdo, $data); break;
        case 'services': syncServicesEntity($pdo, $data); break;
        case 'products': syncProductsEntity($pdo, $data); break;
        case 'shifts': syncShiftsEntity($pdo, $data); break;
        case 'serviceBookings': syncServiceBookingsEntity($pdo, $data); break;
        case 'productOrders': syncProductOrdersEntity($pdo, $data); break;
        case 'cart': syncCartEntity($pdo, $targetEmail, $data); break;
        case 'markSeeded': markDatabaseSeeded($pdo); break;
        default:
            $pdo->rollBack();
            sendJson(['ok' => false, 'error' => 'Unsupported entity: ' . $entity], 400);
    }

    $pdo->commit();
    sendJson(['ok' => true, 'entity' => $entity]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJson(['ok' => false, 'error' => $e->getMessage()], 500);
}
