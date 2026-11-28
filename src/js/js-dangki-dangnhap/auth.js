document.addEventListener("DOMContentLoaded", function () {
    const roleLabels = {
        khachhang: "Khách Hàng",
        nhanvien: "Nhân Viên",
        chucoso: "Chủ Cơ Sở"
    };

    if (window.AppData && typeof AppData.ensureDefaultAdmin === "function") {
        AppData.ensureDefaultAdmin();
    }

    // Đồng bộ và tải danh sách tài khoản
    function loadSyncedUsers() {
        if (window.AppData && typeof AppData.refreshFromDatabase === "function") {
            AppData.refreshFromDatabase();
        }
        if (window.AppData) return AppData.loadUsers();
        try {
            return JSON.parse(localStorage.getItem("users")) || [];
        } catch (err) {
            return [];
        }
    }

    // Lưu danh sách tài khoản
    function saveUsersList(users) {
        if (window.AppData && typeof AppData.saveUsers === "function") {
            return AppData.saveUsers(users);
        }
        localStorage.setItem("users", JSON.stringify(users));
        return true;
    }

    // Tìm tài khoản theo email hoặc SĐT
    function findUserIndex(users, rawInput) {
        const clean = String(rawInput || "").trim();
        const lower = clean.toLowerCase();
        return users.findIndex(function (user) {
            if (!user) return false;
            const uEmail = (user.email || "").trim().toLowerCase();
            const uPhone = (user.phone || "").trim();
            return uEmail === lower || (uPhone && uPhone === clean);
        });
    }

    function showFormError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.style.display = "block";
    }

    // Ẩn/hiện mật khẩu
    document.querySelectorAll(".btn-toggle-pw").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const input = document.getElementById(btn.getAttribute("data-target"));
            if (!input) return;
            const reveal = input.type === "password";
            input.type = reveal ? "text" : "password";
            btn.setAttribute("aria-label", reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
            btn.setAttribute("title", reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        });
    });

    // Đăng ký tài khoản
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const fullname = document.getElementById("reg-fullname").value.trim();
            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;
            const confirmPassword = document.getElementById("reg-confirm-password").value;
            const errorDiv = document.getElementById("register-error");
            errorDiv.style.display = "none";

            if (!fullname || !email) {
                showFormError(errorDiv, "Vui lòng nhập đầy đủ họ tên và email hoặc số điện thoại!");
                return;
            }
            if (password !== confirmPassword) {
                showFormError(errorDiv, "Mật khẩu xác nhận không khớp!");
                return;
            }

            const users = loadSyncedUsers();
            if (findUserIndex(users, email) !== -1) {
                showFormError(errorDiv, "Tài khoản, email hoặc số điện thoại này đã tồn tại!");
                return;
            }

            const isPhone = /^0\d{8,10}$/.test(email);
            users.push({
                fullname: fullname,
                email: email,
                password: password,
                role: "khachhang",
                phone: isPhone ? email : "",
                dob: "",
                address: "",
                avatar: ""
            });

            if (!saveUsersList(users)) {
                showFormError(errorDiv, "Không thể lưu tài khoản vào cơ sở dữ liệu. Vui lòng thử lại!");
                return;
            }

            if (window.AppUI) {
                AppUI.success({
                    title: "Đăng ký thành công!",
                    message: "Tài khoản khách hàng của bạn đã được tạo. Bạn có thể đăng nhập ngay bây giờ.",
                    details: [
                        ["Họ và tên", fullname],
                        ["Tài khoản", email],
                        ["Vai trò", roleLabels.khachhang]
                    ],
                    buttonText: "Đăng nhập ngay",
                    onClose: function () { window.location.href = "login.html"; }
                });
            } else {
                window.location.href = "login.html";
            }
        });
    }

    // Đăng nhập
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const errorDiv = document.getElementById("login-error");
            errorDiv.style.display = "none";

            const users = loadSyncedUsers();
            const idx = findUserIndex(users, email);
            const matchedUser = idx !== -1 && users[idx].password === password ? users[idx] : null;

            if (!matchedUser) {
                showFormError(errorDiv, "Sai thông tin đăng nhập hoặc mật khẩu!");
                return;
            }

            if (window.AppData && typeof AppData.setCurrentUser === "function") {
                AppData.setCurrentUser(matchedUser);
            }

            const roleRoutes = {
                khachhang: "../html-nhom-nguoi-dung/khachhang.html",
                nhanvien: "../html-nhom-nguoi-dung/nhanvien.html",
                chucoso: "../html-nhom-nguoi-dung/chucoso.html"
            };
            if (roleRoutes[matchedUser.role]) {
                window.location.href = roleRoutes[matchedUser.role];
            }
        });
    }

    // Quên mật khẩu
    const forgotForm = document.getElementById("forgot-form");
    if (forgotForm) {
        forgotForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const email = document.getElementById("forgot-email").value.trim();
            const newPassword = document.getElementById("new-password").value;
            const confirmNewPassword = document.getElementById("confirm-new-password").value;
            const errorDiv = document.getElementById("forgot-error");
            errorDiv.style.display = "none";

            if (newPassword !== confirmNewPassword) {
                showFormError(errorDiv, "Mật khẩu xác nhận không khớp!");
                return;
            }

            const users = loadSyncedUsers();
            const userIndex = findUserIndex(users, email);
            if (userIndex === -1) {
                showFormError(errorDiv, "Không tìm thấy tài khoản với email hoặc SĐT này!");
                return;
            }

            users[userIndex].password = newPassword;
            if (!saveUsersList(users)) {
                showFormError(errorDiv, "Không thể lưu mật khẩu mới vào cơ sở dữ liệu!");
                return;
            }

            if (window.AppUI) {
                const updatedUser = users[userIndex];
                AppUI.success({
                    title: "Cập nhật mật khẩu thành công!",
                    message: "Mật khẩu mới đã được lưu lại. Vui lòng đăng nhập bằng mật khẩu mới.",
                    details: [
                        ["Họ và tên", updatedUser.fullname || "Chưa cập nhật"],
                        ["Tài khoản", updatedUser.email],
                        ["Vai trò", roleLabels[updatedUser.role] || updatedUser.role]
                    ],
                    buttonText: "Đăng nhập ngay",
                    onClose: function () { window.location.href = "login.html"; }
                });
            } else {
                window.location.href = "login.html";
            }
        });
    }
});
