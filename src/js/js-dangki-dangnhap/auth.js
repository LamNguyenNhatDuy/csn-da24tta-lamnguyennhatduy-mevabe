document.addEventListener("DOMContentLoaded", function () {
    const roleLabels = {
        khachhang: "Khách Hàng",
        nhanvien: "Nhân Viên",
        chucoso: "Chủ Cơ Sở"
    };

    if (window.AppData && typeof AppData.ensureDefaultAdmin === "function") {
        AppData.ensureDefaultAdmin();
    }

    document.querySelectorAll(".btn-toggle-pw").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const targetId = btn.getAttribute("data-target");
            const input = targetId ? document.getElementById(targetId) : null;
            if (!input) return;
            const reveal = input.type === "password";
            input.type = reveal ? "text" : "password";
            btn.setAttribute("aria-label", reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
            btn.setAttribute("title", reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        });
    });

    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const fullname = document.getElementById("reg-fullname").value.trim();
            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;
            const confirmPassword = document.getElementById("reg-confirm-password").value;
            const role = "khachhang";
            const errorDiv = document.getElementById("register-error");
            errorDiv.style.display = "none";

            if (!fullname || !email) {
                errorDiv.textContent = "Vui lòng nhập đầy đủ họ tên và email hoặc số điện thoại!";
                errorDiv.style.display = "block";
                return;
            }

            if (password !== confirmPassword) {
                errorDiv.textContent = "Mật khẩu xác nhận không khớp!";
                errorDiv.style.display = "block";
                return;
            }

            const users = window.AppData ? AppData.loadUsers() : (JSON.parse(localStorage.getItem("users")) || []);

            const normalizedEmail = email.toLowerCase();
            const userExists = users.some(user => {
                if (!user) return false;
                const uEmail = (user.email || "").trim().toLowerCase();
                const uPhone = (user.phone || "").trim();
                return uEmail === normalizedEmail || (uPhone && uPhone === email);
            });

            if (userExists) {
                errorDiv.textContent = "Tài khoản, email hoặc số điện thoại này đã tồn tại!";
                errorDiv.style.display = "block";
                return;
            }

            const isPhone = /^0\d{8,10}$/.test(email);
            const newUser = {
                fullname: fullname,
                email: email,
                password: password,
                role: role,
                phone: isPhone ? email : "",
                dob: "",
                address: "",
                avatar: ""
            };
            users.push(newUser);
            localStorage.setItem("users", JSON.stringify(users));

            if (window.AppUI) {
                AppUI.success({
                    title: "Đăng ký thành công!",
                    message: "Tài khoản khách hàng của bạn đã được tạo. Bạn có thể đăng nhập ngay bây giờ.",
                    details: [
                        ["Họ và tên", fullname],
                        ["Tài khoản", email],
                        ["Vai trò", roleLabels[role]]
                    ],
                    buttonText: "Đăng nhập ngay",
                    onClose: function () {
                        window.location.href = "login.html";
                    }
                });
            } else {
                alert("Đăng ký thành công! Hãy đăng nhập ngay.");
                window.location.href = "login.html";
            }
        });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const errorDiv = document.getElementById("login-error");
            errorDiv.style.display = "none";

            const users = window.AppData ? AppData.loadUsers() : (JSON.parse(localStorage.getItem("users")) || []);
            const normalizedInput = email.toLowerCase();

            const matchedUser = users.find(user => {
                if (!user) return false;
                const uEmail = (user.email || "").trim().toLowerCase();
                const uPhone = (user.phone || "").trim();
                const matchesIdentity = uEmail === normalizedInput || (uPhone && uPhone === email);
                return matchesIdentity && user.password === password;
            });

            if (!matchedUser) {
                errorDiv.textContent = "Sai thông tin đăng nhập hoặc mật khẩu!";
                errorDiv.style.display = "block";
                return;
            }

            if (window.AppData && typeof AppData.setCurrentUser === "function") {
                AppData.setCurrentUser(matchedUser);
            }

            if (matchedUser.role === "khachhang") {
                window.location.href = "../html-nhom-nguoi-dung/khachhang.html";
            } else if (matchedUser.role === "nhanvien") {
                window.location.href = "../html-nhom-nguoi-dung/nhanvien.html";
            } else if (matchedUser.role === "chucoso") {
                window.location.href = "../html-nhom-nguoi-dung/chucoso.html";
            }
        });
    }

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
                errorDiv.textContent = "Mật khẩu xác nhận không khớp!";
                errorDiv.style.display = "block";
                return;
            }

            const users = window.AppData ? AppData.loadUsers() : (JSON.parse(localStorage.getItem("users")) || []);
            const normalizedInput = email.toLowerCase();

            const userIndex = users.findIndex(user => {
                if (!user) return false;
                const uEmail = (user.email || "").trim().toLowerCase();
                const uPhone = (user.phone || "").trim();
                return uEmail === normalizedInput || (uPhone && uPhone === email);
            });

            if (userIndex === -1) {
                errorDiv.textContent = "Không tìm thấy tài khoản với email hoặc SĐT này!";
                errorDiv.style.display = "block";
                return;
            }

            users[userIndex].password = newPassword;
            localStorage.setItem("users", JSON.stringify(users));

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
                    onClose: function () {
                        window.location.href = "login.html";
                    }
                });
            } else {
                alert("Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.");
                window.location.href = "login.html";
            }
        });
    }
});
