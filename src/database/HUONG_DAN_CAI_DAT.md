# Hướng Dẫn Cài Đặt Cơ Sở Dữ Liệu MySQL (XAMPP / Laragon)

## 1. Cấu trúc các bảng trong CSDL `mevabe_db`
Tệp SQL chuẩn: `src/database/database.sql`
1. **`users`**: Lưu tài khoản đăng nhập, mật khẩu và vai trò (`khachhang`, `nhanvien`, `chucoso`).
2. **`customers`**: Lưu thông tin chi tiết khách hàng (`fullname`, `phone`, `dob`, `address`, `avatar`) liên kết `user_id` tới bảng `users`.
3. **`staff`**: Lưu thông tin chi tiết nhân viên (`name`, `phone`, `staff_role`, `area`, `avatar`) liên kết `user_id` tới bảng `users`.
4. **`services`**: Lưu danh mục dịch vụ, giá, quyền lợi và hình ảnh dịch vụ (`LONGTEXT`).
5. **`products`**: Lưu danh mục sản phẩm, mã sản phẩm (`001`, `002`...), giá bán và **hình ảnh sản phẩm (`LONGTEXT`)** — mọi thay đổi hình ảnh sản phẩm từ trang Chủ Cơ Sở đều ghi thẳng vào CSDL.
6. **`shifts`**: Lịch ca trực của nhân viên.
7. **`service_bookings`**: Lượt đăng ký dịch vụ của khách hàng, trạng thái xác nhận / thu hồi kèm lời nhắn.
8. **`product_orders`** & **`product_order_items`**: Đơn hàng sản phẩm và chi tiết từng sản phẩm trong đơn.
9. **`cart_items`**: Giỏ hàng theo từng tài khoản khách hàng.

## 2. Các bước chạy website với MySQL bằng XAMPP
1. Tải và cài đặt **XAMPP** (`https://www.apachefriends.org`), sau đó mở **XAMPP Control Panel** và bấm **Start** cả **Apache** và **MySQL**.
2. Chép thư mục dự án vào `C:\xampp\htdocs\mevabe\` (hoặc tên thư mục bạn muốn trong `htdocs`).
3. Mở trình duyệt truy cập **`http://localhost/phpmyadmin`**:
   * Chọn tab **Import** (Nhập) → **Choose File** → chọn tệp `src/database/database.sql` → bấm **Import / Thực hiện**.
   * *(Lưu ý: Nếu quên bước Import thủ công, hệ thống PHP trong `src/api/db.php` cũng sẽ tự tạo database `mevabe_db` và toàn bộ bảng khi bạn mở web lần đầu).*
4. Nếu sử dụng mật khẩu MySQL khác mặc định của XAMPP (`root` / mật khẩu rỗng), chỉnh sửa trong `src/api/config.php`.
5. Truy cập trang web trên trình duyệt:
   * **`http://localhost/mevabe/`** → tự động chuyển hướng sang trang Đăng nhập (`src/html/html-dangki-dangnhap/login.html`).

## 3. Kiểm tra lưu thay đổi hình ảnh sản phẩm vào CSDL
1. Đăng nhập tài khoản **Chủ Cơ Sở** (`admin` / `admin`).
2. Vào mục **Quản Lý Sản Phẩm** → bấm **Sửa** ở một sản phẩm bất kỳ → bấm **Chọn ảnh mới** rồi **Lưu Sản Phẩm**.
3. Mở lại `phpMyAdmin` → database **`mevabe_db`** → bảng **`products`** để kiểm tra cột `image` đã lưu dữ liệu ảnh mới. Mở trình duyệt khác hoặc trang Khách Hàng để thấy hình ảnh mới hiển thị trực tiếp từ CSDL.
