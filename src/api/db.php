<?php
// Kết nối MySQL PDO và khởi tạo schema

function sendJson(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getDbConnection(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = require __DIR__ . '/config.php';
    $host = $cfg['host'] ?? '127.0.0.1';
    $port = $cfg['port'] ?? '3306';
    $dbname = $cfg['dbname'] ?? 'mevabe_db';
    $username = $cfg['username'] ?? 'root';
    $password = $cfg['password'] ?? '';
    $charset = $cfg['charset'] ?? 'utf8mb4';

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $dsnWithDb = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";
    try {
        $pdo = new PDO($dsnWithDb, $username, $password, $options);
    } catch (PDOException $e) {
        // SQLSTATE[HY000] [1049] Unknown database -> tự tạo DB cho lần chạy đầu trên XAMPP
        if ((int) $e->getCode() === 1049 || strpos($e->getMessage(), '1049') !== false) {
            $dsnNoDb = "mysql:host={$host};port={$port};charset={$charset}";
            $initPdo = new PDO($dsnNoDb, $username, $password, $options);
            $safeDb = str_replace('`', '', $dbname);
            $initPdo->exec("CREATE DATABASE IF NOT EXISTS `{$safeDb}` CHARACTER SET {$charset} COLLATE {$charset}_unicode_ci");
            $pdo = new PDO($dsnWithDb, $username, $password, $options);
        } else {
            throw $e;
        }
    }

    ensureDatabaseSchema($pdo);
    return $pdo;
}

function ensureDatabaseSchema(PDO $pdo): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $ddl = [
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            fullname VARCHAR(150) NOT NULL DEFAULT '',
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('khachhang', 'nhanvien', 'chucoso') NOT NULL DEFAULT 'khachhang',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL UNIQUE,
            email VARCHAR(150) NOT NULL UNIQUE,
            fullname VARCHAR(150) NOT NULL DEFAULT '',
            phone VARCHAR(30) NOT NULL DEFAULT '',
            dob VARCHAR(30) NOT NULL DEFAULT '',
            address VARCHAR(255) NOT NULL DEFAULT '',
            avatar LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_customers_user
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL UNIQUE,
            email VARCHAR(150) NOT NULL UNIQUE,
            name VARCHAR(150) NOT NULL DEFAULT '',
            phone VARCHAR(30) NOT NULL DEFAULT '',
            staff_role VARCHAR(150) NOT NULL DEFAULT '',
            area VARCHAR(255) NOT NULL DEFAULT '',
            avatar LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_staff_user
                FOREIGN KEY (user_id) REFERENCES users(id)
                ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS services (
            id VARCHAR(80) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(120) NOT NULL DEFAULT 'Chăm sóc Mẹ',
            target VARCHAR(120) NOT NULL DEFAULT 'Mẹ sau sinh',
            location VARCHAR(120) NOT NULL DEFAULT 'Tại nhà',
            duration VARCHAR(80) NOT NULL DEFAULT '60 phút',
            price BIGINT NOT NULL DEFAULT 0,
            original_price BIGINT NOT NULL DEFAULT 0,
            discount INT NOT NULL DEFAULT 0,
            rating DECIMAL(3,1) NOT NULL DEFAULT 5.0,
            spec_badge VARCHAR(120) NOT NULL DEFAULT '',
            sale_tag VARCHAR(120) NOT NULL DEFAULT '',
            art_type VARCHAR(80) NOT NULL DEFAULT 'mom-spa',
            art_bg VARCHAR(30) NOT NULL DEFAULT '#fff1f6',
            art_accent VARCHAR(30) NOT NULL DEFAULT '#ff4d8d',
            short_desc TEXT,
            description TEXT,
            benefits LONGTEXT,
            image LONGTEXT,
            sort_order INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(80) PRIMARY KEY,
            code VARCHAR(40) NOT NULL,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(120) NOT NULL DEFAULT 'Sữa & Dinh dưỡng',
            age_group VARCHAR(120) NOT NULL DEFAULT '0 - 6 tháng',
            product_type VARCHAR(120) NOT NULL DEFAULT 'Hộp / Lon',
            shipping VARCHAR(120) NOT NULL DEFAULT 'Siêu tốc 1H',
            freeship TINYINT(1) NOT NULL DEFAULT 1,
            rating DECIMAL(3,1) NOT NULL DEFAULT 5.0,
            price BIGINT NOT NULL DEFAULT 0,
            original_price BIGINT NOT NULL DEFAULT 0,
            discount INT NOT NULL DEFAULT 0,
            spec_badge VARCHAR(120) NOT NULL DEFAULT '',
            sale_tag VARCHAR(120) NOT NULL DEFAULT '',
            gift VARCHAR(255) NOT NULL DEFAULT '',
            art_type VARCHAR(80) NOT NULL DEFAULT 'milk-can',
            art_bg VARCHAR(30) NOT NULL DEFAULT '#fff1f6',
            art_accent VARCHAR(30) NOT NULL DEFAULT '#ff4d8d',
            description TEXT,
            image LONGTEXT,
            sort_order INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS shifts (
            id VARCHAR(80) PRIMARY KEY,
            shift_date VARCHAR(20) NOT NULL,
            week_start VARCHAR(20) NOT NULL DEFAULT '',
            day_name VARCHAR(40) NOT NULL DEFAULT '',
            shift_key VARCHAR(20) NOT NULL,
            shift_time VARCHAR(80) NOT NULL DEFAULT '',
            staff_name VARCHAR(150) NOT NULL DEFAULT '',
            staff_phone VARCHAR(30) NOT NULL DEFAULT '',
            staff_email VARCHAR(150) NOT NULL DEFAULT '',
            created_at VARCHAR(50) NOT NULL DEFAULT ''
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS service_bookings (
            id VARCHAR(80) PRIMARY KEY,
            service_id VARCHAR(80) NOT NULL DEFAULT '',
            service_name VARCHAR(255) NOT NULL DEFAULT '',
            booking_date VARCHAR(40) NOT NULL DEFAULT '',
            booked_at VARCHAR(50) NOT NULL DEFAULT '',
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            confirmed_by VARCHAR(150) NOT NULL DEFAULT '',
            confirmed_by_email VARCHAR(150) NOT NULL DEFAULT '',
            confirmed_by_phone VARCHAR(30) NOT NULL DEFAULT '',
            confirmed_at VARCHAR(50) NOT NULL DEFAULT '',
            recalled_by VARCHAR(150) NOT NULL DEFAULT '',
            recalled_by_email VARCHAR(150) NOT NULL DEFAULT '',
            recalled_by_phone VARCHAR(30) NOT NULL DEFAULT '',
            recalled_at VARCHAR(50) NOT NULL DEFAULT '',
            recall_message TEXT,
            recall_seen_by_customer TINYINT(1) NOT NULL DEFAULT 1,
            customer_email VARCHAR(150) NOT NULL DEFAULT '',
            customer_name VARCHAR(150) NOT NULL DEFAULT '',
            customer_phone VARCHAR(30) NOT NULL DEFAULT '',
            sort_order INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS product_orders (
            code VARCHAR(50) PRIMARY KEY,
            order_date VARCHAR(40) NOT NULL DEFAULT '',
            ordered_at VARCHAR(50) NOT NULL DEFAULT '',
            customer_email VARCHAR(150) NOT NULL DEFAULT '',
            customer_name VARCHAR(150) NOT NULL DEFAULT '',
            customer_phone VARCHAR(30) NOT NULL DEFAULT '',
            customer_address VARCHAR(255) NOT NULL DEFAULT '',
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            confirmed_by VARCHAR(150) NOT NULL DEFAULT '',
            confirmed_by_email VARCHAR(150) NOT NULL DEFAULT '',
            confirmed_by_phone VARCHAR(30) NOT NULL DEFAULT '',
            confirmed_at VARCHAR(50) NOT NULL DEFAULT '',
            recalled_by VARCHAR(150) NOT NULL DEFAULT '',
            recalled_by_email VARCHAR(150) NOT NULL DEFAULT '',
            recalled_by_phone VARCHAR(30) NOT NULL DEFAULT '',
            recalled_at VARCHAR(50) NOT NULL DEFAULT '',
            recall_message TEXT,
            recall_seen_by_customer TINYINT(1) NOT NULL DEFAULT 1,
            total_amount BIGINT NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS product_order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_code VARCHAR(50) NOT NULL,
            product_id VARCHAR(80) NOT NULL DEFAULT '',
            product_code VARCHAR(40) NOT NULL DEFAULT '',
            product_name VARCHAR(255) NOT NULL DEFAULT '',
            price BIGINT NOT NULL DEFAULT 0,
            qty INT NOT NULL DEFAULT 1,
            CONSTRAINT fk_order_items_order
                FOREIGN KEY (order_code) REFERENCES product_orders(code)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS cart_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(150) NOT NULL,
            product_id VARCHAR(80) NOT NULL,
            product_code VARCHAR(40) NOT NULL DEFAULT '',
            product_name VARCHAR(255) NOT NULL DEFAULT '',
            price BIGINT NOT NULL DEFAULT 0,
            qty INT NOT NULL DEFAULT 1,
            INDEX idx_cart_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS app_meta (
            meta_key VARCHAR(80) PRIMARY KEY,
            meta_value TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($ddl as $sql) {
        $pdo->exec($sql);
    }

    // Đảm bảo luôn có tài khoản Chủ Cơ Sở mặc định nếu chưa có tài khoản quản trị nào
    $ownerCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'chucoso'")->fetchColumn();
    if ($ownerCount === 0) {
        $stmt = $pdo->prepare(
            "INSERT IGNORE INTO users (fullname, email, password, role) VALUES (?, ?, ?, 'chucoso')"
        );
        $stmt->execute(['Chủ Cơ Sở', 'admin', 'admin']);
    }
}
