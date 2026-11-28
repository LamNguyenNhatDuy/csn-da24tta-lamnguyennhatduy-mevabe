-- CSDL Website Chăm Sóc Mẹ & Bé (MySQL / MariaDB)

CREATE DATABASE IF NOT EXISTS mevabe_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mevabe_db;

-- 1. Bảng Tài khoản & Mật khẩu
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('khachhang', 'nhanvien', 'chucoso') NOT NULL DEFAULT 'khachhang',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Thông tin Khách hàng
CREATE TABLE IF NOT EXISTS customers (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Thông tin Nhân viên
CREATE TABLE IF NOT EXISTS staff (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Dịch vụ Mẹ & Bé
CREATE TABLE IF NOT EXISTS services (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Sản phẩm Mẹ & Bé
CREATE TABLE IF NOT EXISTS products (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Lịch Ca trực Nhân viên
CREATE TABLE IF NOT EXISTS shifts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Đăng ký Dịch vụ
CREATE TABLE IF NOT EXISTS service_bookings (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng Đơn hàng Sản phẩm
CREATE TABLE IF NOT EXISTS product_orders (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng Chi tiết Đơn hàng Sản phẩm
CREATE TABLE IF NOT EXISTS product_order_items (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng Giỏ hàng
CREATE TABLE IF NOT EXISTS cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(150) NOT NULL,
    product_id VARCHAR(80) NOT NULL,
    product_code VARCHAR(40) NOT NULL DEFAULT '',
    product_name VARCHAR(255) NOT NULL DEFAULT '',
    price BIGINT NOT NULL DEFAULT 0,
    qty INT NOT NULL DEFAULT 1,
    INDEX idx_cart_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng Cấu hình / Trạng thái hệ thống
CREATE TABLE IF NOT EXISTS app_meta (
    meta_key VARCHAR(80) PRIMARY KEY,
    meta_value TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- DỮ LIỆU MẪU BAN ĐẦU
-- =========================================================================

-- Tài khoản Chủ Cơ Sở mặc định
INSERT IGNORE INTO users (fullname, email, password, role)
VALUES ('Chủ Cơ Sở', 'admin', 'admin', 'chucoso');

-- 9 Dịch vụ chăm sóc Mẹ & Bé mặc định
INSERT IGNORE INTO services (id, name, category, target, location, duration, price, original_price, discount, rating, spec_badge, sale_tag, art_type, art_bg, art_accent, short_desc, description, benefits, image, sort_order) VALUES
('tam-be', 'Tắm & Massage Bé Sơ Sinh', 'Chăm sóc Bé', 'Bé sơ sinh', 'Tại nhà', '60 phút', 280000, 350000, 20, 5.0, '60p · Tại nhà', 'GIẢM -20%', 'baby-bath', '#eff6ff', '#0284c7', 'Giúp bé thư giãn, ngủ ngon, kích thích tiêu hóa và phát triển cơ xương an toàn tại nhà.', 'Dịch vụ chăm sóc toàn diện cho bé yêu trong những năm tháng đầu đời ngay tại nhà dưới sự hỗ trợ của điều dưỡng viên.', '["Kiểm tra sức khỏe tổng quát và vệ sinh rốn, mắt, mũi, tai.","Massage kích thích tiêu hóa, giúp bé ngủ sâu giấc.","Tắm nước ấm pha thảo dược an toàn."]', '', 0),
('me-sau-sinh', 'Chăm Sóc Phục Hồi Mẹ Sau Sinh', 'Chăm sóc Mẹ', 'Mẹ sau sinh', 'Tại nhà', '90 phút', 590000, 720000, 18, 4.9, '90p · Chuyên sâu', 'BÁN CHẠY', 'mom-spa', '#fff1f6', '#ff4d8d', 'Phục hồi sức khỏe, massage body giảm nhức mỏi, xông hơi và chăm sóc da chuyên sâu.', 'Liệu trình chăm sóc sức khỏe và sắc đẹp chuyên sâu giúp mẹ nhanh chóng lấy lại vóc dáng và làm dịu cơn đau nhức.', '["Massage body giảm đau mỏi lưng, cổ, vai, gáy.","Xông hơi thảo dược giải độc cơ thể.","Hỗ trợ quấn bụng định hình vóc dáng."]', '', 1),
('thong-sua', 'Thông Tắc Tia Sữa Chuyên Sâu', 'Chăm sóc Mẹ', 'Mẹ sau sinh', 'Tại nhà', '60 phút', 450000, 520000, 13, 5.0, 'Siêu âm · Không đau', 'CẤP TỐC 1H', 'milk-care', '#fdf2f8', '#db2777', 'Xử lý nhanh chóng, triệt để tình trạng căng tức sữa, tắc tia sữa giúp mẹ cho con bú thuận lợi.', 'Giải pháp nhanh chóng và không đau giúp khơi thông nguồn sữa mẹ, phòng ngừa viêm tuyến vú.', '["Ứng dụng công nghệ sóng siêu âm hiện đại.","Kỹ thuật day ấn huyệt chuyên nghiệp.","Tư vấn dinh dưỡng và cách cho con bú đúng cách."]', '', 2),
('boi-thuy-lieu', 'Bơi Thủy Liệu (Hydrotherapy)', 'Chăm sóc Bé', 'Bé sơ sinh', 'Tại cơ sở', '45 phút', 320000, 380000, 16, 4.9, '45p · Hồ riêng', 'YÊU THÍCH', 'hydro', '#ecfeff', '#0891b2', 'Giúp bé vận động từ sớm, phát triển chiều cao, tăng cường hệ miễn dịch và sự cứng cáp.', 'Phương pháp vận động dưới nước hiện đại giúp bé phát triển thể chất toàn diện từ giai đoạn sớm.', '["Tăng cường sự cứng cáp cho hệ cơ xương khớp.","Kích thích tuần hoàn máu và hệ hô hấp.","Giúp bé tự tin, mạnh dạn và ăn ngon miệng hơn."]', '', 3),
('massage-bau', 'Massage Bầu Thư Giãn', 'Chăm sóc Mẹ', 'Mẹ bầu', 'Tại nhà', '75 phút', 420000, 490000, 14, 4.9, '75p · Thảo dược', 'GIẢM -14%', 'prenatal', '#fdf4ff', '#a21caf', 'Giảm đau lưng, phù nề chân tay, giải tỏa căng thẳng cho mẹ trong suốt thai kỳ.', 'Liệu pháp chăm sóc đặc biệt dành riêng cho mẹ bầu nhằm xua tan mệt mỏi và phù nề thai kỳ.', '["Giảm đau nhức vùng thắt lưng và bắp chân.","Cải thiện chất lượng giấc ngủ cho mẹ bầu.","Tăng cường tuần hoàn máu nuôi dưỡng thai nhi tốt hơn."]', '', 4),
('kham-nhi', 'Khám Sức Khỏe Trẻ Sơ Sinh', 'Y tế & Dinh dưỡng', 'Bé sơ sinh', 'Tại nhà', '45 phút', 390000, 450000, 13, 5.0, 'Bác sĩ nhi', 'CHUYÊN KHOA', 'pediatric', '#ecfdf5', '#059669', 'Bác sĩ nhi khoa thăm khám tổng quát tận nhà, theo dõi sát sao biểu đồ phát triển của bé.', 'Bác sĩ chuyên khoa nhi trực tiếp thăm khám định kỳ và tư vấn sức khỏe cho bé tại nhà.', '["Đánh giá biểu đồ tăng trưởng cân nặng và chiều cao.","Tư vấn tiêm chủng và phác đồ chăm sóc khoa học.","Phát hiện sớm các dấu hiệu bệnh lý thông thường."]', '', 5),
('dinh-duong', 'Tư Vấn Dinh Dưỡng Ăn Dặm', 'Y tế & Dinh dưỡng', 'Trẻ nhỏ', 'Tại cơ sở', '60 phút', 250000, 300000, 17, 4.8, 'Thực đơn 1:1', 'ĂN DẶM', 'nutrition', '#fefce8', '#ca8a04', 'Lên thực đơn khoa học, phù hợp theo từng giai đoạn phát triển hệ tiêu hóa của trẻ.', 'Xây dựng thực đơn ăn dặm khoa học, phù hợp với hệ tiêu hóa và sự phát triển từng tháng tuổi của bé.', '["Lên thực đơn chi tiết theo phương pháp hiện đại.","Hướng dẫn chế biến đồ ăn dặm giàu dưỡng chất.","Tư vấn xử lý tình trạng biếng ăn sinh lý ở trẻ."]', '', 6),
('xong-hoi', 'Xông Hơi Phục Hồi Sau Sinh', 'Chăm sóc Mẹ', 'Mẹ sau sinh', 'Tại cơ sở', '60 phút', 340000, 400000, 15, 4.9, 'Thảo mộc 100%', 'ƯU ĐÃI', 'herbal', '#fff7ed', '#ea580c', 'Liệu pháp thảo dược cổ truyền giúp mẹ đào thải độc tố, làm sạch và sáng hồng làn da.', 'Liệu pháp xông hơi thảo mộc tự nhiên giúp mẹ thư giãn tinh thần và làm đẹp da.', '["Đào thải độc tố qua tuyến mồ hôi hiệu quả.","Làm sạch lỗ chân lông và sáng hồng làn da.","Giảm nhanh các triệu chứng cảm mạo sau sinh."]', '', 7),
('bao-mau', 'Thuê Bảo Mẫu Chăm Trẻ', 'Chăm sóc Bé', 'Trẻ nhỏ', 'Tại nhà', '4 giờ / ca', 480000, 550000, 13, 4.9, 'Theo ca · Uy tín', 'TẬN TÂM', 'nanny', '#eef2ff', '#4f46e5', 'Cung cấp nhân sự uy tín, tận tâm hỗ trợ gia đình chăm sóc và trông nom bé theo giờ.', 'Dịch vụ cung cấp người chăm trẻ tận tâm, giàu kinh nghiệm giúp bố mẹ thảnh thơi thời gian.', '["Hỗ trợ trông nom, cho bé ăn và chơi cùng bé an toàn.","Nhân sự được kiểm tra lý lịch và đào tạo bài bản.","Linh hoạt thời gian theo giờ hoặc theo ca."]', '', 8);

-- 12 Sản phẩm thiết yếu Mẹ & Bé mặc định (Mã 001 - 012)
INSERT IGNORE INTO products (id, code, name, category, age_group, product_type, shipping, freeship, rating, price, original_price, discount, spec_badge, sale_tag, gift, art_type, art_bg, art_accent, description, image, sort_order) VALUES
('001', '001', 'Sữa bột Aptamil Profutura KID Cesarbiotik 800g', 'Sữa & Dinh dưỡng', '1 - 3 tuổi', 'Hộp / Lon', 'Siêu tốc 1H', 1, 4.9, 695000, 820000, 15, '800g · Từ 2 tuổi', 'GIÁ TỐT', 'Tặng bình nước bé', 'milk-can', '#eff6ff', '#0284c7', 'Sữa công thức giàu dưỡng chất hỗ trợ hệ miễn dịch và tiêu hóa khỏe mạnh cho trẻ từ 1 đến 3 tuổi.', '', 0),
('002', '002', 'Thùng Sữa pha sẵn GrowPLUS+ Đỏ 180ml (48 hộp)', 'Sữa & Dinh dưỡng', '1 - 3 tuổi', 'Combo / Thùng', 'Giao nhanh trong ngày', 1, 4.8, 589000, 690000, 15, '180ml · 48 hộp', 'SALE -15%', 'Tặng balo mầm non', 'milk-pack', '#fef2f2', '#dc2626', 'Sữa dinh dưỡng pha sẵn tiện lợi giúp bé tăng cân khỏe mạnh, hỗ trợ phát triển chiều cao và trí não.', '', 1),
('003', '003', 'Combo 2 lốc Sữa dinh dưỡng pha sẵn cho bé 110ml', 'Sữa & Dinh dưỡng', '1 - 3 tuổi', 'Combo / Thùng', 'Siêu tốc 1H', 1, 4.8, 96000, 120000, 20, '110ml · 8 hộp', 'GIẢM SỐC', '', 'milk-pack', '#f0fdf4', '#16a34a', 'Hương vị thơm ngon dễ uống, bổ sung vitamin D3, Canxi và DHA cần thiết mỗi ngày cho trẻ nhỏ.', '', 2),
('004', '004', 'Tã dán sơ sinh Huggies Skin Perfect NB 70 miếng', 'Tã & Bỉm', '0 - 6 tháng', 'Gói / Bịch', 'Siêu tốc 1H', 1, 4.9, 265000, 315000, 16, 'NB · 70 miếng', 'BÁN CHẠY', '', 'diaper', '#fdf2f8', '#db2777', 'Bề mặt mềm mịn chuẩn da bé sơ sinh, thấm hút vượt trội và thoáng khí giúp hạn chế hăm tã tối đa.', '', 3),
('005', '005', 'Combo 2 bịch Tã quần Bobby Extra Soft-Dry size L', 'Tã & Bỉm', '6 - 12 tháng', 'Combo / Thùng', 'Siêu tốc 1H', 1, 4.7, 478000, 590000, 19, 'Size L · 108M', 'COMBO', 'Tặng khăn ướt 80 tờ', 'diaper', '#ecfeff', '#0891b2', 'Lõi nén siêu mỏng 3mm thoáng mát, đai chun co giãn êm ái giúp bé thoải mái vận động cả ngày dài.', '', 4),
('006', '006', 'Bình sữa Pigeon PP Plus cổ rộng 240ml (Kèm núm ty)', 'Bình sữa & Ăn dặm', '0 - 6 tháng', 'Dụng cụ', 'Siêu tốc 1H', 0, 4.9, 249000, 295000, 16, '240ml · BPA Free', 'CHÍNH HÃNG', '', 'bottle', '#fffbeb', '#d97706', 'Chất liệu nhựa PP an toàn không chứa BPA, núm ty silicone siêu mềm mô phỏng bầu ngực mẹ.', '', 5),
('007', '007', 'Máy hâm sữa & tiệt trùng đa năng Moaz BéBé', 'Bình sữa & Ăn dặm', '0 - 6 tháng', 'Dụng cụ', 'Giao nhanh trong ngày', 1, 4.8, 890000, 1120000, 21, 'Đa năng · BH 12T', 'SALE -21%', 'Tặng cọ rửa bình', 'warmer', '#f5f3ff', '#7c3aed', 'Giữ nhiệt sữa ổn định, rã đông sữa mẹ nhẹ nhàng và tiệt trùng hơi nước nhanh chóng cho bình sữa bé.', '', 6),
('008', '008', 'Bột ăn dặm hữu cơ HiPP vị Gạo Sữa Chuối Đào 250g', 'Bình sữa & Ăn dặm', '6 - 12 tháng', 'Hộp / Lon', 'Siêu tốc 1H', 0, 4.8, 135000, 155000, 13, '250g · Từ 6 tháng', 'HỮU CƠ', '', 'cereal', '#fefce8', '#ca8a04', 'Nguyên liệu hữu cơ tự nhiên, mịn mượt dễ tiêu hóa giúp bé tập ăn dặm hào hứng trong giai đoạn đầu.', '', 7),
('009', '009', 'Sữa tắm gội dịu nhẹ toàn thân Cetaphil Baby 400ml', 'Chăm sóc da & Tắm gội', '0 - 6 tháng', 'Chai / Tuýp', 'Siêu tốc 1H', 1, 4.9, 225000, 270000, 17, '400ml · Không cay', 'YÊU THÍCH', '', 'wash', '#eff6ff', '#2563eb', 'Chiết xuất hoa cúc Calendula hữu cơ làm sạch nhẹ nhàng, dưỡng ẩm và bảo vệ làn da nhạy cảm của trẻ sơ sinh.', '', 8),
('010', '010', 'Combo 3 gói Khăn ướt em bé Mamamy không mùi (300 tờ)', 'Chăm sóc da & Tắm gội', '0 - 6 tháng', 'Combo / Thùng', 'Siêu tốc 1H', 1, 4.8, 119000, 148000, 20, '300 tờ · Tinh khiết', 'GIẢM 20%', 'Tặng gói nhỏ 20 tờ', 'wipes', '#fdf2f8', '#e11d48', 'Vải không dệt dày mịn không xơ bông, sử dụng nước tinh khiết EDI an toàn lau mặt và da cho trẻ nhỏ.', '', 9),
('011', '011', 'Sữa bầu Morinaga Nhật Bản vị Trà Sữa (Hộp 12 gói)', 'Mẹ bầu & Sau sinh', 'Mẹ bầu & Sau sinh', 'Hộp / Lon', 'Giao nhanh trong ngày', 1, 4.9, 245000, 285000, 14, '12 gói · Ít đường', 'MẸ BẦU', '', 'milk-can', '#fff1f2', '#be185d', 'Giàu Axit Folic, Sắt, Canxi và DHA giúp mẹ bầu khỏe khoắn, hạn chế tăng cân quá mức và hỗ trợ thai nhi.', '', 10),
('012', '012', 'Máy hút sữa điện đôi rảnh tay êm ái cho mẹ sau sinh', 'Mẹ bầu & Sau sinh', 'Mẹ bầu & Sau sinh', 'Dụng cụ', 'Giao nhanh trong ngày', 1, 4.9, 1290000, 1650000, 22, 'Điện đôi · Không dây', 'SALE -22%', 'Tặng 20 túi trữ sữa', 'breast-pump', '#fdf4ff', '#a21caf', 'Lực hút êm nhẹ mô phỏng nhịp bú tự nhiên của bé, hỗ trợ kích sữa và dự trữ sữa mẹ tiện lợi.', '', 11);

INSERT INTO app_meta (meta_key, meta_value)
VALUES ('seeded', '1')
ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value);
