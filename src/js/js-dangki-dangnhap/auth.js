document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const fullname = document.getElementById("reg-fullname").value.trim();
            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;
            const confirmPassword = document.getElementById("reg-confirm-password").value;
            const role = document.getElementById("reg-role").value;
            const errorDiv = document.getElementById("register-error");

            if (password !== confirmPassword) {
                errorDiv.textContent = "Mật khẩu xác nhận không khớp!";
                errorDiv.style.display = "block";
                return;
            }

            let users = JSON.parse(localStorage.getItem("users")) || [];

            const userExists = users.some(user => user.email === email);
            if (userExists) {
                errorDiv.textContent = "Tài khoản hoặc email này đã tồn tại!";
                errorDiv.style.display = "block";
                return;
            }

            const newUser = { fullname, email, password, role };
            users.push(newUser);
            localStorage.setItem("users", JSON.stringify(users));

            alert("Đăng ký thành công! Hãy đăng nhập ngay.");
            window.location.href = "login.html";
        });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const errorDiv = document.getElementById("login-error");

            let users = JSON.parse(localStorage.getItem("users")) || [];

            const matchedUser = users.find(user => user.email === email && user.password === password);

            if (!matchedUser) {
                errorDiv.textContent = "Sai thông tin đăng nhập hoặc mật khẩu!";
                errorDiv.style.display = "block";
                return;
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

            if (newPassword !== confirmNewPassword) {
                errorDiv.textContent = "Mật khẩu xác nhận không khớp!";
                errorDiv.style.display = "block";
                return;
            }

            let users = JSON.parse(localStorage.getItem("users")) || [];

            const userIndex = users.findIndex(user => user.email === email);

            if (userIndex === -1) {
                errorDiv.textContent = "Không tìm thấy tài khoản với email hoặc SĐT này!";
                errorDiv.style.display = "block";
                return;
            }

            users[userIndex].password = newPassword;
            localStorage.setItem("users", JSON.stringify(users));

            alert("Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.");
            window.location.href = "login.html";
        });
    }
});