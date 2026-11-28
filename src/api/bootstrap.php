<?php
// Nạp dữ liệu từ MySQL

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJson(['ok' => false, 'error' => 'Method not allowed'], 405);
}

try {
    $pdo = getDbConnection();

    // Trạng thái seed dữ liệu gốc
    $seededMeta = $pdo->query("SELECT meta_value FROM app_meta WHERE meta_key = 'seeded' LIMIT 1")->fetchColumn();
    $serviceCount = (int) $pdo->query("SELECT COUNT(*) FROM services")->fetchColumn();
    $productCount = (int) $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $seeded = ($seededMeta === '1') || $serviceCount > 0 || $productCount > 0;

    // 1. Tài khoản + thông tin khách hàng / nhân viên
    $userRows = $pdo->query("
        SELECT
            u.id,
            u.fullname,
            u.email,
            u.password,
            u.role,
            c.fullname AS cust_fullname,
            c.phone AS cust_phone,
            c.dob AS cust_dob,
            c.address AS cust_address,
            c.avatar AS cust_avatar,
            s.name AS staff_name,
            s.phone AS staff_phone,
            s.staff_role AS staff_role,
            s.area AS staff_area,
            s.avatar AS staff_avatar
        FROM users u
        LEFT JOIN customers c ON c.user_id = u.id OR LOWER(c.email) = LOWER(u.email)
        LEFT JOIN staff s ON s.user_id = u.id OR LOWER(s.email) = LOWER(u.email)
        ORDER BY u.id ASC
    ")->fetchAll();

    $users = [];
    foreach ($userRows as $row) {
        $role = $row['role'];
        $item = [
            'fullname' => $row['fullname'] !== '' ? $row['fullname'] : ($role === 'khachhang' ? ($row['cust_fullname'] ?? '') : ($row['staff_name'] ?? '')),
            'email' => $row['email'],
            'password' => $row['password'],
            'role' => $role,
        ];
        if ($role === 'khachhang') {
            $item['phone'] = $row['cust_phone'] ?? '';
            $item['dob'] = $row['cust_dob'] ?? '';
            $item['address'] = $row['cust_address'] ?? '';
            $item['avatar'] = $row['cust_avatar'] ?? '';
        } elseif ($role === 'nhanvien') {
            $item['phone'] = $row['staff_phone'] ?? '';
            $item['staffRole'] = $row['staff_role'] ?? '';
            $item['area'] = $row['staff_area'] ?? '';
            $item['avatar'] = $row['staff_avatar'] ?? '';
        }
        $users[] = $item;
    }

    // 2. Danh sách nhân viên cơ sở
    $staffRows = $pdo->query("SELECT email, name, phone, staff_role, area, avatar FROM staff ORDER BY id ASC")->fetchAll();
    $staff = [];
    foreach ($staffRows as $row) {
        $staff[] = [
            'email' => $row['email'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'role' => $row['staff_role'],
            'area' => $row['area'],
            'avatar' => $row['avatar'] ?? '',
        ];
    }

    // 3. Danh mục dịch vụ
    $serviceRows = $pdo->query("SELECT * FROM services ORDER BY sort_order ASC, id ASC")->fetchAll();
    $services = [];
    foreach ($serviceRows as $row) {
        $benefits = json_decode($row['benefits'] ?? '[]', true);
        $services[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'target' => $row['target'],
            'location' => $row['location'],
            'duration' => $row['duration'],
            'price' => (int) $row['price'],
            'originalPrice' => (int) $row['original_price'],
            'discount' => (int) $row['discount'],
            'rating' => (float) $row['rating'],
            'specBadge' => $row['spec_badge'],
            'saleTag' => $row['sale_tag'],
            'artType' => $row['art_type'],
            'artBg' => $row['art_bg'],
            'artAccent' => $row['art_accent'],
            'shortDesc' => $row['short_desc'] ?? '',
            'desc' => $row['description'] ?? '',
            'benefits' => is_array($benefits) ? $benefits : [],
            'image' => $row['image'] ?? '',
        ];
    }

    // 4. Danh mục sản phẩm
    $productRows = $pdo->query("SELECT * FROM products ORDER BY sort_order ASC, code ASC")->fetchAll();
    $products = [];
    foreach ($productRows as $row) {
        $products[] = [
            'id' => $row['id'],
            'code' => $row['code'],
            'name' => $row['name'],
            'category' => $row['category'],
            'age' => $row['age_group'],
            'type' => $row['product_type'],
            'shipping' => $row['shipping'],
            'freeship' => (bool) $row['freeship'],
            'rating' => (float) $row['rating'],
            'price' => (int) $row['price'],
            'originalPrice' => (int) $row['original_price'],
            'discount' => (int) $row['discount'],
            'specBadge' => $row['spec_badge'],
            'saleTag' => $row['sale_tag'],
            'gift' => $row['gift'],
            'artType' => $row['art_type'],
            'artBg' => $row['art_bg'],
            'artAccent' => $row['art_accent'],
            'desc' => $row['description'] ?? '',
            'image' => $row['image'] ?? '',
        ];
    }

    // 5. Lịch ca trực
    $shiftRows = $pdo->query("SELECT * FROM shifts ORDER BY shift_date ASC, id ASC")->fetchAll();
    $shifts = [];
    foreach ($shiftRows as $row) {
        $shifts[] = [
            'id' => $row['id'],
            'date' => $row['shift_date'],
            'weekStart' => $row['week_start'],
            'day' => $row['day_name'],
            'shiftKey' => $row['shift_key'],
            'time' => $row['shift_time'],
            'staff' => $row['staff_name'],
            'staffPhone' => $row['staff_phone'],
            'staffEmail' => $row['staff_email'],
            'createdAt' => $row['created_at'],
        ];
    }

    // 6. Đăng ký dịch vụ
    $bookingRows = $pdo->query("SELECT * FROM service_bookings ORDER BY sort_order ASC")->fetchAll();
    $serviceBookings = [];
    foreach ($bookingRows as $row) {
        $serviceBookings[] = [
            'id' => $row['id'],
            'serviceId' => $row['service_id'],
            'name' => $row['service_name'],
            'date' => $row['booking_date'],
            'bookedAt' => $row['booked_at'],
            'status' => $row['status'],
            'confirmedBy' => $row['confirmed_by'],
            'confirmedByEmail' => $row['confirmed_by_email'],
            'confirmedByPhone' => $row['confirmed_by_phone'],
            'confirmedAt' => $row['confirmed_at'],
            'recalledBy' => $row['recalled_by'],
            'recalledByEmail' => $row['recalled_by_email'],
            'recalledByPhone' => $row['recalled_by_phone'],
            'recalledAt' => $row['recalled_at'],
            'recallMessage' => $row['recall_message'] ?? '',
            'recallSeenByCustomer' => (bool) $row['recall_seen_by_customer'],
            'customerEmail' => $row['customer_email'],
            'customerName' => $row['customer_name'],
            'customerPhone' => $row['customer_phone'],
        ];
    }

    // 7. Đơn hàng sản phẩm + chi tiết mặt hàng
    $orderRows = $pdo->query("SELECT * FROM product_orders ORDER BY sort_order ASC")->fetchAll();
    $orderItemRows = $pdo->query("SELECT * FROM product_order_items ORDER BY id ASC")->fetchAll();
    $itemsByOrder = [];
    foreach ($orderItemRows as $it) {
        $codeKey = $it['order_code'];
        if (!isset($itemsByOrder[$codeKey])) {
            $itemsByOrder[$codeKey] = [];
        }
        $itemsByOrder[$codeKey][] = [
            'id' => $it['product_id'],
            'code' => $it['product_code'],
            'name' => $it['product_name'],
            'price' => (int) $it['price'],
            'qty' => (int) $it['qty'],
        ];
    }

    $productOrders = [];
    foreach ($orderRows as $row) {
        $code = $row['code'];
        $productOrders[] = [
            'code' => $code,
            'date' => $row['order_date'],
            'orderedAt' => $row['ordered_at'],
            'customerEmail' => $row['customer_email'],
            'customerName' => $row['customer_name'],
            'customerPhone' => $row['customer_phone'],
            'customerAddress' => $row['customer_address'],
            'items' => $itemsByOrder[$code] ?? [],
            'status' => $row['status'],
            'confirmedBy' => $row['confirmed_by'],
            'confirmedByEmail' => $row['confirmed_by_email'],
            'confirmedByPhone' => $row['confirmed_by_phone'],
            'confirmedAt' => $row['confirmed_at'],
            'recalledBy' => $row['recalled_by'],
            'recalledByEmail' => $row['recalled_by_email'],
            'recalledByPhone' => $row['recalled_by_phone'],
            'recalledAt' => $row['recalled_at'],
            'recallMessage' => $row['recall_message'] ?? '',
            'recallSeenByCustomer' => (bool) $row['recall_seen_by_customer'],
            'totalAmount' => (int) $row['total_amount'],
        ];
    }

    // 8. Giỏ hàng theo tài khoản
    $cartRows = $pdo->query("SELECT * FROM cart_items ORDER BY id ASC")->fetchAll();
    $cartsByEmail = [];
    foreach ($cartRows as $row) {
        $emailKey = strtolower(trim($row['user_email']));
        if (!isset($cartsByEmail[$emailKey])) {
            $cartsByEmail[$emailKey] = [];
        }
        $cartsByEmail[$emailKey][] = [
            'id' => $row['product_id'],
            'code' => $row['product_code'],
            'name' => $row['product_name'],
            'price' => (int) $row['price'],
            'qty' => (int) $row['qty'],
        ];
    }

    sendJson([
        'ok' => true,
        'engine' => 'mysql',
        'seeded' => $seeded,
        'data' => [
            'users' => $users,
            'staff' => $staff,
            'services' => $services,
            'products' => $products,
            'shifts' => $shifts,
            'serviceBookings' => $serviceBookings,
            'productOrders' => $productOrders,
            'cartsByEmail' => $cartsByEmail,
        ],
    ]);
} catch (Throwable $e) {
    sendJson([
        'ok' => false,
        'error' => $e->getMessage(),
    ], 500);
}
