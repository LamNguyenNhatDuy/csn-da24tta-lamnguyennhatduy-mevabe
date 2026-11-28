let staffList = AppData.loadStaff();

let pendingModalAvatar = "";
let pendingServiceImage = "";
let pendingProductImage = "";

function saveStaffList() {
    if (AppData.saveStaff(staffList)) {
        return true;
    }
    AppUI.error({
        title: "Không thể lưu dữ liệu",
        message: "Không thể cập nhật danh sách nhân viên vào cơ sở dữ liệu."
    });
    return false;
}

// Đồng bộ nhân viên với tài khoản users
function syncStaffWithUsers() {
    staffList = AppData.loadStaff();
    const users = AppData.loadUsers();
    let staffChanged = false;

    users.forEach(function (u) {
        if (!u || u.role !== "nhanvien" || !u.email) return;
        const uEmail = u.email.trim().toLowerCase();
        const uPhone = (u.phone || "").trim();

        const idx = staffList.findIndex(function (s) {
            if (!s) return false;
            if (s.email && s.email.trim().toLowerCase() === uEmail) return true;
            if (uPhone && s.phone && s.phone.trim() === uPhone) return true;
            return false;
        });

        if (idx !== -1) {
            const st = staffList[idx];
            const updated = {
                name: u.fullname || st.name || "",
                email: u.email || st.email || "",
                phone: u.phone || st.phone || "",
                role: u.staffRole !== undefined ? u.staffRole : (st.role || ""),
                area: u.area !== undefined ? u.area : (st.area || ""),
                avatar: u.avatar !== undefined ? u.avatar : (st.avatar || "")
            };
            if (
                updated.name !== st.name ||
                updated.email !== st.email ||
                updated.phone !== st.phone ||
                updated.role !== st.role ||
                updated.area !== st.area ||
                updated.avatar !== st.avatar
            ) {
                staffList[idx] = updated;
                staffChanged = true;
            }
        } else {
            staffList.push({
                name: u.fullname || "Nhân viên",
                email: u.email,
                phone: u.phone || "",
                role: u.staffRole || "",
                area: u.area || "",
                avatar: u.avatar || ""
            });
            staffChanged = true;
        }
    });

    if (staffChanged) {
        saveStaffList();
    }
}

function debounceOwner(fn, delayMs) {
    let timer = null;
    return function () {
        const ctx = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            fn.apply(ctx, args);
        }, delayMs);
    };
}

function getSearchInputQuery(inputId) {
    const el = document.getElementById(inputId);
    return el ? el.value.trim().toLowerCase() : "";
}

function updateCounterBadge(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
}

function updateOwnerDatabasePill() {
    const pill = document.getElementById("owner-db-status");
    if (!pill) return;
    const connected = typeof AppData.isDatabaseConnected === "function" && AppData.isDatabaseConnected();
    pill.textContent = connected ? "● MySQL Real-time" : "● Chế độ trình duyệt";
    pill.classList.toggle("is-mysql", connected);
}

function renderStaffTable() {
    const tbody = document.getElementById("staff-table-body");
    if (!tbody) return;

    syncStaffWithUsers();
    updateCounterBadge("side-staff-count", staffList.length);

    const query = getSearchInputQuery("staff-table-search");
    const rows = [];
    staffList.forEach((staff, index) => {
        if (!staff) return;
        if (query) {
            const hay = `${staff.name || ""} ${staff.email || ""} ${staff.phone || ""} ${staff.role || ""} ${staff.area || ""}`.toLowerCase();
            if (hay.indexOf(query) === -1) return;
        }
        rows.push({ staff, index });
    });
    updateCounterBadge("staff-count-pill", query ? `${rows.length}/${staffList.length} nhân sự` : `${staffList.length} nhân sự`);

    if (rows.length === 0) {
        const msg = staffList.length === 0
            ? 'Chưa có nhân viên nào trong hệ thống. Hãy bấm "+ Mở Tài Khoản Nhân Viên" để tạo tài khoản.'
            : "Không có nhân viên nào khớp với từ khóa tìm kiếm.";
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">${msg}</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(({ staff, index }) => `
        <tr>
            <td>
                <div class="staff-name-cell">
                    ${AppUI.avatarHtml(staff.avatar, staff.name, 34)}
                    <span>${AppUI.escapeHtml(staff.name || "Chưa cập nhật")}</span>
                </div>
            </td>
            <td>${AppUI.escapeHtml(staff.email || "Chưa cấp TK")}</td>
            <td>${AppUI.escapeHtml(staff.phone || "Chưa cập nhật")}</td>
            <td>${AppUI.escapeHtml(staff.role || "Chưa cập nhật")}</td>
            <td>${AppUI.escapeHtml(staff.area || "Chưa cập nhật")}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn-sm" style="background: #e0f2fe; color: #0284c7;" onclick="viewStaffDetail(${index})">Xem dữ liệu</button>
                <button class="btn-sm btn-edit" onclick="editStaff(${index})">Sửa</button>
                <button class="btn-sm btn-delete" onclick="deleteStaff(${index})">Xóa</button>
            </td>
        </tr>
    `).join("");
}

function isShiftOfStaff(shift, staff) {
    if (!shift || !staff) return false;
    const stEmail = (staff.email || "").trim().toLowerCase();
    const shEmail = (shift.staffEmail || "").trim().toLowerCase();
    if (stEmail && shEmail) {
        return stEmail === shEmail;
    }
    const stPhone = (staff.phone || "").trim();
    const shPhone = (shift.staffPhone || "").trim();
    if (stPhone && shPhone) {
        return stPhone === shPhone;
    }
    const stName = (staff.name || "").trim().toLowerCase();
    const shName = (shift.staff || "").trim().toLowerCase();
    return Boolean(stName && shName && stName === shName);
}

window.viewStaffDetail = function(index) {
    const staff = staffList[index];
    if (!staff) return;

    const allShifts = AppData.loadShifts();
    const staffShifts = allShifts
        .filter(s => isShiftOfStaff(s, staff))
        .slice()
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const rows = staffShifts.map(s => [
        AppData.formatDate(s.date),
        s.day || "",
        s.time || "",
        AppData.getShiftStatus(s)
    ]);

    AppUI.profile({
        avatar: staff.avatar || "",
        name: staff.name || "Chưa cập nhật",
        subtitle: staff.role || "Nhân viên cơ sở",
        details: [
            ["Tài khoản đăng nhập", staff.email || "Chưa cập nhật"],
            ["Số điện thoại", staff.phone || "Chưa cập nhật"],
            ["Chuyên môn", staff.role || "Chưa cập nhật"],
            ["Khu vực", staff.area || "Chưa cập nhật"]
        ],
        sections: [
            {
                heading: `Lịch ca trực (${rows.length})`,
                table: rows.length > 0 ? {
                    headers: ["Ngày", "Thứ", "Ca", "Trạng thái"],
                    rows: rows
                } : null,
                emptyText: "Nhân viên chưa đăng ký ca trực nào."
            }
        ]
    });
};

function renderModalAvatarPreview(src, name) {
    const previewEl = document.getElementById("modal-staff-avatar-preview");
    const btnRemove = document.getElementById("btn-remove-modal-avatar");
    if (!previewEl) return;
    previewEl.innerHTML = "";
    previewEl.appendChild(AppUI.createAvatar(src, name || "Nhân viên", 88));
    if (btnRemove) {
        if (src) {
            btnRemove.classList.remove("hidden");
        } else {
            btnRemove.classList.add("hidden");
        }
    }
}

window.editStaff = function(index) {
    const staff = staffList[index];
    if (!staff) return;

    document.getElementById("staff-index").value = index;
    document.getElementById("staff-original-email").value = staff.email || "";
    document.getElementById("modal-staff-name").value = staff.name || "";
    document.getElementById("modal-staff-phone").value = staff.phone || "";
    document.getElementById("modal-staff-role").value = staff.role || "";
    document.getElementById("modal-staff-area").value = staff.area || "";
    document.getElementById("modal-staff-email").value = staff.email || "";

    const passInput = document.getElementById("modal-staff-password");
    const passHint = document.getElementById("modal-staff-password-hint");
    if (passInput) {
        passInput.value = "";
        passInput.required = false;
        passInput.placeholder = "Để trống nếu giữ nguyên mật khẩu hiện tại";
    }
    if (passHint) {
        passHint.textContent = "Chỉ nhập nếu muốn đặt lại mật khẩu cho nhân viên.";
    }

    pendingModalAvatar = staff.avatar || "";
    renderModalAvatarPreview(pendingModalAvatar, staff.name || "Nhân viên");
    document.getElementById("staff-modal-title").textContent = "Cập Nhật Tài Khoản Nhân Viên";
    document.getElementById("btn-submit-staff-modal").textContent = "Lưu Cập Nhật";
    document.getElementById("staff-modal").classList.remove("hidden");
};

window.deleteStaff = function(index) {
    const staff = staffList[index];
    if (!staff) return;
    AppUI.confirm({
        title: "Xác nhận xóa nhân viên",
        message: `Bạn có chắc chắn muốn xóa nhân viên "${staff.name || "Chưa rõ"}" và đóng tài khoản đăng nhập của họ không?`,
        danger: true,
        confirmText: "Xóa tài khoản",
        cancelText: "Hủy",
        onConfirm: function() {
            const removed = staffList.splice(index, 1)[0];
            saveStaffList();

            // Xóa tài khoản nhanvien tương ứng trong users
            if (removed && (removed.email || removed.phone)) {
                const users = AppData.loadUsers();
                const remEmail = (removed.email || "").trim().toLowerCase();
                const remPhone = (removed.phone || "").trim();
                const filteredUsers = users.filter(u => {
                    if (!u || u.role !== "nhanvien") return true;
                    if (remEmail && u.email && u.email.trim().toLowerCase() === remEmail) return false;
                    if (!remEmail && remPhone && u.phone && u.phone.trim() === remPhone) return false;
                    return true;
                });
                AppData.saveUsers(filteredUsers);
            }

            renderStaffTable();
            renderReport();
            AppUI.success({
                title: "Đã xóa nhân viên",
                message: `Nhân viên "${removed.name || "Chưa rõ"}" và tài khoản đăng nhập đã được xóa khỏi hệ thống.`
            });
        }
    });
};

/* Quản lý dịch vụ */
function isCustomUploadedImage(src) {
    return Boolean(src) && src.indexOf("data:image/svg+xml") !== 0;
}

function formatCatalogVnd(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + "đ";
}

function normalizeCatalogPricing(priceVal, origVal, discountVal) {
    const price = Math.max(0, Math.round(Number(priceVal) || 0));
    const rawOrigStr = String(origVal == null ? "" : origVal).trim();
    const discount = Math.min(99, Math.max(0, Math.round(Number(discountVal) || 0)));
    let originalPrice = rawOrigStr !== "" ? Math.max(0, Math.round(Number(rawOrigStr) || 0)) : 0;

    if (originalPrice > 0 && originalPrice < price) originalPrice = price;
    if (originalPrice === 0 && discount > 0 && price > 0) {
        originalPrice = Math.round(price / (1 - discount / 100));
    }
    if (originalPrice <= price && discount === 0) originalPrice = price;
    return { price, originalPrice, discount };
}

function getServiceArtStyle(category) {
    switch (category) {
        case "Chăm sóc Bé":
            return { artBg: "#eff6ff", artAccent: "#0284c7" };
        case "Y tế & Dinh dưỡng":
            return { artBg: "#ecfdf5", artAccent: "#059669" };
        default:
            return { artBg: "#fff1f6", artAccent: "#ff4d8d" };
    }
}

function resolveServicePreviewSrc(customSrc, fallbackMeta) {
    if (customSrc) return customSrc;
    const style = getServiceArtStyle(fallbackMeta && fallbackMeta.category);
    return AppData.buildServiceIllustrationSvg({
        artType: (fallbackMeta && fallbackMeta.artType) || "mom-spa",
        artBg: (fallbackMeta && fallbackMeta.artBg) || style.artBg,
        artAccent: (fallbackMeta && fallbackMeta.artAccent) || style.artAccent
    });
}

function renderCatalogImagePreview(previewId, removeBtnId, src, altText, resolver, fallbackMeta) {
    const previewEl = document.getElementById(previewId);
    const btnRemove = document.getElementById(removeBtnId);
    if (!previewEl) return;

    const custom = isCustomUploadedImage(src);
    const displaySrc = resolver(custom ? src : "", fallbackMeta);

    previewEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = displaySrc;
    img.alt = altText || "Hình ảnh";
    previewEl.appendChild(img);

    if (btnRemove) {
        btnRemove.classList.toggle("hidden", !custom);
    }
}

function syncDiscountInputs(priceInput, origInput, discountInput) {
    if (!priceInput || !origInput || !discountInput) return;
    const price = Number(priceInput.value);
    const orig = Number(origInput.value);
    if (!isNaN(price) && !isNaN(orig) && orig > price && orig > 0) {
        const pct = Math.min(99, Math.max(0, Math.round(((orig - price) / orig) * 100)));
        discountInput.value = String(pct);
    } else if (origInput.value.trim() !== "") {
        discountInput.value = "0";
    }
}

function renderServiceImagePreview(src, name, fallbackMeta) {
    renderCatalogImagePreview(
        "modal-service-image-preview",
        "btn-remove-service-image",
        src,
        name || "Ảnh dịch vụ",
        resolveServicePreviewSrc,
        fallbackMeta
    );
}

/* Đồng bộ chỉ số Hero và Sidebar theo báo cáo */
function updateOwnerOverviewStats(data) {
    if (!data) return;
    const servicesCount = AppData.loadServices().length;
    const productsCount = Array.isArray(data.allProducts) ? data.allProducts.length : AppData.loadProducts().length;

    updateCounterBadge("hero-rev-value", formatCatalogVnd(data.productRevenue));
    updateCounterBadge("hero-orders-pending", `${data.pendingOrderCount} đơn`);
    updateCounterBadge("hero-staff-count", `${data.totalStaff} người`);
    updateCounterBadge("hero-catalog-count", `${productsCount} SP · ${servicesCount} DV`);

    updateCounterBadge("side-staff-count", data.totalStaff);
    updateCounterBadge("side-service-count", servicesCount);
    updateCounterBadge("side-product-count", productsCount);

    const pendingBadge = document.getElementById("side-pending-badge");
    if (pendingBadge) {
        pendingBadge.textContent = String(data.pendingOrderCount);
        pendingBadge.classList.toggle("hidden", !(data.pendingOrderCount > 0));
    }
}

/* Bảng dịch vụ với lọc nhanh và render theo batch */
function renderServicesTable() {
    const tbody = document.getElementById("services-table-body");
    if (!tbody) return;

    const services = AppData.loadServices();
    const query = getSearchInputQuery("service-table-search");
    const filtered = !query
        ? services
        : services.filter(svc => [svc.name, svc.category, svc.target, svc.location, svc.specBadge, svc.saleTag]
            .join(" ").toLowerCase().includes(query));

    updateCounterBadge("side-service-count", services.length);
    updateCounterBadge("service-count-pill", query ? `${filtered.length}/${services.length} dịch vụ` : `${services.length} dịch vụ`);

    if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Chưa có dịch vụ nào. Hãy bấm "+ Thêm Dịch Vụ" để tạo mới.</td></tr>`;
        return;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Không tìm thấy dịch vụ phù hợp với "${AppUI.escapeHtml(query)}".</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(svc => {
        const thumbSrc = svc.image || AppData.buildServiceIllustrationSvg(svc);
        const thumbHtml = `<span class="service-thumb"><img src="${AppUI.escapeHtml(thumbSrc)}" alt="${AppUI.escapeHtml(svc.name)}" loading="lazy" decoding="async"></span>`;
        const benefitCount = Array.isArray(svc.benefits) ? svc.benefits.length : 0;
        const metaParts = [svc.specBadge, svc.saleTag].filter(Boolean).join(" · ");
        const priceLabel = svc.price > 0 ? formatCatalogVnd(svc.price) : "Liên hệ";
        const origHtml = svc.originalPrice > svc.price && svc.price > 0
            ? `<div class="product-price-sub">${formatCatalogVnd(svc.originalPrice)}</div>`
            : "";
        const discountHtml = svc.discount > 0
            ? `<span class="product-badge-mini">-${svc.discount}%</span>`
            : "";

        return `
            <tr>
                <td>
                    <div class="staff-name-cell">
                        ${thumbHtml}
                        <div>
                            <div style="font-weight: 600; color: var(--primary);">${AppUI.escapeHtml(svc.name)}</div>
                            ${metaParts ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${AppUI.escapeHtml(metaParts)}</div>` : ""}
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500; font-size: 0.9rem;">${AppUI.escapeHtml(svc.category || "Chăm sóc Mẹ & Bé")}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml([svc.target, svc.location, svc.duration].filter(Boolean).join(" · "))}</div>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="font-weight: 700; color: var(--primary);">${priceLabel}</div>
                    ${origHtml}
                    ${discountHtml ? `<div style="margin-top: 2px;">${discountHtml}</div>` : ""}
                </td>
                <td style="text-align: center; white-space: nowrap;">${benefitCount} mục</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn-sm" style="background: #e0f2fe; color: #0284c7;" onclick="viewServiceDetail('${AppUI.escapeHtml(svc.id)}')">Xem</button>
                    <button class="btn-sm btn-edit" onclick="editService('${AppUI.escapeHtml(svc.id)}')">Sửa</button>
                    <button class="btn-sm btn-delete" onclick="deleteService('${AppUI.escapeHtml(svc.id)}')">Xóa</button>
                </td>
            </tr>
        `;
    }).join("");
}

window.viewServiceDetail = function(serviceId) {
    const services = AppData.loadServices();
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;

    const benefits = Array.isArray(svc.benefits) ? svc.benefits : [];
    const priceDisplay = svc.price > 0
        ? (svc.originalPrice > svc.price ? `${formatCatalogVnd(svc.price)} (Giá gốc ${formatCatalogVnd(svc.originalPrice)}, giảm ${svc.discount || 0}%)` : formatCatalogVnd(svc.price))
        : "Liên hệ tư vấn";

    AppUI.profile({
        avatar: svc.image || AppData.buildServiceIllustrationSvg(svc),
        name: svc.name || "Dịch vụ",
        subtitle: [svc.category, svc.target, svc.location].filter(Boolean).join(" · ") || svc.shortDesc || "",
        details: [
            ["Mã dịch vụ", svc.id],
            ["Giá gói", priceDisplay],
            ["Thời lượng", svc.duration || "Linh hoạt"],
            ["Nhãn hiển thị", [svc.saleTag, svc.specBadge].filter(Boolean).join(" | ") || "Không có"],
            ["Mô tả ngắn", svc.shortDesc || "Chưa cập nhật"],
            ["Mô tả chi tiết", svc.desc || "Chưa cập nhật"]
        ],
        sections: [
            {
                heading: `Quyền lợi gói dịch vụ (${benefits.length})`,
                table: benefits.length > 0 ? {
                    headers: ["STT", "Nội dung quyền lợi"],
                    rows: benefits.map((b, i) => [String(i + 1), b])
                } : null,
                emptyText: "Chưa thiết lập quyền lợi cho dịch vụ này."
            }
        ]
    });
};

window.editService = function(serviceId) {
    const services = AppData.loadServices();
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;

    document.getElementById("service-edit-id").value = svc.id;
    document.getElementById("modal-service-name").value = svc.name || "";
    document.getElementById("modal-service-category").value = svc.category || "Chăm sóc Mẹ";
    document.getElementById("modal-service-target").value = svc.target || "Mẹ sau sinh";
    document.getElementById("modal-service-location").value = svc.location || "Tại nhà";
    document.getElementById("modal-service-duration").value = svc.duration || "";
    document.getElementById("modal-service-price").value = svc.price != null ? svc.price : 0;
    document.getElementById("modal-service-original-price").value = svc.originalPrice > svc.price ? svc.originalPrice : (svc.originalPrice || "");
    document.getElementById("modal-service-discount").value = svc.discount != null ? svc.discount : 0;
    document.getElementById("modal-service-art").value = svc.artType || "mom-spa";
    document.getElementById("modal-service-spec").value = svc.specBadge || "";
    document.getElementById("modal-service-saletag").value = svc.saleTag || "";
    document.getElementById("modal-service-short-desc").value = svc.shortDesc || "";
    document.getElementById("modal-service-desc").value = svc.desc || "";
    document.getElementById("modal-service-benefits").value = Array.isArray(svc.benefits) ? svc.benefits.join("\n") : "";

    pendingServiceImage = isCustomUploadedImage(svc.image) ? svc.image : "";
    renderServiceImagePreview(pendingServiceImage, svc.name, svc);

    document.getElementById("service-modal-title").textContent = "Chỉnh Sửa Dịch Vụ";
    document.getElementById("service-modal").classList.remove("hidden");
};

window.deleteService = function(serviceId) {
    const services = AppData.loadServices();
    const idx = services.findIndex(s => s.id === serviceId);
    if (idx === -1) return;
    const svc = services[idx];

    AppUI.confirm({
        title: "Xác nhận xóa dịch vụ",
        message: `Bạn có chắc chắn muốn xóa dịch vụ "${svc.name}"? Thay đổi sẽ đồng bộ ngay với trang Khách Hàng.`,
        danger: true,
        confirmText: "Xóa dịch vụ",
        cancelText: "Hủy",
        onConfirm: function() {
            const latest = AppData.loadServices();
            const delIdx = latest.findIndex(s => s.id === serviceId);
            if (delIdx !== -1) {
                latest.splice(delIdx, 1);
                if (!AppData.saveServices(latest)) {
                    AppUI.error({
                        title: "Lỗi lưu dữ liệu",
                        message: "Không thể cập nhật danh sách dịch vụ."
                    });
                    return;
                }
            }
            renderServicesTable();
            renderReport();
            AppUI.success({
                title: "Đã xóa dịch vụ",
                message: `Dịch vụ "${svc.name}" đã được xóa khỏi hệ thống.`
            });
        }
    });
};

/* Quản lý sản phẩm */
function getCategoryArtStyle(category) {
    switch (category) {
        case "Tã & Bỉm":
            return { artBg: "#eff6ff", artAccent: "#2563eb" };
        case "Bình sữa & Ăn dặm":
            return { artBg: "#fefce8", artAccent: "#ca8a04" };
        case "Chăm sóc da & Tắm gội":
            return { artBg: "#ecfdf5", artAccent: "#059669" };
        case "Mẹ bầu & Sau sinh":
            return { artBg: "#fdf4ff", artAccent: "#a21caf" };
        default:
            return { artBg: "#fff1f6", artAccent: "#ff4d8d" };
    }
}

function resolveProductPreviewSrc(customSrc, fallbackMeta) {
    if (customSrc) return customSrc;
    const style = getCategoryArtStyle(fallbackMeta && fallbackMeta.category);
    return AppData.buildProductIllustrationSvg({
        artType: (fallbackMeta && fallbackMeta.artType) || "milk-can",
        artBg: (fallbackMeta && fallbackMeta.artBg) || style.artBg,
        artAccent: (fallbackMeta && fallbackMeta.artAccent) || style.artAccent
    });
}

function renderProductImagePreview(src, name, fallbackMeta) {
    renderCatalogImagePreview(
        "modal-product-image-preview",
        "btn-remove-product-image",
        src,
        name || "Ảnh sản phẩm",
        resolveProductPreviewSrc,
        fallbackMeta
    );
}

/* Bảng sản phẩm với lọc nhanh và render theo batch */
function renderProductsTable() {
    const tbody = document.getElementById("products-table-body");
    if (!tbody) return;

    const products = AppData.loadProducts();
    const query = getSearchInputQuery("product-table-search");
    const filtered = !query
        ? products
        : products.filter(prod => {
            const codeStr = AppData.formatProductCode(prod.code || prod.id);
            return [codeStr, prod.name, prod.category, prod.age, prod.type, prod.specBadge, prod.saleTag]
                .join(" ").toLowerCase().includes(query);
        });

    updateCounterBadge("side-product-count", products.length);
    updateCounterBadge("product-count-pill", query ? `${filtered.length}/${products.length} sản phẩm` : `${products.length} sản phẩm`);

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Chưa có sản phẩm nào. Hãy bấm "+ Thêm Sản Phẩm" để tạo mới.</td></tr>`;
        return;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Không tìm thấy sản phẩm phù hợp với "${AppUI.escapeHtml(query)}".</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(prod => {
        const codeStr = AppData.formatProductCode(prod.code || prod.id);
        const thumbHtml = prod.image
            ? `<span class="service-thumb"><img src="${AppUI.escapeHtml(prod.image)}" alt="${AppUI.escapeHtml(prod.name)}" loading="lazy" decoding="async"></span>`
            : `<span class="service-thumb">Ảnh</span>`;
        const metaParts = [prod.specBadge, prod.saleTag].filter(Boolean).join(" · ");
        const origHtml = prod.originalPrice > prod.price
            ? `<div class="product-price-sub">${formatCatalogVnd(prod.originalPrice)}</div>`
            : "";
        const discountHtml = prod.discount > 0
            ? `<span class="product-badge-mini">-${prod.discount}%</span>`
            : "";
        const freeshipHtml = prod.freeship
            ? `<span class="product-badge-mini freeship">Freeship</span>`
            : "";
        const giftHtml = prod.gift
            ? `<span class="product-badge-mini gift">${AppUI.escapeHtml(prod.gift)}</span>`
            : "";

        return `
            <tr>
                <td>
                    <div class="staff-name-cell">
                        ${thumbHtml}
                        <div>
                            <div style="font-weight: 600; color: var(--primary);">
                                ${codeStr ? `<span class="cred-badge" style="margin-right: 4px;">${AppUI.escapeHtml(codeStr)}</span>` : ""}${AppUI.escapeHtml(prod.name)}
                            </div>
                            ${metaParts ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${AppUI.escapeHtml(metaParts)}</div>` : ""}
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500; font-size: 0.9rem;">${AppUI.escapeHtml(prod.category || "")}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml([prod.age, prod.type].filter(Boolean).join(" · "))}</div>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="font-weight: 700; color: var(--primary);">${formatCatalogVnd(prod.price)}</div>
                    ${origHtml}
                    ${discountHtml ? `<div style="margin-top: 2px;">${discountHtml}</div>` : ""}
                </td>
                <td>
                    <span class="product-badge-mini">${AppUI.escapeHtml(prod.shipping || "Giao nhanh trong ngày")}</span>
                    ${freeshipHtml}
                    ${giftHtml}
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn-sm" style="background: #e0f2fe; color: #0284c7;" onclick="viewProductDetail('${AppUI.escapeHtml(prod.id)}')">Xem</button>
                    <button class="btn-sm btn-edit" onclick="editProduct('${AppUI.escapeHtml(prod.id)}')">Sửa</button>
                    <button class="btn-sm btn-delete" onclick="deleteProduct('${AppUI.escapeHtml(prod.id)}')">Xóa</button>
                </td>
            </tr>
        `;
    }).join("");
}

window.viewProductDetail = function(productId) {
    const products = AppData.loadProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    AppUI.profile({
        avatar: prod.image || "",
        name: prod.name || "Sản phẩm",
        subtitle: [prod.category, prod.age, prod.type].filter(Boolean).join(" · "),
        details: [
            ["Mã sản phẩm", AppData.formatProductCode(prod.code || prod.id)],
            ["Giá bán", formatCatalogVnd(prod.price)],
            ["Giá gốc", prod.originalPrice > prod.price ? `${formatCatalogVnd(prod.originalPrice)} (Giảm ${prod.discount || 0}%)` : "Không áp dụng"],
            ["Vận chuyển", `${prod.shipping || "Giao nhanh trong ngày"}${prod.freeship ? " · Freeship" : ""}`],
            ["Quà tặng kèm", prod.gift || "Không có"],
            ["Nhãn hiển thị", [prod.saleTag, prod.specBadge].filter(Boolean).join(" | ") || "Không có"],
            ["Mô tả chi tiết", prod.desc || "Chưa cập nhật"]
        ]
    });
};

window.editProduct = function(productId) {
    const products = AppData.loadProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    document.getElementById("product-edit-id").value = prod.id;
    document.getElementById("modal-product-code").value = AppData.formatProductCode(prod.code || prod.id);
    document.getElementById("modal-product-name").value = prod.name || "";
    document.getElementById("modal-product-category").value = prod.category || "Sữa & Dinh dưỡng";
    document.getElementById("modal-product-age").value = prod.age || "0 - 6 tháng";
    document.getElementById("modal-product-type").value = prod.type || "Hộp / Lon";
    document.getElementById("modal-product-shipping").value = prod.shipping || "Siêu tốc 1H";
    document.getElementById("modal-product-price").value = prod.price != null ? prod.price : "";
    document.getElementById("modal-product-original-price").value = prod.originalPrice > prod.price ? prod.originalPrice : (prod.originalPrice || "");
    document.getElementById("modal-product-discount").value = prod.discount != null ? prod.discount : 0;
    document.getElementById("modal-product-art").value = prod.artType || "milk-can";
    document.getElementById("modal-product-spec").value = prod.specBadge || "";
    document.getElementById("modal-product-saletag").value = prod.saleTag || "";
    document.getElementById("modal-product-gift").value = prod.gift || "";
    document.getElementById("modal-product-freeship").checked = Boolean(prod.freeship);
    document.getElementById("modal-product-desc").value = prod.desc || "";

    pendingProductImage = isCustomUploadedImage(prod.image) ? prod.image : "";
    renderProductImagePreview(pendingProductImage, prod.name, prod);

    document.getElementById("product-modal-title").textContent = "Chỉnh Sửa Sản Phẩm";
    document.getElementById("product-modal").classList.remove("hidden");
};

window.deleteProduct = function(productId) {
    const products = AppData.loadProducts();
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return;
    const prod = products[idx];

    AppUI.confirm({
        title: "Xác nhận xóa sản phẩm",
        message: `Bạn có chắc chắn muốn xóa sản phẩm "${prod.name}"? Thay đổi sẽ đồng bộ ngay với trang Khách Hàng.`,
        danger: true,
        confirmText: "Xóa sản phẩm",
        cancelText: "Hủy",
        onConfirm: function() {
            const latest = AppData.loadProducts();
            const delIdx = latest.findIndex(p => p.id === productId);
            if (delIdx !== -1) {
                latest.splice(delIdx, 1);
                if (!AppData.saveProducts(latest)) {
                    AppUI.error({
                        title: "Lỗi lưu dữ liệu",
                        message: "Không thể cập nhật danh sách sản phẩm."
                    });
                    return;
                }
            }
            renderProductsTable();
            renderReport();
            AppUI.success({
                title: "Đã xóa sản phẩm",
                message: `Sản phẩm "${prod.name}" đã được xóa khỏi hệ thống.`
            });
        }
    });
};

/* Báo cáo & thống kê */
function parseRecordDate(record, isoField) {
    if (!record) return null;
    const isoVal = record[isoField];
    if (isoVal) {
        const dt = new Date(isoVal);
        if (!isNaN(dt.getTime())) {
            return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        }
    }
    if (typeof record.date === "string") {
        const match = record.date.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match) {
            const p1 = parseInt(match[1], 10);
            const p2 = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            const day = p2 > 12 ? p2 : p1;
            const month = p2 > 12 ? p1 : p2;
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const parsed = new Date(year, month - 1, day);
                if (
                    parsed.getFullYear() === year &&
                    parsed.getMonth() === month - 1 &&
                    parsed.getDate() === day
                ) {
                    return parsed;
                }
            }
        }
    }
    return null;
}

function parseBookingDate(booking) {
    return parseRecordDate(booking, "bookedAt");
}

function parseOrderDate(order) {
    return parseRecordDate(order, "orderedAt");
}

function isDateInPeriod(dateObj, period, now) {
    if (period === "all") return true;
    if (!dateObj || isNaN(dateObj.getTime())) return false;

    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const curY = now.getFullYear();
    const curM = now.getMonth();

    if (period === "this-month") {
        return y === curY && m === curM;
    }
    if (period === "last-month") {
        const prev = new Date(curY, curM - 1, 1);
        return y === prev.getFullYear() && m === prev.getMonth();
    }
    if (period === "this-year") {
        return y === curY;
    }
    return true;
}

function formatHours(hours) {
    return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function computeReportData(period) {
    const now = new Date();
    const allShifts = AppData.loadShifts();
    const allBookings = AppData.loadServiceBookings();

    let khLegacyProfile = null;
    try {
        khLegacyProfile = JSON.parse(localStorage.getItem("khachHangProfile"));
    } catch (err) {
        khLegacyProfile = null;
    }

    const users = AppData.loadUsers();
    const allOrders = AppData.loadProductOrders();
    const allServices = AppData.loadServices();
    const allProducts = AppData.loadProducts();

    const productById = new Map();
    const productByCode = new Map();
    const productByName = new Map();
    allProducts.forEach(p => {
        if (!p) return;
        const normCode = AppData.formatProductCode(p.code || p.id || "");
        if (p.id) productById.set(p.id, p);
        if (normCode) productByCode.set(normCode, p);
        if (p.name) productByName.set(p.name.trim().toLowerCase(), p);
    });

    const customerUsers = users.filter(u => u && u.role === "khachhang");
    let customerCount = customerUsers.length;
    if (customerCount === 0 && khLegacyProfile && (khLegacyProfile.fullname || khLegacyProfile.phone || khLegacyProfile.address)) {
        customerCount = 1;
    }

    const bookingEntries = [];
    allBookings.forEach((b, realIdx) => {
        if (isDateInPeriod(parseBookingDate(b), period, now)) {
            bookingEntries.push({ item: b, realIdx: realIdx });
        }
    });
    const filteredBookings = bookingEntries.map(e => e.item);

    const orderEntries = [];
    allOrders.forEach((o, realIdx) => {
        if (isDateInPeriod(parseOrderDate(o), period, now)) {
            orderEntries.push({ item: o, realIdx: realIdx });
        }
    });
    const filteredOrders = orderEntries.map(e => e.item);

    let confirmedOrderCount = 0;
    let pendingOrderCount = 0;
    let recalledOrderCount = 0;
    let productUnitsSold = 0;
    let productRevenue = 0;

    const catalogStatsMap = new Map();
    allProducts.forEach(p => {
        if (!p) return;
        const codeStr = AppData.formatProductCode(p.code || p.id || "");
        const key = p.id || codeStr || (p.name || "").trim().toLowerCase();
        if (!key) return;
        catalogStatsMap.set(key, {
            key,
            id: p.id || codeStr,
            code: codeStr,
            name: p.name || "Sản phẩm",
            category: p.category || "Sản phẩm khác",
            age: p.age || "",
            type: p.type || "",
            unitPrice: Number(p.price) || 0,
            image: p.image || "",
            inCatalog: true,
            qty: 0,
            revenue: 0,
            orderKeys: new Set()
        });
    });

    const productCategoryMap = new Map();

    filteredOrders.forEach((ord, ordIdx) => {
        if (!ord) return;
        const isRecalled = ord.status === "recalled" || Boolean(ord.recalledBy);
        const isConfirmed = !isRecalled && (ord.status === "confirmed" || Boolean(ord.confirmedBy));
        if (isRecalled) {
            recalledOrderCount++;
            return;
        }
        if (isConfirmed) confirmedOrderCount++;
        else pendingOrderCount++;

        const orderTotal = Number(ord.totalAmount) || 0;
        const orderKey = ord.code || ord.orderedAt || `ord_${ordIdx}`;
        const items = Array.isArray(ord.items) ? ord.items : [];
        let itemsSumRevenue = 0;

        items.forEach(it => {
            if (!it) return;
            const normCode = AppData.formatProductCode(it.code || it.id || "");
            const matchedProd = (it.id && productById.get(it.id)) ||
                (normCode && productByCode.get(normCode)) ||
                (it.name && productByName.get(String(it.name).trim().toLowerCase())) ||
                null;

            const qty = Math.max(1, Number(it.qty) || 1);
            const unitPrice = Number(it.price) || (matchedProd ? Number(matchedProd.price) || 0 : 0);
            const lineRevenue = unitPrice * qty;
            itemsSumRevenue += lineRevenue;
            productUnitsSold += qty;

            const finalCode = AppData.formatProductCode(it.code || (matchedProd && matchedProd.code) || it.id || "");
            const prodKey = (matchedProd && matchedProd.id) || finalCode || String(it.name || "Sản phẩm").trim().toLowerCase();
            const prodName = (matchedProd && matchedProd.name) || it.name || "Sản phẩm";
            const prodCategory = (matchedProd && matchedProd.category) || "Sản phẩm khác";

            if (!catalogStatsMap.has(prodKey)) {
                catalogStatsMap.set(prodKey, {
                    key: prodKey,
                    id: it.id || finalCode || prodKey,
                    code: finalCode,
                    name: prodName,
                    category: prodCategory,
                    age: (matchedProd && matchedProd.age) || "",
                    type: (matchedProd && matchedProd.type) || "",
                    unitPrice: unitPrice,
                    image: (matchedProd && matchedProd.image) || "",
                    inCatalog: Boolean(matchedProd),
                    qty: 0,
                    revenue: 0,
                    orderKeys: new Set()
                });
            }

            const statRow = catalogStatsMap.get(prodKey);
            statRow.qty += qty;
            statRow.revenue += lineRevenue;
            statRow.orderKeys.add(orderKey);

            if (!productCategoryMap.has(prodCategory)) {
                productCategoryMap.set(prodCategory, {
                    name: prodCategory,
                    qty: 0,
                    revenue: 0,
                    orderKeys: new Set()
                });
            }
            const catRow = productCategoryMap.get(prodCategory);
            catRow.qty += qty;
            catRow.revenue += lineRevenue;
            catRow.orderKeys.add(orderKey);
        });

        productRevenue += orderTotal > 0 ? orderTotal : itemsSumRevenue;
    });

    const productCatalogStats = Array.from(catalogStatsMap.values())
        .map(row => ({
            id: row.id,
            code: row.code,
            name: row.name,
            category: row.category,
            age: row.age,
            type: row.type,
            unitPrice: row.unitPrice,
            image: row.image,
            inCatalog: row.inCatalog,
            qty: row.qty,
            revenue: row.revenue,
            orderCount: row.orderKeys.size
        }))
        .sort((a, b) => {
            if (b.qty !== a.qty) return b.qty - a.qty;
            if (b.revenue !== a.revenue) return b.revenue - a.revenue;
            return String(a.code || "").localeCompare(String(b.code || ""), "vi");
        });

    const productSoldStats = productCatalogStats.filter(p => p.qty > 0);
    const productCategoryStats = Array.from(productCategoryMap.values())
        .map(cat => ({
            name: cat.name,
            qty: cat.qty,
            revenue: cat.revenue,
            orderCount: cat.orderKeys.size
        }))
        .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);

    const shiftOrderMap = { sang: 1, chieu: 2, toi: 3 };
    const shiftEntries = [];
    allShifts.forEach((s, realIdx) => {
        if (isDateInPeriod(AppData.parseISODate(s.date), period, now)) {
            shiftEntries.push({ item: s, realIdx: realIdx });
        }
    });
    shiftEntries.sort((a, b) => {
        if (a.item.date !== b.item.date) return String(a.item.date || "").localeCompare(String(b.item.date || ""));
        return (shiftOrderMap[a.item.shiftKey] || 9) - (shiftOrderMap[b.item.shiftKey] || 9);
    });
    const filteredShifts = shiftEntries.map(e => e.item);

    let totalShiftHours = 0;
    let completedShifts = 0;
    let upcomingShifts = 0;
    filteredShifts.forEach(s => {
        totalShiftHours += AppData.shiftHours(s.shiftKey);
        const st = AppData.getShiftStatus(s, now);
        if (st === "Đã hoàn thành") completedShifts++;
        else if (st === "Sắp tới") upcomingShifts++;
    });

    const serviceCountsMap = new Map();
    filteredBookings.forEach(b => {
        const name = (b && b.name) ? String(b.name) : "Dịch vụ khác";
        serviceCountsMap.set(name, (serviceCountsMap.get(name) || 0) + 1);
    });
    const serviceStats = Array.from(serviceCountsMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const shiftTypeStats = AppData.SHIFT_TYPES.map(t => {
        const count = filteredShifts.filter(s => s.shiftKey === t.key).length;
        return { key: t.key, label: `${t.label} (${t.start} - ${t.end})`, count };
    });

    const staffStatsList = staffList.map(st => ({
        name: st.name || "Chưa cập nhật",
        email: st.email || "",
        phone: st.phone || "",
        avatar: st.avatar || "",
        count: 0,
        hours: 0,
        completed: 0,
        upcoming: 0
    }));

    filteredShifts.forEach(sh => {
        const shEmail = (sh.staffEmail || "").trim().toLowerCase();
        const shName = (sh.staff || "Chưa rõ").trim();
        const shPhone = (sh.staffPhone || "").trim();

        let target = staffStatsList.find(st => {
            if (shEmail && st.email && shEmail === st.email.trim().toLowerCase()) return true;
            if (shPhone && st.phone && shPhone === st.phone.trim()) return true;
            return st.name.trim().toLowerCase() === shName.toLowerCase();
        });

        if (!target) {
            target = {
                name: shName,
                email: sh.staffEmail || "",
                phone: shPhone,
                avatar: "",
                count: 0,
                hours: 0,
                completed: 0,
                upcoming: 0
            };
            staffStatsList.push(target);
        }

        target.count++;
        target.hours += AppData.shiftHours(sh.shiftKey);
        const st = AppData.getShiftStatus(sh, now);
        if (st === "Đã hoàn thành") target.completed++;
        else if (st === "Sắp tới") target.upcoming++;
    });

    staffStatsList.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (b.hours !== a.hours) return b.hours - a.hours;
        return a.name.localeCompare(b.name, "vi");
    });

    const staffUserMap = new Map();
    users.forEach(u => {
        if (u && u.role === "nhanvien" && u.email) {
            staffUserMap.set(u.email.trim().toLowerCase(), u);
        }
    });

    const staffRecords = staffList.map((st, staffIdx) => {
        const key = (st.email || "").trim().toLowerCase();
        const account = staffUserMap.get(key) || {};
        const stat = staffStatsList.find(s =>
            (key && s.email && s.email.trim().toLowerCase() === key) ||
            (s.name && st.name && s.name.trim().toLowerCase() === st.name.trim().toLowerCase())
        ) || { count: 0, hours: 0, completed: 0, upcoming: 0 };

        return {
            staffIndex: staffIdx,
            name: st.name || account.fullname || "Chưa cập nhật",
            email: st.email || account.email || "",
            password: account.password || "",
            phone: st.phone || account.phone || "",
            role: st.role || "Nhân viên",
            area: st.area || "Chưa cập nhật",
            avatar: st.avatar || account.avatar || "",
            shiftCount: stat.count,
            shiftHours: stat.hours,
            completedShifts: stat.completed,
            upcomingShifts: stat.upcoming
        };
    });

    const customerUserMap = new Map();
    customerUsers.forEach(u => {
        if (u && u.email) {
            customerUserMap.set(u.email.trim().toLowerCase(), u);
        }
    });

    const buildCustomerRecord = (u, isLegacy) => {
        const emailLower = (u.email || "").trim().toLowerCase();
        const matchesLegacy = khLegacyProfile && (!khLegacyProfile.email || khLegacyProfile.email.trim().toLowerCase() === emailLower);
        const custBookings = allBookings.filter(b => b && ((b.customerEmail || "").trim().toLowerCase() === emailLower || (isLegacy && !b.customerEmail)));
        const custOrders = allOrders.filter(o => o && ((o.customerEmail || "").trim().toLowerCase() === emailLower || (isLegacy && !o.customerEmail)));
        const activeCustOrders = custOrders.filter(o => o.status !== "recalled" && !o.recalledBy);
        const totalSpent = activeCustOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        return {
            fullname: u.fullname || (matchesLegacy ? khLegacyProfile.fullname : "") || "Chưa cập nhật",
            email: u.email || (matchesLegacy ? khLegacyProfile.email : "") || "",
            password: u.password || "",
            phone: u.phone || (matchesLegacy ? khLegacyProfile.phone : "") || "",
            dob: u.dob || (matchesLegacy ? khLegacyProfile.dob : "") || "",
            address: u.address || (matchesLegacy ? khLegacyProfile.address : "") || "",
            avatar: u.avatar || (matchesLegacy ? khLegacyProfile.avatar : "") || "",
            bookings: custBookings,
            ordersCount: custOrders.length,
            totalSpent: totalSpent,
            isLegacy: Boolean(isLegacy)
        };
    };

    const customerRecords = customerUsers.length > 0
        ? customerUsers.map(u => buildCustomerRecord(u, false))
        : (customerCount === 1 && khLegacyProfile ? [buildCustomerRecord(khLegacyProfile, true)] : []);

    return {
        period,
        now,
        totalStaff: staffList.length,
        customerCount,
        bookingCount: filteredBookings.length,
        orderCount: filteredOrders.length,
        confirmedOrderCount,
        pendingOrderCount,
        recalledOrderCount,
        productUnitsSold,
        productRevenue,
        shiftCount: filteredShifts.length,
        totalShiftHours,
        completedShifts,
        upcomingShifts,
        serviceStats,
        shiftTypeStats,
        staffStatsList,
        productCatalogStats,
        productSoldStats,
        productCategoryStats,
        filteredBookings,
        bookingEntries,
        filteredOrders,
        orderEntries,
        filteredShifts,
        shiftEntries,
        staffRecords,
        customerRecords,
        customerUserMap,
        staffUserMap,
        allServices,
        allProducts,
        productById,
        productByCode,
        productByName
    };
}

let activeReportKpiKey = "customers";

function buildCredentialBadgesHtml(account, password, noAccountLabel) {
    const accHtml = account
        ? `<code class="cred-badge">${AppUI.escapeHtml(account)}</code>`
        : `<span style="color: var(--text-muted); font-style: italic;">${AppUI.escapeHtml(noAccountLabel || "Chưa có tài khoản")}</span>`;
    const pwHtml = password
        ? `<code class="cred-badge pw">${AppUI.escapeHtml(password)}</code>`
        : `<span style="color: var(--text-muted); font-style: italic;">Chưa thiết lập</span>`;
    return `
        <div class="cred-row">
            <div class="cred-line"><span class="cred-key">TK:</span> ${accHtml}</div>
            <div class="cred-line"><span class="cred-key">MK:</span> ${pwHtml}</div>
        </div>
    `;
}

function buildReportRecordStatusHtml(rec) {
    const isRecalled = rec && (rec.status === "recalled" || Boolean(rec.recalledBy));
    const isConfirmed = !isRecalled && rec && (rec.status === "confirmed" || Boolean(rec.confirmedBy));
    const badgeHtml = isRecalled
        ? `<span class="status-pill recalled" style="margin-top: 4px;">! Thu hồi: ${AppUI.escapeHtml(rec.recalledBy || "Nhân viên")}</span>`
        : (isConfirmed
            ? `<span class="status-pill completed" style="margin-top: 4px;">✓ Xác nhận: ${AppUI.escapeHtml(rec.confirmedBy || "Nhân viên")}</span>`
            : `<span class="status-pill upcoming" style="margin-top: 4px;">Chờ xác nhận</span>`);
    const recallMsgHtml = isRecalled && rec.recallMessage
        ? `<div style="font-size: 0.76rem; color: #b91c1c; margin-top: 4px;">Lời nhắn: ${AppUI.escapeHtml(rec.recallMessage)}</div>`
        : "";
    return `<div>${badgeHtml}</div>${recallMsgHtml}`;
}

function getPeriodLabelText() {
    const periodSelect = document.getElementById("report-period");
    if (!periodSelect) return "";
    const opt = periodSelect.options[periodSelect.selectedIndex];
    return opt ? opt.textContent : "";
}

function renderReportKpiDetailContent() {
    const modal = document.getElementById("report-detail-modal");
    const titleEl = document.getElementById("report-detail-title");
    const subtitleEl = document.getElementById("report-detail-subtitle");
    const countEl = document.getElementById("report-detail-count");
    const bodyEl = document.getElementById("report-detail-body");
    const searchEl = document.getElementById("report-detail-search");
    const periodSelect = document.getElementById("report-period");
    if (!modal || !titleEl || !subtitleEl || !bodyEl) return;

    const data = computeReportData(periodSelect ? periodSelect.value : "this-month");
    const periodLabel = getPeriodLabelText();
    const query = (searchEl ? searchEl.value : "").trim().toLowerCase();

    document.querySelectorAll("#report-detail-tabs .report-detail-tab").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-kpi") === activeReportKpiKey);
    });

    const renderTable = (headers, rowsHtml, emptyMsg) => {
        if (!rowsHtml) {
            return `<div style="padding: 28px 16px; text-align: center; color: var(--text-muted); font-style: italic;">${AppUI.escapeHtml(emptyMsg)}</div>`;
        }
        return `
            <table class="data-table">
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
    };

    if (activeReportKpiKey === "staff") {
        titleEl.textContent = `Chi Tiết Nhân Viên (${data.totalStaff})`;
        subtitleEl.textContent = `Danh sách nhân sự, tài khoản đăng nhập, mật khẩu và ca trực · Kỳ: ${periodLabel}`;

        const rows = data.staffRecords.filter(st => {
            if (!query) return true;
            const hay = `${st.name} ${st.email} ${st.phone} ${st.role} ${st.area}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        if (countEl) countEl.textContent = `${rows.length} nhân viên`;
        bodyEl.innerHTML = renderTable(
            ["STT", "Nhân Viên", "Tài Khoản &amp; Mật Khẩu", "Liên Hệ &amp; Khu Vực", "Ca Trực Trong Kỳ", "Thao Tác"],
            rows.map((st, idx) => `
                <tr>
                    <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                    <td>
                        <div class="staff-name-cell">
                            ${AppUI.avatarHtml(st.avatar, st.name, 34)}
                            <div>
                                <div style="font-weight: 600;">${AppUI.escapeHtml(st.name)}</div>
                                <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml(st.role)}</div>
                            </div>
                        </div>
                    </td>
                    <td>${buildCredentialBadgesHtml(st.email, st.password, "Chưa mở tài khoản")}</td>
                    <td>
                        <div>${AppUI.escapeHtml(st.phone || "Chưa cập nhật")}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml(st.area || "Chưa cập nhật")}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--primary);">${st.shiftCount} ca (${formatHours(st.shiftHours)} giờ)</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${st.completedShifts} hoàn thành · ${st.upcomingShifts} sắp tới</div>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-sm btn-edit" onclick="editStaff(${st.staffIndex})">Sửa</button>
                        <button type="button" class="btn-sm btn-delete" onclick="deleteStaff(${st.staffIndex})">Xóa</button>
                    </td>
                </tr>
            `).join(""),
            query ? "Không tìm thấy nhân viên khớp từ khóa." : "Chưa có nhân viên nào trong danh sách cơ sở."
        );
        return;
    }

    if (activeReportKpiKey === "customers") {
        titleEl.textContent = `Chi Tiết Khách Hàng (${data.customerCount})`;
        subtitleEl.textContent = "Tất cả tài khoản khách hàng, mật khẩu, thông tin liên hệ và lịch sử sử dụng";

        const rows = data.customerRecords.filter(c => {
            if (!query) return true;
            const bNames = c.bookings.map(b => b.name || "").join(" ");
            const hay = `${c.fullname} ${c.email} ${c.phone} ${c.address} ${c.dob} ${bNames}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        if (countEl) countEl.textContent = `${rows.length} khách hàng`;
        bodyEl.innerHTML = renderTable(
            ["STT", "Khách Hàng", "Tài Khoản &amp; Mật Khẩu", "Thông Tin Cá Nhân", "Dịch Vụ &amp; Đơn Hàng", "Thao Tác"],
            rows.map((c, idx) => {
                const recentSvcs = c.bookings.slice(-2).reverse().map(b => b.name).filter(Boolean).join(", ");
                const safeEmailArg = AppUI.escapeHtml(JSON.stringify(c.email || ""));
                return `
                    <tr>
                        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                        <td>
                            <div class="staff-name-cell">
                                ${AppUI.avatarHtml(c.avatar, c.fullname, 34)}
                                <div>
                                    <div style="font-weight: 600;">${AppUI.escapeHtml(c.fullname)}</div>
                                    <div style="font-size: 0.76rem; color: var(--text-muted);">${c.isLegacy ? "Hồ sơ lưu cục bộ" : "Tài khoản khách hàng"}</div>
                                </div>
                            </div>
                        </td>
                        <td>${buildCredentialBadgesHtml(c.email, c.password, "Hồ sơ chưa gắn tài khoản")}</td>
                        <td>
                            <div><strong>SĐT:</strong> ${AppUI.escapeHtml(c.phone || "Chưa cập nhật")}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><strong>NS:</strong> ${AppUI.escapeHtml(c.dob || "Chưa cập nhật")}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);"><strong>ĐC:</strong> ${AppUI.escapeHtml(c.address || "Chưa cập nhật")}</div>
                        </td>
                        <td>
                            <div><strong>${c.bookings.length}</strong> dịch vụ đã đăng ký</div>
                            ${recentSvcs ? `<div style="font-size: 0.76rem; color: var(--text-muted);">${AppUI.escapeHtml(recentSvcs)}</div>` : ""}
                            <div style="margin-top: 4px; font-size: 0.82rem;"><strong>${c.ordersCount}</strong> đơn sản phẩm${c.totalSpent > 0 ? ` (${formatCatalogVnd(c.totalSpent)})` : ""}</div>
                        </td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button type="button" class="btn-sm btn-edit" onclick="editReportCustomer(${safeEmailArg}, ${c.isLegacy ? "true" : "false"})">Sửa</button>
                            <button type="button" class="btn-sm btn-delete" onclick="deleteReportCustomer(${safeEmailArg}, ${c.isLegacy ? "true" : "false"})">Xóa</button>
                        </td>
                    </tr>
                `;
            }).join(""),
            query ? "Không tìm thấy khách hàng khớp từ khóa." : "Chưa có tài khoản khách hàng nào đăng ký."
        );
        return;
    }

    if (activeReportKpiKey === "bookings") {
        titleEl.textContent = `Chi Tiết Đăng Ký Dịch Vụ (${data.bookingCount})`;
        subtitleEl.textContent = `Toàn bộ lượt đặt dịch vụ trong kỳ: ${periodLabel}`;

        const serviceById = new Map();
        const serviceByName = new Map();
        data.allServices.forEach(s => {
            if (!s) return;
            if (s.id) serviceById.set(s.id, s);
            if (s.name) serviceByName.set(s.name.trim().toLowerCase(), s);
        });

        const rows = data.bookingEntries.slice().reverse().filter(entry => {
            const bk = entry.item;
            if (!query) return true;
            const hay = `${bk.id || ""} ${bk.name || ""} ${bk.customerName || ""} ${bk.customerEmail || ""} ${bk.customerPhone || ""} ${bk.date || ""}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        if (countEl) countEl.textContent = `${rows.length} lượt đăng ký`;
        bodyEl.innerHTML = renderTable(
            ["STT", "Mã &amp; Ngày Đăng Ký", "Dịch Vụ Đăng Ký", "Thông Tin Khách Hàng", "Tài Khoản Khách Hàng", "Thao Tác"],
            rows.map((entry, idx) => {
                const bk = entry.item;
                const emailKey = (bk.customerEmail || "").trim().toLowerCase();
                const matchedCust = (emailKey && data.customerUserMap.get(emailKey)) || {};
                const svc = (bk.serviceId && serviceById.get(bk.serviceId)) ||
                    (bk.name && serviceByName.get(bk.name.trim().toLowerCase())) || {};
                const displayName = bk.customerName || matchedCust.fullname || "Khách hàng";
                const displayPhone = bk.customerPhone || matchedCust.phone || "Chưa cập nhật";
                const priceLabel = svc.price > 0 ? formatCatalogVnd(svc.price) : "Liên hệ";
                const timeInfo = bk.bookedAt ? new Date(bk.bookedAt).toLocaleString("vi-VN") : (bk.date || "—");

                return `
                    <tr>
                        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                        <td>
                            <div style="font-weight: 600;">${AppUI.escapeHtml(bk.date || "—")}</div>
                            <div style="font-size: 0.76rem; color: var(--text-muted);">${AppUI.escapeHtml(bk.id || "Chưa có mã")}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${AppUI.escapeHtml(timeInfo)}</div>
                        </td>
                        <td>
                            <div style="font-weight: 600; color: var(--primary);">${AppUI.escapeHtml(bk.name || "Dịch vụ")}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml([svc.category, svc.location, priceLabel].filter(Boolean).join(" · "))}</div>
                            ${buildReportRecordStatusHtml(bk)}
                        </td>
                        <td>
                            <div style="font-weight: 600;">${AppUI.escapeHtml(displayName)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">SĐT: ${AppUI.escapeHtml(displayPhone)}</div>
                        </td>
                        <td>${buildCredentialBadgesHtml(bk.customerEmail || matchedCust.email || "", matchedCust.password || "", "Không rõ tài khoản")}</td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button type="button" class="btn-sm btn-edit" onclick="editReportBooking(${entry.realIdx})">Sửa</button>
                            <button type="button" class="btn-sm btn-delete" onclick="deleteReportBooking(${entry.realIdx})">Xóa</button>
                        </td>
                    </tr>
                `;
            }).join(""),
            query ? "Không tìm thấy lượt đăng ký nào khớp từ khóa." : "Chưa có lượt đăng ký dịch vụ nào trong kỳ đang chọn."
        );
        return;
    }

    if (activeReportKpiKey === "orders") {
        titleEl.textContent = `Chi Tiết Đơn Hàng Sản Phẩm (${data.orderCount})`;
        subtitleEl.textContent = `${data.productUnitsSold} sản phẩm hợp lệ · Doanh thu: ${formatCatalogVnd(data.productRevenue)} · Kỳ: ${periodLabel}`;

        const rows = data.orderEntries.slice().reverse().filter(entry => {
            const ord = entry.item;
            if (!query) return true;
            const itemsHay = Array.isArray(ord.items)
                ? ord.items.map(it => `${it.code || ""} ${it.name || ""}`).join(" ")
                : "";
            const hay = `${ord.code || ""} ${ord.date || ""} ${ord.customerName || ""} ${ord.customerEmail || ""} ${ord.customerPhone || ""} ${ord.customerAddress || ""} ${ord.confirmedBy || ""} ${ord.recalledBy || ""} ${itemsHay}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        if (countEl) countEl.textContent = `${rows.length} đơn hàng`;
        bodyEl.innerHTML = renderTable(
            ["STT", "Mã &amp; Ngày Đặt", "Sản Phẩm &amp; Giá Trị", "Trạng Thái Xử Lý", "Khách Hàng &amp; Tài Khoản", "Thao Tác"],
            rows.map((entry, idx) => {
                const ord = entry.item;
                const emailKey = (ord.customerEmail || "").trim().toLowerCase();
                const matchedCust = (emailKey && data.customerUserMap.get(emailKey)) || {};
                const displayName = ord.customerName || matchedCust.fullname || "Khách hàng";
                const displayPhone = ord.customerPhone || matchedCust.phone || "Chưa cập nhật";
                const displayAddress = ord.customerAddress || matchedCust.address || "";
                const timeInfo = ord.orderedAt ? new Date(ord.orderedAt).toLocaleString("vi-VN") : (ord.date || "—");
                const items = Array.isArray(ord.items) ? ord.items : [];
                const itemsHtml = items.map(it => {
                    const codeStr = AppData.formatProductCode(it.code || it.id || "");
                    return `<div style="font-size: 0.8rem; line-height: 1.4;">${codeStr ? `<strong>[${AppUI.escapeHtml(codeStr)}]</strong> ` : ""}${AppUI.escapeHtml(it.name || "Sản phẩm")} <span style="color: var(--text-muted);">×${it.qty || 1}</span></div>`;
                }).join("");

                return `
                    <tr>
                        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                        <td>
                            <div style="font-weight: 700; color: var(--primary);">${AppUI.escapeHtml(ord.code || `DH-${entry.realIdx + 1}`)}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml(timeInfo)}</div>
                        </td>
                        <td>
                            ${itemsHtml || '<div style="font-size: 0.8rem; color: var(--text-muted);">Không có chi tiết SP</div>'}
                            <div style="margin-top: 4px; font-weight: 700; color: var(--text-main);">Tổng: ${formatCatalogVnd(ord.totalAmount)}</div>
                        </td>
                        <td>${buildReportRecordStatusHtml(ord)}</td>
                        <td>
                            <div style="font-weight: 600;">${AppUI.escapeHtml(displayName)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">SĐT: ${AppUI.escapeHtml(displayPhone)}</div>
                            ${displayAddress ? `<div style="font-size: 0.76rem; color: var(--text-muted);">ĐC: ${AppUI.escapeHtml(displayAddress)}</div>` : ""}
                            <div style="margin-top: 4px;">${buildCredentialBadgesHtml(ord.customerEmail || matchedCust.email || "", matchedCust.password || "", "Không rõ tài khoản")}</div>
                        </td>
                        <td style="text-align: center; white-space: nowrap;">
                            <button type="button" class="btn-sm btn-edit" onclick="editReportOrder(${entry.realIdx})">Sửa</button>
                            <button type="button" class="btn-sm btn-delete" onclick="deleteReportOrder(${entry.realIdx})">Xóa</button>
                        </td>
                    </tr>
                `;
            }).join(""),
            query ? "Không tìm thấy đơn hàng nào khớp từ khóa." : "Chưa có đơn hàng sản phẩm nào trong kỳ đang chọn."
        );
        return;
    }

    if (activeReportKpiKey === "products") {
        titleEl.textContent = `Chi Tiết Thống Kê Sản Phẩm (${data.productUnitsSold} SP đã bán)`;
        subtitleEl.textContent = `Doanh thu: ${formatCatalogVnd(data.productRevenue)} · ${data.allProducts.length} mẫu đang bán · Kỳ: ${periodLabel}`;

        const rows = data.productCatalogStats.filter(p => {
            if (!query) return true;
            const hay = `${p.code} ${p.name} ${p.category} ${p.age} ${p.type}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        if (countEl) countEl.textContent = `${rows.length} sản phẩm`;
        bodyEl.innerHTML = renderTable(
            ["STT", "Sản Phẩm", "Danh Mục &amp; Phân Loại", "Đơn Giá", "Đã Bán (Trong Kỳ)", "Doanh Thu", "Thao Tác"],
            rows.map((p, idx) => {
                const thumbHtml = p.image
                    ? `<span class="service-thumb"><img src="${AppUI.escapeHtml(p.image)}" alt="${AppUI.escapeHtml(p.name)}" loading="lazy" decoding="async"></span>`
                    : `<span class="service-thumb">SP</span>`;
                const safeIdArg = AppUI.escapeHtml(JSON.stringify(p.id || ""));
                const actionHtml = p.inCatalog
                    ? `
                        <button type="button" class="btn-sm" style="background: #e0f2fe; color: #0284c7;" onclick="viewProductDetail(${safeIdArg})">Xem</button>
                        <button type="button" class="btn-sm btn-edit" onclick="editProduct(${safeIdArg})">Sửa</button>
                    `
                    : `<span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Ngừng bán</span>`;

                return `
                    <tr>
                        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                        <td>
                            <div class="staff-name-cell">
                                ${thumbHtml}
                                <div>
                                    <div style="font-weight: 600; color: var(--primary);">
                                        ${p.code ? `<span class="cred-badge" style="margin-right: 4px;">${AppUI.escapeHtml(p.code)}</span>` : ""}${AppUI.escapeHtml(p.name)}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div style="font-weight: 500; font-size: 0.88rem;">${AppUI.escapeHtml(p.category)}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml([p.age, p.type].filter(Boolean).join(" · ") || "—")}</div>
                        </td>
                        <td style="white-space: nowrap; font-weight: 600;">${formatCatalogVnd(p.unitPrice)}</td>
                        <td style="text-align: center;">
                            <div style="font-weight: 700; color: ${p.qty > 0 ? "#059669" : "var(--text-muted)"};">${p.qty} SP</div>
                            <div style="font-size: 0.76rem; color: var(--text-muted);">${p.orderCount} đơn</div>
                        </td>
                        <td style="white-space: nowrap; font-weight: 700; color: var(--primary);">${formatCatalogVnd(p.revenue)}</td>
                        <td style="text-align: center; white-space: nowrap;">${actionHtml}</td>
                    </tr>
                `;
            }).join(""),
            query ? "Không tìm thấy sản phẩm khớp từ khóa." : "Chưa có dữ liệu sản phẩm trong hệ thống."
        );
        return;
    }

    // shifts
    titleEl.textContent = `Chi Tiết Ca Trực Trong Kỳ (${data.shiftCount})`;
    subtitleEl.textContent = `Tổng ${formatHours(data.totalShiftHours)} giờ · ${data.completedShifts} hoàn thành · ${data.upcomingShifts} sắp tới · Kỳ: ${periodLabel}`;

    const rows = data.shiftEntries.filter(entry => {
        const sh = entry.item;
        if (!query) return true;
        const stLabel = AppData.getShiftStatus(sh, data.now);
        const hay = `${sh.date || ""} ${sh.day || ""} ${AppData.shiftLabel(sh.shiftKey)} ${sh.staff || ""} ${sh.staffEmail || ""} ${sh.staffPhone || ""} ${stLabel}`.toLowerCase();
        return hay.indexOf(query) !== -1;
    });

    if (countEl) countEl.textContent = `${rows.length} ca trực`;
    bodyEl.innerHTML = renderTable(
        ["STT", "Ngày Trực", "Ca Trực &amp; Giờ", "Nhân Viên &amp; Tài Khoản", "Trạng Thái", "Thao Tác"],
        rows.map((entry, idx) => {
            const sh = entry.item;
            const stStatus = AppData.getShiftStatus(sh, data.now);
            const statusClass = stStatus === "Đã hoàn thành" ? "completed" : (stStatus === "Đang diễn ra" ? "ongoing" : "upcoming");
            const emailKey = (sh.staffEmail || "").trim().toLowerCase();
            const staffProfile = staffList.find(s =>
                (emailKey && (s.email || "").trim().toLowerCase() === emailKey) ||
                (!emailKey && sh.staff && s.name && s.name.trim().toLowerCase() === sh.staff.trim().toLowerCase())
            ) || {};
            const staffUser = (emailKey && data.staffUserMap.get(emailKey)) || {};
            const phone = sh.staffPhone || staffProfile.phone || staffUser.phone || "Chưa cập nhật";

            return `
                <tr>
                    <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
                    <td>
                        <div style="font-weight: 600;">${AppUI.escapeHtml(AppData.formatDate(sh.date))}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml(sh.day || "")}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--primary);">${AppUI.escapeHtml(AppData.shiftLabel(sh.shiftKey))}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted);">${formatHours(AppData.shiftHours(sh.shiftKey))} giờ</div>
                    </td>
                    <td>
                        <div style="font-weight: 600;">${AppUI.escapeHtml(sh.staff || "Chưa rõ")}</div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">SĐT: ${AppUI.escapeHtml(phone)}${staffProfile.area ? ` · ${AppUI.escapeHtml(staffProfile.area)}` : ""}</div>
                        ${buildCredentialBadgesHtml(sh.staffEmail || staffUser.email || "", staffUser.password || "", "Không có tài khoản")}
                    </td>
                    <td><span class="status-pill ${statusClass}">${AppUI.escapeHtml(stStatus)}</span></td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-sm btn-edit" onclick="editReportShift(${entry.realIdx})">Sửa</button>
                        <button type="button" class="btn-sm btn-delete" onclick="deleteReportShift(${entry.realIdx})">Xóa</button>
                    </td>
                </tr>
            `;
        }).join(""),
        query ? "Không tìm thấy ca trực nào khớp từ khóa." : "Chưa có ca trực nào trong kỳ đang chọn."
    );
}

window.editReportCustomer = function(email, isLegacy) {
    const users = AppData.loadUsers();
    let target = null;
    if (!isLegacy && email) {
        const lower = email.trim().toLowerCase();
        target = users.find(u => u && u.role === "khachhang" && (u.email || "").trim().toLowerCase() === lower);
    }
    let khProfile = {};
    try {
        khProfile = JSON.parse(localStorage.getItem("khachHangProfile")) || {};
    } catch (err) {
        khProfile = {};
    }
    if (!target && !isLegacy) return;
    const src = target || khProfile;

    document.getElementById("customer-edit-orig-email").value = src.email || "";
    document.getElementById("customer-edit-is-legacy").value = isLegacy ? "1" : "0";
    document.getElementById("modal-customer-fullname").value = src.fullname || khProfile.fullname || "";
    document.getElementById("modal-customer-email").value = src.email || khProfile.email || "";
    document.getElementById("modal-customer-password").value = src.password || "";
    document.getElementById("modal-customer-phone").value = src.phone || khProfile.phone || "";
    document.getElementById("modal-customer-dob").value = src.dob || khProfile.dob || "";
    document.getElementById("modal-customer-address").value = src.address || khProfile.address || "";

    document.getElementById("customer-admin-modal").classList.remove("hidden");
};

window.deleteReportCustomer = function(email, isLegacy) {
    const lower = (email || "").trim().toLowerCase();
    const users = AppData.loadUsers();
    const matched = !isLegacy ? users.find(u => u && u.role === "khachhang" && (u.email || "").trim().toLowerCase() === lower) : null;
    const displayName = (matched && matched.fullname) || email || "Khách hàng";

    AppUI.confirm({
        title: "Xác nhận xóa khách hàng",
        message: `Bạn có chắc chắn muốn xóa tài khoản khách hàng "${displayName}" không?`,
        danger: true,
        confirmText: "Xóa khách hàng",
        cancelText: "Hủy",
        onConfirm: function () {
            if (!isLegacy && lower) {
                const updatedUsers = AppData.loadUsers().filter(u => !(u && u.role === "khachhang" && (u.email || "").trim().toLowerCase() === lower));
                AppData.saveUsers(updatedUsers);
            }
            try {
                const khProfile = JSON.parse(localStorage.getItem("khachHangProfile"));
                if (isLegacy || (khProfile && (khProfile.email || "").trim().toLowerCase() === lower)) {
                    localStorage.removeItem("khachHangProfile");
                }
            } catch (err) {
                // ignore
            }
            renderReport();
            AppUI.success({
                title: "Đã xóa khách hàng",
                message: `Thông tin khách hàng "${displayName}" đã được xóa khỏi hệ thống.`
            });
        }
    });
};

window.editReportBooking = function(realIdx) {
    const bookings = AppData.loadServiceBookings();
    const bk = bookings[realIdx];
    if (!bk) return;

    const svcSelect = document.getElementById("modal-booking-service");
    const services = AppData.loadServices();
    if (svcSelect) {
        svcSelect.innerHTML = services.map(s =>
            `<option value="${AppUI.escapeHtml(s.id)}">${AppUI.escapeHtml(s.name)}</option>`
        ).join("");
        let matched = services.find(s => (bk.serviceId && s.id === bk.serviceId) || (bk.name && s.name === bk.name));
        if (!matched && bk.name) {
            const opt = document.createElement("option");
            opt.value = bk.serviceId || "";
            opt.textContent = bk.name;
            svcSelect.appendChild(opt);
            svcSelect.value = opt.value;
        } else if (matched) {
            svcSelect.value = matched.id;
        }
    }

    const parsedDate = parseBookingDate(bk);
    const isoDate = parsedDate ? AppData.toISODate(parsedDate) : AppData.toISODate(new Date());

    document.getElementById("booking-edit-real-index").value = String(realIdx);
    document.getElementById("modal-booking-date").value = isoDate;
    document.getElementById("modal-booking-customer-name").value = bk.customerName || "";
    document.getElementById("modal-booking-customer-email").value = bk.customerEmail || "";
    document.getElementById("modal-booking-customer-phone").value = bk.customerPhone || "";

    document.getElementById("booking-admin-modal").classList.remove("hidden");
};

window.deleteReportBooking = function(realIdx) {
    const bookings = AppData.loadServiceBookings();
    const bk = bookings[realIdx];
    if (!bk) return;

    AppUI.confirm({
        title: "Xác nhận xóa lượt đăng ký",
        message: `Bạn có chắc chắn muốn xóa lượt đăng ký "${bk.name || "Dịch vụ"}" của "${bk.customerName || bk.customerEmail || "Khách hàng"}"?`,
        danger: true,
        confirmText: "Xóa lượt đăng ký",
        cancelText: "Hủy",
        onConfirm: function () {
            const latest = AppData.loadServiceBookings();
            if (realIdx >= 0 && realIdx < latest.length) {
                latest.splice(realIdx, 1);
                AppData.saveServiceBookings(latest);
            }
            renderReport();
            AppUI.success({
                title: "Đã xóa lượt đăng ký",
                message: `Lượt đăng ký dịch vụ "${bk.name || ""}" đã được xóa.`
            });
        }
    });
};

window.editReportOrder = function(realIdx) {
    const orders = AppData.loadProductOrders();
    const ord = orders[realIdx];
    if (!ord) return;

    const parsedDate = parseOrderDate(ord);
    const isoDate = parsedDate ? AppData.toISODate(parsedDate) : AppData.toISODate(new Date());
    const statusVal = (ord.status === "recalled" || ord.recalledBy)
        ? "recalled"
        : ((ord.status === "confirmed" || ord.confirmedBy) ? "confirmed" : "pending");

    document.getElementById("order-edit-real-index").value = String(realIdx);
    document.getElementById("modal-order-code").value = ord.code || `DH-${realIdx + 1}`;
    document.getElementById("modal-order-status").value = statusVal;
    document.getElementById("modal-order-date").value = isoDate;
    document.getElementById("modal-order-customer-name").value = ord.customerName || "";
    document.getElementById("modal-order-customer-phone").value = ord.customerPhone || "";
    document.getElementById("modal-order-customer-email").value = ord.customerEmail || "";
    document.getElementById("modal-order-customer-address").value = ord.customerAddress || "";
    document.getElementById("modal-order-recall-message").value = ord.recallMessage || "";

    document.getElementById("order-admin-modal").classList.remove("hidden");
};

window.deleteReportOrder = function(realIdx) {
    const orders = AppData.loadProductOrders();
    const ord = orders[realIdx];
    if (!ord) return;

    AppUI.confirm({
        title: "Xác nhận xóa đơn hàng",
        message: `Bạn có chắc chắn muốn xóa đơn hàng ${ord.code || ""} (${formatCatalogVnd(ord.totalAmount)}) của "${ord.customerName || ord.customerEmail || "Khách hàng"}"?`,
        danger: true,
        confirmText: "Xóa đơn hàng",
        cancelText: "Hủy",
        onConfirm: function () {
            const latest = AppData.loadProductOrders();
            if (realIdx >= 0 && realIdx < latest.length) {
                latest.splice(realIdx, 1);
                AppData.saveProductOrders(latest);
            }
            renderReport();
            AppUI.success({
                title: "Đã xóa đơn hàng",
                message: `Đơn hàng "${ord.code || ""}" đã được xóa khỏi hệ thống.`
            });
        }
    });
};

window.editReportShift = function(realIdx) {
    const shifts = AppData.loadShifts();
    const sh = shifts[realIdx];
    if (!sh) return;

    const staffSelect = document.getElementById("modal-shift-staff");
    if (staffSelect) {
        staffSelect.innerHTML = staffList.map((st, i) =>
            `<option value="idx:${i}">${AppUI.escapeHtml(st.name)}${st.email ? ` (${AppUI.escapeHtml(st.email)})` : ""}</option>`
        ).join("");
        const shEmail = (sh.staffEmail || "").trim().toLowerCase();
        const foundIdx = staffList.findIndex(st =>
            (shEmail && st.email && st.email.trim().toLowerCase() === shEmail) ||
            (sh.staff && st.name && st.name.trim().toLowerCase() === sh.staff.trim().toLowerCase())
        );
        if (foundIdx !== -1) {
            staffSelect.value = `idx:${foundIdx}`;
        } else {
            const opt = document.createElement("option");
            opt.value = "keep";
            opt.textContent = sh.staff + (sh.staffEmail ? ` (${sh.staffEmail})` : "");
            staffSelect.appendChild(opt);
            staffSelect.value = "keep";
        }
    }

    document.getElementById("shift-edit-id").value = sh.id || "";
    document.getElementById("shift-edit-real-index").value = String(realIdx);
    document.getElementById("modal-shift-date").value = sh.date || AppData.toISODate(new Date());
    document.getElementById("modal-shift-key").value = sh.shiftKey || "sang";

    document.getElementById("shift-admin-modal").classList.remove("hidden");
};

window.deleteReportShift = function(realIdx) {
    const shifts = AppData.loadShifts();
    const sh = shifts[realIdx];
    if (!sh) return;

    AppUI.confirm({
        title: "Xác nhận xóa ca trực",
        message: `Bạn có chắc chắn muốn xóa ${AppData.shiftLabel(sh.shiftKey)} ngày ${AppData.formatDate(sh.date)} của "${sh.staff || "Nhân viên"}"?`,
        danger: true,
        confirmText: "Xóa ca trực",
        cancelText: "Hủy",
        onConfirm: function () {
            const latest = AppData.loadShifts();
            if (realIdx >= 0 && realIdx < latest.length) {
                latest.splice(realIdx, 1);
                AppData.saveShifts(latest);
            }
            renderStaffTable();
            renderReport();
            AppUI.success({
                title: "Đã xóa ca trực",
                message: `Ca trực của "${sh.staff || "Nhân viên"}" ngày ${AppData.formatDate(sh.date)} đã được xóa.`
            });
        }
    });
};

function openReportKpiDetail(kpiKey) {
    const modal = document.getElementById("report-detail-modal");
    const searchEl = document.getElementById("report-detail-search");
    if (!modal) return;

    activeReportKpiKey = kpiKey || "customers";
    if (searchEl) searchEl.value = "";
    renderReportKpiDetailContent();
    modal.classList.remove("hidden");
}

function renderReportBarChart(container, items, getValue, getLabel, getCountText, emptyMsg) {
    if (!container) return;
    const list = Array.isArray(items) ? items : [];
    const totalOrMax = Math.max.apply(null, list.map(getValue));
    if (list.length === 0 || !isFinite(totalOrMax) || totalOrMax <= 0) {
        container.innerHTML = `<p class="report-empty">${AppUI.escapeHtml(emptyMsg)}</p>`;
        return;
    }
    container.innerHTML = `
        <div class="report-bar-list">
            ${list.map(item => {
                const pct = Math.round((getValue(item) / totalOrMax) * 100);
                return `
                    <div class="report-bar-item">
                        <div class="report-bar-meta">
                            <span class="report-bar-name">${AppUI.escapeHtml(getLabel(item))}</span>
                            <span class="report-bar-count">${AppUI.escapeHtml(getCountText(item))}</span>
                        </div>
                        <div class="report-bar-track">
                            <div class="report-bar-fill" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderReport() {
    const periodSelect = document.getElementById("report-period");
    const kpiContainer = document.getElementById("report-kpis");
    const servicesChart = document.getElementById("report-services-chart");
    const shiftChart = document.getElementById("report-shift-chart");
    const productsChart = document.getElementById("report-products-chart");
    const productCategoriesChart = document.getElementById("report-product-categories-chart");
    const productsTableContainer = document.getElementById("report-products-table");
    const staffTableContainer = document.getElementById("report-staff-table");
    if (!periodSelect || !kpiContainer || !servicesChart || !shiftChart || !staffTableContainer) return;

    const data = computeReportData(periodSelect.value);
    updateOwnerOverviewStats(data);

    kpiContainer.innerHTML = `
        <div class="report-kpi-card" data-kpi="staff" role="button" tabindex="0" title="Bấm để xem chi tiết nhân viên">
            <div>
                <div class="report-kpi-top">
                    <div class="report-kpi-label">Tổng nhân viên</div>
                    <span class="report-kpi-dot" style="background: #ff4d8d;"></span>
                </div>
                <div class="report-kpi-value">${data.totalStaff}</div>
                <div class="report-kpi-sub">Đang có trong danh sách cơ sở</div>
            </div>
            <div class="report-kpi-hint">Xem chi tiết &rarr;</div>
        </div>
        <div class="report-kpi-card" data-kpi="customers" role="button" tabindex="0" title="Bấm để xem chi tiết khách hàng &amp; tài khoản">
            <div>
                <div class="report-kpi-top">
                    <div class="report-kpi-label">Khách hàng</div>
                    <span class="report-kpi-dot" style="background: #0284c7;"></span>
                </div>
                <div class="report-kpi-value">${data.customerCount}</div>
                <div class="report-kpi-sub">Tài khoản khách hàng đã đăng ký</div>
            </div>
            <div class="report-kpi-hint">Xem chi tiết &rarr;</div>
        </div>
        <div class="report-kpi-card" data-kpi="bookings" role="button" tabindex="0" title="Bấm để xem chi tiết lượt đăng ký dịch vụ">
            <div>
                <div class="report-kpi-top">
                    <div class="report-kpi-label">Lượt đăng ký dịch vụ</div>
                    <span class="report-kpi-dot" style="background: #7c3aed;"></span>
                </div>
                <div class="report-kpi-value">${data.bookingCount}</div>
                <div class="report-kpi-sub">Trong kỳ báo cáo đang chọn</div>
            </div>
            <div class="report-kpi-hint">Xem chi tiết &rarr;</div>
        </div>
        <div class="report-kpi-card" data-kpi="orders" role="button" tabindex="0" title="Bấm để xem chi tiết &amp; xử lý đơn hàng sản phẩm">
            <div>
                <div class="report-kpi-top">
                    <div class="report-kpi-label">Đơn hàng sản phẩm</div>
                    <span class="report-kpi-dot" style="background: #d97706;"></span>
                </div>
                <div class="report-kpi-value">${data.orderCount}</div>
                <div class="report-kpi-sub">${data.confirmedOrderCount} xác nhận · ${data.pendingOrderCount} chờ · ${data.recalledOrderCount} thu hồi</div>
            </div>
            <div class="report-kpi-hint">Xem chi tiết &rarr;</div>
        </div>
        <div class="report-kpi-card" data-kpi="products" role="button" tabindex="0" title="Bấm để xem thống kê chi tiết từng sản phẩm">
            <div>
                <div class="report-kpi-top">
                    <div class="report-kpi-label">Doanh thu sản phẩm</div>
                    <span class="report-kpi-dot" style="background: #16a34a;"></span>
                </div>
                <div class="report-kpi-value" style="color: var(--primary);">${formatCatalogVnd(data.productRevenue)}</div>
                <div class="report-kpi-sub">${data.productUnitsSold} sản phẩm đã bán · ${data.allProducts.length} mẫu SP</div>
            </div>
            <div class="report-kpi-hint">Xem chi tiết &rarr;</div>
        </div>
        <div class="report-kpi-card" data-kpi="shifts" role="button" tabindex="0" title="Bấm để xem chi tiết các ca trực">
            <div>
                <div class="report-kpi-top">
                    <div class="report-kpi-label">Ca trực trong kỳ</div>
                    <span class="report-kpi-dot" style="background: #0d9488;"></span>
                </div>
                <div class="report-kpi-value">${data.shiftCount}</div>
                <div class="report-kpi-sub">${formatHours(data.totalShiftHours)} giờ · ${data.completedShifts} hoàn thành · ${data.upcomingShifts} sắp tới</div>
            </div>
            <div class="report-kpi-hint">Xem chi tiết &rarr;</div>
        </div>
    `;

    kpiContainer.querySelectorAll(".report-kpi-card").forEach(card => {
        const triggerDetail = function () {
            openReportKpiDetail(card.getAttribute("data-kpi"));
        };
        card.addEventListener("click", triggerDetail);
        card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerDetail();
            }
        });
    });

    const reportDetailModal = document.getElementById("report-detail-modal");
    if (reportDetailModal && !reportDetailModal.classList.contains("hidden")) {
        renderReportKpiDetailContent();
    }

    renderReportBarChart(
        servicesChart,
        data.serviceStats,
        item => item.count,
        item => item.name,
        item => `${item.count} lượt`,
        "Chưa có lượt đăng ký dịch vụ nào trong kỳ này."
    );

    renderReportBarChart(
        shiftChart,
        data.shiftCount === 0 ? [] : data.shiftTypeStats,
        item => item.count,
        item => item.label,
        item => `${item.count} ca`,
        "Chưa có ca trực nào trong kỳ này."
    );

    renderReportBarChart(
        productsChart,
        data.productSoldStats.slice(0, 8),
        item => item.qty,
        item => `${item.code ? `[${item.code}] ` : ""}${item.name}`,
        item => `${item.qty} SP · ${formatCatalogVnd(item.revenue)}`,
        "Chưa có sản phẩm nào được bán trong kỳ này."
    );

    renderReportBarChart(
        productCategoriesChart,
        data.productCategoryStats,
        item => item.revenue > 0 ? item.revenue : item.qty,
        item => item.name,
        item => `${formatCatalogVnd(item.revenue)} (${item.qty} SP)`,
        "Chưa có doanh thu theo danh mục sản phẩm trong kỳ này."
    );

    if (productsTableContainer) {
        if (data.productCatalogStats.length === 0) {
            productsTableContainer.innerHTML = `<p class="report-empty">Chưa có dữ liệu sản phẩm trong hệ thống.</p>`;
        } else {
            const activeOrdersCount = Math.max(0, data.orderCount - data.recalledOrderCount);
            productsTableContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Mã SP</th>
                            <th>Sản phẩm</th>
                            <th>Danh mục</th>
                            <th style="text-align: right;">Đơn giá</th>
                            <th style="text-align: center;">Số lượng bán</th>
                            <th style="text-align: center;">Số đơn hợp lệ</th>
                            <th style="text-align: right;">Doanh thu</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.productCatalogStats.map(p => {
                            const thumbHtml = p.image
                                ? `<span class="service-thumb"><img src="${AppUI.escapeHtml(p.image)}" alt="${AppUI.escapeHtml(p.name)}" loading="lazy" decoding="async"></span>`
                                : `<span class="service-thumb">SP</span>`;
                            return `
                                <tr>
                                    <td><span class="cred-badge">${AppUI.escapeHtml(p.code || "—")}</span></td>
                                    <td>
                                        <div class="staff-name-cell">
                                            ${thumbHtml}
                                            <div>
                                                <div style="font-weight: 600;">${AppUI.escapeHtml(p.name)}</div>
                                                ${!p.inCatalog ? `<div style="font-size: 0.76rem; color: var(--text-muted); font-style: italic;">Đã xóa khỏi danh mục</div>` : ""}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>${AppUI.escapeHtml(p.category)}</div>
                                        ${p.age ? `<div style="font-size: 0.76rem; color: var(--text-muted);">${AppUI.escapeHtml(p.age)}</div>` : ""}
                                    </td>
                                    <td style="text-align: right; white-space: nowrap;">${formatCatalogVnd(p.unitPrice)}</td>
                                    <td style="text-align: center; font-weight: 700; color: ${p.qty > 0 ? "#059669" : "var(--text-muted)"};">${p.qty}</td>
                                    <td style="text-align: center;">${p.orderCount}</td>
                                    <td style="text-align: right; font-weight: 700; color: var(--primary); white-space: nowrap;">${formatCatalogVnd(p.revenue)}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #fff5f8; font-weight: 700;">
                            <td colspan="4" style="text-align: right;">Tổng cộng trong kỳ (không tính đơn đã thu hồi):</td>
                            <td style="text-align: center; color: #059669;">${data.productUnitsSold} SP</td>
                            <td style="text-align: center;">${activeOrdersCount} đơn</td>
                            <td style="text-align: right; color: var(--primary); white-space: nowrap;">${formatCatalogVnd(data.productRevenue)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }
    }

    if (data.staffStatsList.length === 0) {
        staffTableContainer.innerHTML = `<p class="report-empty">Chưa có dữ liệu nhân viên hoặc ca trực.</p>`;
    } else {
        staffTableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nhân viên</th>
                        <th style="text-align: center;">Số ca</th>
                        <th style="text-align: center;">Tổng giờ</th>
                        <th style="text-align: center;">Đã hoàn thành</th>
                        <th style="text-align: center;">Sắp tới</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.staffStatsList.map(st => `
                        <tr>
                            <td>
                                <div class="staff-name-cell">
                                    ${AppUI.avatarHtml(st.avatar, st.name, 32)}
                                    <span>${AppUI.escapeHtml(st.name)}</span>
                                </div>
                            </td>
                            <td style="text-align: center; font-weight: 600;">${st.count}</td>
                            <td style="text-align: center;">${formatHours(st.hours)} giờ</td>
                            <td style="text-align: center; color: #10b981; font-weight: 600;">${st.completed}</td>
                            <td style="text-align: center; color: #d97706; font-weight: 600;">${st.upcoming}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    }
}

function csvCell(val) {
    return `"${String(val === null || val === undefined ? "" : val).replace(/"/g, '""')}"`;
}

function csvRow(cells) {
    return cells.map(csvCell).join(",");
}

function exportReportCsv() {
    const periodSelect = document.getElementById("report-period");
    const period = periodSelect ? periodSelect.value : "this-month";
    const periodLabel = periodSelect && periodSelect.options[periodSelect.selectedIndex]
        ? periodSelect.options[periodSelect.selectedIndex].textContent
        : period;

    const data = computeReportData(period);
    const lines = [];

    lines.push(csvRow(["BAO CAO & THONG KE CO SO ME & BE"]));
    lines.push(csvRow(["Ky bao cao", periodLabel]));
    lines.push(csvRow(["Ngay xuat", AppData.formatDate(new Date())]));
    lines.push("");

    lines.push(csvRow(["=== TONG QUAN KPI ==="]));
    lines.push(csvRow(["Chi so", "Gia tri", "Ghi chu"]));
    lines.push(csvRow(["Tong nhan vien", data.totalStaff, "Danh sach nhan su co so"]));
    lines.push(csvRow(["Khach hang", data.customerCount, "Tai khoan khach hang da dang ky"]));
    lines.push(csvRow(["Luot dang ky dich vu", data.bookingCount, periodLabel]));
    lines.push(csvRow(["Don hang san pham", data.orderCount, `${data.confirmedOrderCount} xac nhan, ${data.pendingOrderCount} cho, ${data.recalledOrderCount} thu hoi`]));
    lines.push(csvRow(["Doanh thu san pham (VND)", data.productRevenue, `${data.productUnitsSold} san pham da ban / ${data.allProducts.length} mau SP`]));
    lines.push(csvRow(["Ca truc trong ky", data.shiftCount, `${formatHours(data.totalShiftHours)} gio (${data.completedShifts} hoan thanh, ${data.upcomingShifts} sap toi)`]));
    lines.push("");

    lines.push(csvRow(["=== DICH VU DUOC DANG KY ==="]));
    lines.push(csvRow(["Ten dich vu", "So luot"]));
    if (data.serviceStats.length === 0) {
        lines.push(csvRow(["Khong co du lieu", 0]));
    } else {
        data.serviceStats.forEach(s => lines.push(csvRow([s.name, s.count])));
    }
    lines.push("");

    lines.push(csvRow(["=== THONG KE SAN PHAM TRONG KY ==="]));
    lines.push(csvRow(["Ma SP", "Ten san pham", "Danh muc", "Don gia (VND)", "So luong ban", "So don hop le", "Doanh thu (VND)"]));
    if (data.productCatalogStats.length === 0) {
        lines.push(csvRow(["", "Khong co du lieu", "", 0, 0, 0, 0]));
    } else {
        data.productCatalogStats.forEach(p => {
            lines.push(csvRow([p.code, p.name, p.category, p.unitPrice, p.qty, p.orderCount, p.revenue]));
        });
    }
    lines.push("");

    lines.push(csvRow(["=== DOANH THU SAN PHAM THEO DANH MUC ==="]));
    lines.push(csvRow(["Danh muc", "So luong ban", "So don hop le", "Doanh thu (VND)"]));
    if (data.productCategoryStats.length === 0) {
        lines.push(csvRow(["Khong co du lieu", 0, 0, 0]));
    } else {
        data.productCategoryStats.forEach(c => {
            lines.push(csvRow([c.name, c.qty, c.orderCount, c.revenue]));
        });
    }
    lines.push("");

    lines.push(csvRow(["=== CA TRUC THEO KHUNG GIO ==="]));
    lines.push(csvRow(["Khung gio", "So ca"]));
    data.shiftTypeStats.forEach(t => lines.push(csvRow([t.label, t.count])));
    lines.push("");

    lines.push(csvRow(["=== THONG KE CA TRUC THEO NHAN VIEN ==="]));
    lines.push(csvRow(["Nhan vien", "So ca", "Tong gio", "Da hoan thanh", "Sap toi"]));
    if (data.staffStatsList.length === 0) {
        lines.push(csvRow(["Khong co du lieu", 0, 0, 0, 0]));
    } else {
        data.staffStatsList.forEach(st => {
            lines.push(csvRow([st.name, st.count, formatHours(st.hours), st.completed, st.upcoming]));
        });
    }

    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-me-va-be-${AppData.toISODate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}

document.addEventListener("DOMContentLoaded", function () {
    const currentUser = AppData.requireRole("chucoso", "../html-dangki-dangnhap/login.html");
    if (!currentUser) return;

    const headerAvatar = document.getElementById("header-avatar");
    const headerUsername = document.getElementById("header-username");
    const ownerName = currentUser.fullname || "Chủ Cơ Sở";
    if (headerAvatar) {
        headerAvatar.innerHTML = "";
        headerAvatar.appendChild(AppUI.createAvatar("", ownerName, 32));
    }
    if (headerUsername) {
        headerUsername.textContent = ownerName;
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", function () {
            AppUI.confirm({
                title: "Xác nhận đăng xuất",
                message: "Bạn có chắc chắn muốn đăng xuất khỏi trang Chủ Cơ Sở?",
                confirmText: "Đăng xuất",
                cancelText: "Ở lại",
                onConfirm: function () {
                    AppData.logout("../html-dangki-dangnhap/login.html");
                }
            });
        });
    }

    // 1. Render Thông tin cơ sở
    const facilityData = {
        name: "Trung tâm Chăm sóc Mẹ & Bé - Chi nhánh Trà Vinh",
        address: "Đường D5, Hòa Thuận, Trà Vinh",
        hotline: "0326483623",
        owner: ownerName,
        account: currentUser.email || "admin",
        status: "Đang hoạt động"
    };

    const container = document.getElementById("facilityInfoContainer");
    if (container) {
        container.innerHTML = `
            <div class="info-item">
                <div class="info-label">Tên Cơ Sở</div>
                <div class="info-value">${AppUI.escapeHtml(facilityData.name)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Địa Chỉ</div>
                <div class="info-value">${AppUI.escapeHtml(facilityData.address)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Số Điện Thoại / Hotline</div>
                <div class="info-value">${AppUI.escapeHtml(facilityData.hotline)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Quản Trị Viên (${AppUI.escapeHtml(facilityData.account)})</div>
                <div class="info-value" style="color: #10b981;">● ${AppUI.escapeHtml(facilityData.status)}</div>
            </div>
        `;
    }

    /* Khởi tạo bảng dữ liệu */
    renderStaffTable();
    renderServicesTable();
    renderProductsTable();

    function bindImageUploadControls(cfg) {
        const { chooseBtn, removeBtn, fileInput, maxSize, errTitle, onSetImage } = cfg;
        if (chooseBtn && fileInput) {
            chooseBtn.addEventListener("click", function () {
                fileInput.click();
            });
            fileInput.addEventListener("change", function () {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                AppUI.readImageFile(file, maxSize)
                    .then(function (dataUrl) {
                        onSetImage(dataUrl);
                    })
                    .catch(function (err) {
                        AppUI.error({
                            title: errTitle,
                            message: err && err.message ? err.message : "Vui lòng chọn tệp ảnh hợp lệ."
                        });
                    })
                    .finally(function () {
                        fileInput.value = "";
                    });
            });
        }
        if (removeBtn) {
            removeBtn.addEventListener("click", function () {
                onSetImage("");
            });
        }
    }

    /* Modal nhân viên */
    const staffModal = document.getElementById("staff-modal");
    const btnOpenModal = document.getElementById("btn-open-staff-modal");
    const btnCloseModal = document.getElementById("btn-close-staff-modal");
    const staffModalForm = document.getElementById("staff-modal-form");

    const modalAvatarInput = document.getElementById("modal-staff-avatar-input");
    const btnChooseModalAvatar = document.getElementById("btn-choose-modal-avatar");
    const btnRemoveModalAvatar = document.getElementById("btn-remove-modal-avatar");
    const modalNameInput = document.getElementById("modal-staff-name");

    const refreshStaffAvatarPreview = () =>
        renderModalAvatarPreview(pendingModalAvatar, modalNameInput ? modalNameInput.value : "Nhân viên");

    bindImageUploadControls({
        chooseBtn: btnChooseModalAvatar,
        removeBtn: btnRemoveModalAvatar,
        fileInput: modalAvatarInput,
        maxSize: 256,
        errTitle: "Không thể tải ảnh đại diện",
        onSetImage: function (dataUrl) {
            pendingModalAvatar = dataUrl;
            refreshStaffAvatarPreview();
        }
    });

    if (modalNameInput) {
        modalNameInput.addEventListener("input", function () {
            if (!pendingModalAvatar) refreshStaffAvatarPreview();
        });
    }

    if (btnOpenModal) {
        btnOpenModal.addEventListener("click", function () {
            document.getElementById("staff-index").value = "-1";
            document.getElementById("staff-original-email").value = "";
            staffModalForm.reset();
            pendingModalAvatar = "";
            renderModalAvatarPreview("", "Nhân viên");

            const passInput = document.getElementById("modal-staff-password");
            const passHint = document.getElementById("modal-staff-password-hint");
            if (passInput) {
                passInput.required = true;
                passInput.placeholder = "Tạo mật khẩu cho nhân viên...";
            }
            if (passHint) {
                passHint.textContent = "Nhân viên sẽ dùng tài khoản và mật khẩu này để đăng nhập.";
            }

            document.getElementById("staff-modal-title").textContent = "Mở Tài Khoản Nhân Viên Mới";
            document.getElementById("btn-submit-staff-modal").textContent = "Mở Tài Khoản";
            staffModal.classList.remove("hidden");
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", function () {
            pendingModalAvatar = "";
            staffModal.classList.add("hidden");
        });
    }

    if (staffModalForm) {
        staffModalForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const index = parseInt(document.getElementById("staff-index").value, 10);
            const originalEmail = document.getElementById("staff-original-email").value.trim().toLowerCase();
            const name = document.getElementById("modal-staff-name").value.trim();
            const phone = document.getElementById("modal-staff-phone").value.trim();
            const role = document.getElementById("modal-staff-role").value.trim();
            const area = document.getElementById("modal-staff-area").value.trim();
            const loginEmail = document.getElementById("modal-staff-email").value.trim();
            const password = document.getElementById("modal-staff-password").value;
            const isAdd = index === -1;

            if (!loginEmail) {
                AppUI.warning({
                    title: "Thiếu tài khoản đăng nhập",
                    message: "Vui lòng nhập email hoặc tên đăng nhập cho nhân viên."
                });
                return;
            }

            if (isAdd && !password) {
                AppUI.warning({
                    title: "Thiếu mật khẩu",
                    message: "Vui lòng nhập mật khẩu đăng nhập khi mở tài khoản nhân viên mới."
                });
                return;
            }

            const users = AppData.loadUsers();
            const normEmail = loginEmail.toLowerCase();

            // Kiểm tra trùng email/tài khoản trong users (trừ chính user đang sửa)
            const duplicateUser = users.find(u => {
                if (!u || !u.email) return false;
                const uEmail = u.email.trim().toLowerCase();
                if (!isAdd && originalEmail && uEmail === originalEmail) return false;
                return uEmail === normEmail;
            });

            if (duplicateUser) {
                AppUI.error({
                    title: "Tài khoản đã tồn tại",
                    message: `Tài khoản "${loginEmail}" đã được sử dụng trên hệ thống. Vui lòng chọn email hoặc tên đăng nhập khác.`
                });
                return;
            }

            if (isAdd) {
                users.push({
                    fullname: name,
                    email: loginEmail,
                    password: password,
                    role: "nhanvien",
                    phone: phone,
                    staffRole: role,
                    area: area,
                    avatar: pendingModalAvatar || ""
                });
            } else {
                const uIdx = users.findIndex(u =>
                    u && u.role === "nhanvien" &&
                    ((originalEmail && u.email && u.email.trim().toLowerCase() === originalEmail) ||
                     (u.email && u.email.trim().toLowerCase() === normEmail))
                );
                if (uIdx !== -1) {
                    users[uIdx].fullname = name;
                    users[uIdx].email = loginEmail;
                    users[uIdx].phone = phone;
                    users[uIdx].staffRole = role;
                    users[uIdx].area = area;
                    users[uIdx].avatar = pendingModalAvatar || "";
                    if (password) {
                        users[uIdx].password = password;
                    }
                } else {
                    users.push({
                        fullname: name,
                        email: loginEmail,
                        password: password || "123456",
                        role: "nhanvien",
                        phone: phone,
                        staffRole: role,
                        area: area,
                        avatar: pendingModalAvatar || ""
                    });
                }
            }

            if (!AppData.saveUsers(users)) {
                AppUI.error({
                    title: "Không thể lưu tài khoản",
                    message: "Bộ nhớ trình duyệt đã đầy hoặc bị chặn."
                });
                return;
            }

            const record = {
                name: name,
                email: loginEmail,
                phone: phone,
                role: role,
                area: area,
                avatar: pendingModalAvatar || ""
            };

            if (isAdd) {
                staffList.push(record);
            } else {
                staffList[index] = record;
                // Cập nhật tên/email trên lịch ca trực nếu có
                const shifts = AppData.loadShifts();
                let shiftChanged = false;
                shifts.forEach(sh => {
                    if (originalEmail && sh.staffEmail && sh.staffEmail.trim().toLowerCase() === originalEmail) {
                        sh.staffEmail = loginEmail;
                        sh.staff = name;
                        sh.staffPhone = phone;
                        shiftChanged = true;
                    }
                });
                if (shiftChanged) AppData.saveShifts(shifts);
            }

            if (!saveStaffList()) {
                return;
            }

            pendingModalAvatar = "";
            renderStaffTable();
            renderReport();
            staffModal.classList.add("hidden");

            const details = [
                ["Họ và tên", record.name],
                ["Tài khoản đăng nhập", record.email]
            ];
            if (isAdd || password) {
                details.push(["Mật khẩu", password]);
            }
            details.push(["Số điện thoại", record.phone || "Chưa cập nhật"]);
            details.push(["Chuyên môn", record.role || "Chưa cập nhật"]);
            details.push(["Khu vực", record.area || "Chưa cập nhật"]);

            AppUI.success({
                title: isAdd ? "Mở tài khoản nhân viên thành công!" : "Đã cập nhật tài khoản nhân viên",
                message: isAdd
                    ? "Nhân viên có thể dùng tài khoản và mật khẩu dưới đây để đăng nhập ngay."
                    : "Thông tin tài khoản nhân viên đã được lưu lại.",
                details: details
            });
        });
    }

    /* Modal dịch vụ */
    const serviceModal = document.getElementById("service-modal");
    const btnOpenServiceModal = document.getElementById("btn-open-service-modal");
    const btnCloseServiceModal = document.getElementById("btn-close-service-modal");
    const serviceModalForm = document.getElementById("service-modal-form");

    const serviceImageInput = document.getElementById("modal-service-image-input");
    const btnChooseServiceImage = document.getElementById("btn-choose-service-image");
    const btnRemoveServiceImage = document.getElementById("btn-remove-service-image");
    const serviceNameInput = document.getElementById("modal-service-name");
    const serviceCategorySelect = document.getElementById("modal-service-category");
    const serviceArtSelect = document.getElementById("modal-service-art");
    const servicePriceInput = document.getElementById("modal-service-price");
    const serviceOriginalPriceInput = document.getElementById("modal-service-original-price");
    const serviceDiscountInput = document.getElementById("modal-service-discount");

    function getCurrentServiceArtMeta() {
        return {
            category: serviceCategorySelect ? serviceCategorySelect.value : "Chăm sóc Mẹ",
            artType: serviceArtSelect ? serviceArtSelect.value : "mom-spa"
        };
    }

    const refreshServicePreview = () =>
        renderServiceImagePreview(pendingServiceImage, serviceNameInput ? serviceNameInput.value : "Dịch vụ", getCurrentServiceArtMeta());

    if (servicePriceInput && serviceOriginalPriceInput) {
        const onServicePriceInput = () => syncDiscountInputs(servicePriceInput, serviceOriginalPriceInput, serviceDiscountInput);
        servicePriceInput.addEventListener("input", onServicePriceInput);
        serviceOriginalPriceInput.addEventListener("input", onServicePriceInput);
    }

    [serviceCategorySelect, serviceArtSelect].forEach(el => {
        if (!el) return;
        el.addEventListener("change", function () {
            if (!pendingServiceImage) refreshServicePreview();
        });
    });

    bindImageUploadControls({
        chooseBtn: btnChooseServiceImage,
        removeBtn: btnRemoveServiceImage,
        fileInput: serviceImageInput,
        maxSize: 480,
        errTitle: "Không thể tải hình ảnh dịch vụ",
        onSetImage: function (dataUrl) {
            pendingServiceImage = dataUrl;
            refreshServicePreview();
        }
    });

    if (btnOpenServiceModal) {
        btnOpenServiceModal.addEventListener("click", function () {
            document.getElementById("service-edit-id").value = "";
            serviceModalForm.reset();
            if (serviceDiscountInput) serviceDiscountInput.value = "0";
            pendingServiceImage = "";
            renderServiceImagePreview("", "Dịch vụ", getCurrentServiceArtMeta());
            document.getElementById("service-modal-title").textContent = "Thêm Dịch Vụ Mới";
            serviceModal.classList.remove("hidden");
        });
    }

    if (btnCloseServiceModal) {
        btnCloseServiceModal.addEventListener("click", function () {
            pendingServiceImage = "";
            serviceModal.classList.add("hidden");
        });
    }

    if (serviceModalForm) {
        serviceModalForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const editId = document.getElementById("service-edit-id").value.trim();
            const name = document.getElementById("modal-service-name").value.trim();
            const category = document.getElementById("modal-service-category").value;
            const target = document.getElementById("modal-service-target").value;
            const location = document.getElementById("modal-service-location").value;
            const duration = document.getElementById("modal-service-duration").value.trim();
            const { price, originalPrice, discount } = normalizeCatalogPricing(
                document.getElementById("modal-service-price").value,
                document.getElementById("modal-service-original-price").value,
                document.getElementById("modal-service-discount").value
            );

            const artType = document.getElementById("modal-service-art").value || "mom-spa";
            const specBadge = document.getElementById("modal-service-spec").value.trim();
            const saleTag = document.getElementById("modal-service-saletag").value.trim();
            const shortDesc = document.getElementById("modal-service-short-desc").value.trim();
            const desc = document.getElementById("modal-service-desc").value.trim();
            const benefitsRaw = document.getElementById("modal-service-benefits").value;
            const artStyle = getServiceArtStyle(category);

            const benefits = benefitsRaw
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean);

            const services = AppData.loadServices();
            const isAdd = !editId;

            if (isAdd) {
                const newId = "svc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 5);
                const newRecord = {
                    id: newId,
                    name: name,
                    category: category,
                    target: target,
                    location: location,
                    duration: duration,
                    price: price,
                    originalPrice: originalPrice,
                    discount: discount,
                    rating: 5.0,
                    specBadge: specBadge,
                    saleTag: saleTag,
                    artType: artType,
                    artBg: artStyle.artBg,
                    artAccent: artStyle.artAccent,
                    shortDesc: shortDesc,
                    desc: desc,
                    benefits: benefits,
                    image: pendingServiceImage || ""
                };
                if (!newRecord.image) {
                    newRecord.image = AppData.buildServiceIllustrationSvg(newRecord);
                }
                services.push(newRecord);
            } else {
                const idx = services.findIndex(s => s.id === editId);
                if (idx === -1) {
                    AppUI.error({
                        title: "Không tìm thấy dịch vụ",
                        message: "Dịch vụ này không còn tồn tại trong hệ thống."
                    });
                    return;
                }
                const prev = services[idx];
                const sameCategory = prev.category === category;
                const updatedRecord = {
                    id: editId,
                    name: name,
                    category: category,
                    target: target,
                    location: location,
                    duration: duration,
                    price: price,
                    originalPrice: originalPrice,
                    discount: discount,
                    rating: prev.rating || 5.0,
                    specBadge: specBadge,
                    saleTag: saleTag,
                    artType: artType,
                    artBg: sameCategory && prev.artBg ? prev.artBg : artStyle.artBg,
                    artAccent: sameCategory && prev.artAccent ? prev.artAccent : artStyle.artAccent,
                    shortDesc: shortDesc,
                    desc: desc,
                    benefits: benefits,
                    image: pendingServiceImage || ""
                };
                if (!updatedRecord.image) {
                    updatedRecord.image = AppData.buildServiceIllustrationSvg(updatedRecord);
                }
                services[idx] = updatedRecord;
            }

            if (!AppData.saveServices(services)) {
                AppUI.error({
                    title: "Không thể lưu dịch vụ",
                    message: "Bộ nhớ trình duyệt đã đầy hoặc bị chặn. Vui lòng thử ảnh nhỏ hơn."
                });
                return;
            }

            const imageLabel = isCustomUploadedImage(pendingServiceImage) ? "Ảnh tùy chỉnh đã tải lên" : "Ảnh minh họa mặc định";
            pendingServiceImage = "";
            renderServicesTable();
            renderReport();
            serviceModal.classList.add("hidden");

            AppUI.success({
                title: isAdd ? "Đã thêm dịch vụ mới" : "Đã cập nhật dịch vụ",
                message: "Thông tin dịch vụ đã được lưu và đồng bộ với trang Khách Hàng.",
                details: [
                    ["Tên dịch vụ", name],
                    ["Nhóm & Đối tượng", `${category} · ${target}`],
                    ["Giá gói", price > 0 ? (discount > 0 ? `${formatCatalogVnd(price)} (Giảm ${discount}%)` : formatCatalogVnd(price)) : "Liên hệ tư vấn"],
                    ["Số quyền lợi", `${benefits.length} mục`],
                    ["Hình ảnh", imageLabel]
                ]
            });
        });
    }

    /* Modal sản phẩm */
    const productModal = document.getElementById("product-modal");
    const btnOpenProductModal = document.getElementById("btn-open-product-modal");
    const btnCloseProductModal = document.getElementById("btn-close-product-modal");
    const productModalForm = document.getElementById("product-modal-form");

    const productImageInput = document.getElementById("modal-product-image-input");
    const btnChooseProductImage = document.getElementById("btn-choose-product-image");
    const btnRemoveProductImage = document.getElementById("btn-remove-product-image");
    const productNameInput = document.getElementById("modal-product-name");
    const productCategorySelect = document.getElementById("modal-product-category");
    const productArtSelect = document.getElementById("modal-product-art");
    const productPriceInput = document.getElementById("modal-product-price");
    const productOriginalPriceInput = document.getElementById("modal-product-original-price");
    const productDiscountInput = document.getElementById("modal-product-discount");

    function getCurrentProductArtMeta() {
        return {
            category: productCategorySelect ? productCategorySelect.value : "Sữa & Dinh dưỡng",
            artType: productArtSelect ? productArtSelect.value : "milk-can"
        };
    }

    const refreshProductPreview = () =>
        renderProductImagePreview(pendingProductImage, productNameInput ? productNameInput.value : "Sản phẩm", getCurrentProductArtMeta());

    if (productPriceInput && productOriginalPriceInput) {
        const onProductPriceInput = () => syncDiscountInputs(productPriceInput, productOriginalPriceInput, productDiscountInput);
        productPriceInput.addEventListener("input", onProductPriceInput);
        productOriginalPriceInput.addEventListener("input", onProductPriceInput);
    }

    [productCategorySelect, productArtSelect].forEach(el => {
        if (!el) return;
        el.addEventListener("change", function () {
            if (!pendingProductImage) refreshProductPreview();
        });
    });

    bindImageUploadControls({
        chooseBtn: btnChooseProductImage,
        removeBtn: btnRemoveProductImage,
        fileInput: productImageInput,
        maxSize: 480,
        errTitle: "Không thể tải hình ảnh sản phẩm",
        onSetImage: function (dataUrl) {
            pendingProductImage = dataUrl;
            refreshProductPreview();
        }
    });

    if (btnOpenProductModal) {
        btnOpenProductModal.addEventListener("click", function () {
            document.getElementById("product-edit-id").value = "";
            productModalForm.reset();
            const latestProducts = AppData.loadProducts();
            document.getElementById("modal-product-code").value = AppData.getNextProductCode(latestProducts);
            document.getElementById("modal-product-freeship").checked = true;
            document.getElementById("modal-product-discount").value = "0";
            pendingProductImage = "";
            renderProductImagePreview("", "Sản phẩm", getCurrentProductArtMeta());
            document.getElementById("product-modal-title").textContent = "Thêm Sản Phẩm Mới";
            productModal.classList.remove("hidden");
        });
    }

    if (btnCloseProductModal) {
        btnCloseProductModal.addEventListener("click", function () {
            pendingProductImage = "";
            productModal.classList.add("hidden");
        });
    }

    if (productModalForm) {
        productModalForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const editId = document.getElementById("product-edit-id").value.trim();
            const rawCode = document.getElementById("modal-product-code").value;
            const code = AppData.formatProductCode(rawCode);
            const name = document.getElementById("modal-product-name").value.trim();
            const category = document.getElementById("modal-product-category").value;
            const age = document.getElementById("modal-product-age").value;
            const type = document.getElementById("modal-product-type").value;
            const shipping = document.getElementById("modal-product-shipping").value;
            const { price, originalPrice, discount } = normalizeCatalogPricing(
                document.getElementById("modal-product-price").value,
                document.getElementById("modal-product-original-price").value,
                document.getElementById("modal-product-discount").value
            );

            const artType = document.getElementById("modal-product-art").value || "milk-can";
            const specBadge = document.getElementById("modal-product-spec").value.trim();
            const saleTag = document.getElementById("modal-product-saletag").value.trim();
            const gift = document.getElementById("modal-product-gift").value.trim();
            const freeship = Boolean(document.getElementById("modal-product-freeship").checked);
            const desc = document.getElementById("modal-product-desc").value.trim();
            const artStyle = getCategoryArtStyle(category);

            const products = AppData.loadProducts();
            const isAdd = !editId;
            const finalCode = code || AppData.getNextProductCode(products);

            const duplicateCode = products.some(p =>
                p && p.id !== editId &&
                AppData.formatProductCode(p.code || p.id).toLowerCase() === finalCode.toLowerCase()
            );
            if (duplicateCode) {
                AppUI.error({
                    title: "Trùng mã sản phẩm",
                    message: `Mã sản phẩm "${finalCode}" đã tồn tại. Vui lòng nhập mã khác (ví dụ: ${AppData.getNextProductCode(products)}).`
                });
                return;
            }

            if (isAdd) {
                const newId = products.some(p => p && p.id === finalCode)
                    ? "sp-" + Date.now().toString(36)
                    : finalCode;
                const newRecord = {
                    id: newId,
                    code: finalCode,
                    name: name,
                    category: category,
                    age: age,
                    type: type,
                    shipping: shipping,
                    freeship: freeship,
                    rating: 5.0,
                    price: price,
                    originalPrice: originalPrice,
                    discount: discount,
                    specBadge: specBadge,
                    saleTag: saleTag,
                    gift: gift,
                    artType: artType,
                    artBg: artStyle.artBg,
                    artAccent: artStyle.artAccent,
                    desc: desc,
                    image: pendingProductImage || ""
                };
                if (!newRecord.image) {
                    newRecord.image = AppData.buildProductIllustrationSvg(newRecord);
                }
                products.unshift(newRecord);
            } else {
                const idx = products.findIndex(p => p.id === editId);
                if (idx === -1) {
                    AppUI.error({
                        title: "Không tìm thấy sản phẩm",
                        message: "Sản phẩm này không còn tồn tại trong hệ thống."
                    });
                    return;
                }
                const prev = products[idx];
                const sameCategory = prev.category === category;
                const updatedRecord = {
                    id: editId,
                    code: finalCode,
                    name: name,
                    category: category,
                    age: age,
                    type: type,
                    shipping: shipping,
                    freeship: freeship,
                    rating: prev.rating || 5.0,
                    price: price,
                    originalPrice: originalPrice,
                    discount: discount,
                    specBadge: specBadge,
                    saleTag: saleTag,
                    gift: gift,
                    artType: artType,
                    artBg: sameCategory && prev.artBg ? prev.artBg : artStyle.artBg,
                    artAccent: sameCategory && prev.artAccent ? prev.artAccent : artStyle.artAccent,
                    desc: desc,
                    image: pendingProductImage || ""
                };
                if (!updatedRecord.image) {
                    updatedRecord.image = AppData.buildProductIllustrationSvg(updatedRecord);
                }
                products[idx] = updatedRecord;
            }

            if (!AppData.saveProducts(products)) {
                AppUI.error({
                    title: "Không thể lưu sản phẩm",
                    message: "Bộ nhớ trình duyệt đã đầy hoặc bị chặn. Vui lòng thử ảnh nhỏ hơn."
                });
                return;
            }

            const imageLabel = isCustomUploadedImage(pendingProductImage) ? "Ảnh tùy chỉnh đã tải lên" : "Ảnh minh họa mặc định";
            pendingProductImage = "";
            renderProductsTable();
            renderReport();
            productModal.classList.add("hidden");

            AppUI.success({
                title: isAdd ? "Đã thêm sản phẩm mới" : "Đã cập nhật sản phẩm",
                message: "Thông tin sản phẩm đã được lưu và đồng bộ trực tiếp sang trang Khách Hàng.",
                details: [
                    ["Mã sản phẩm", finalCode],
                    ["Tên sản phẩm", name],
                    ["Danh mục", `${category} · ${age}`],
                    ["Giá bán", discount > 0 ? `${formatCatalogVnd(price)} (Giảm ${discount}%)` : formatCatalogVnd(price)],
                    ["Hình ảnh", imageLabel]
                ]
            });
        });
    }

    /* Báo cáo, tìm kiếm và điều hướng nhanh */
    const reportPeriod = document.getElementById("report-period");
    const btnReportRefresh = document.getElementById("btn-report-refresh");
    const btnHeaderRefresh = document.getElementById("btn-header-refresh");
    const btnReportExport = document.getElementById("btn-report-export");
    const btnHeroExport = document.getElementById("btn-hero-export");
    const btnReportPrint = document.getElementById("btn-report-print");

    function refreshOwnerWorkspace() {
        if (typeof AppData.refreshFromDatabase === "function") {
            AppData.refreshFromDatabase();
            staffList = AppData.loadStaff();
        }
        updateOwnerDatabasePill();
        renderStaffTable();
        renderServicesTable();
        renderProductsTable();
        renderReport();
    }

    if (reportPeriod) {
        reportPeriod.addEventListener("change", renderReport);
    }
    if (btnReportRefresh) {
        btnReportRefresh.addEventListener("click", refreshOwnerWorkspace);
    }
    if (btnHeaderRefresh) {
        btnHeaderRefresh.addEventListener("click", refreshOwnerWorkspace);
    }
    if (btnReportExport) {
        btnReportExport.addEventListener("click", exportReportCsv);
    }
    if (btnHeroExport) {
        btnHeroExport.addEventListener("click", exportReportCsv);
    }
    if (btnReportPrint) {
        btnReportPrint.addEventListener("click", function () {
            window.print();
        });
    }

    /* Bộ lọc từng bảng và tìm kiếm toàn trang */
    const tableFilterPairs = [
        ["staff-table-search", renderStaffTable],
        ["service-table-search", renderServicesTable],
        ["product-table-search", renderProductsTable]
    ];
    tableFilterPairs.forEach(([inputId, renderFn]) => {
        const el = document.getElementById(inputId);
        if (el) {
            el.addEventListener("input", debounceOwner(renderFn, 120));
        }
    });

    const ownerGlobalSearch = document.getElementById("owner-global-search");
    const ownerGlobalSearchForm = document.getElementById("owner-global-search-form");
    if (ownerGlobalSearch) {
        ownerGlobalSearch.addEventListener("input", debounceOwner(function () {
            const val = ownerGlobalSearch.value || "";
            tableFilterPairs.forEach(([inputId]) => {
                const el = document.getElementById(inputId);
                if (el) el.value = val;
            });
            renderStaffTable();
            renderServicesTable();
            renderProductsTable();
        }, 140));
    }
    if (ownerGlobalSearchForm) {
        ownerGlobalSearchForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const q = ownerGlobalSearch ? ownerGlobalSearch.value.trim() : "";
            openReportKpiDetail(activeReportKpiKey || "orders");
            const modalSearch = document.getElementById("report-detail-search");
            if (modalSearch && q) {
                modalSearch.value = q;
                renderReportKpiDetailContent();
            }
        });
    }

    /* Điều hướng sidebar và nút thêm nhanh */
    const sidebarNavItems = document.querySelectorAll(".owner-sidebar [data-scroll-target]");
    document.querySelectorAll("[data-scroll-target]").forEach(btn => {
        btn.addEventListener("click", function (e) {
            const targetId = btn.getAttribute("data-scroll-target");
            const targetEl = targetId ? document.getElementById(targetId) : null;
            if (!targetEl) return;
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            sidebarNavItems.forEach(item => {
                item.classList.toggle("active", item.getAttribute("data-scroll-target") === targetId);
            });
        });
    });

    document.querySelectorAll("[data-open-kpi]").forEach(btn => {
        btn.addEventListener("click", function () {
            const kpiKey = btn.getAttribute("data-open-kpi") || "orders";
            openReportKpiDetail(kpiKey);
        });
    });

    [
        ["btn-side-add-staff", "btn-open-staff-modal"],
        ["btn-hero-add-staff", "btn-open-staff-modal"],
        ["btn-side-add-service", "btn-open-service-modal"],
        ["btn-hero-add-service", "btn-open-service-modal"],
        ["btn-side-add-product", "btn-open-product-modal"],
        ["btn-hero-add-product", "btn-open-product-modal"]
    ].forEach(([triggerId, targetBtnId]) => {
        const triggerEl = document.getElementById(triggerId);
        if (triggerEl) {
            triggerEl.addEventListener("click", function () {
                const targetBtn = document.getElementById(targetBtnId);
                if (targetBtn) targetBtn.click();
            });
        }
    });

    updateOwnerDatabasePill();
    renderReport();

    const reportDetailModal = document.getElementById("report-detail-modal");
    const btnCloseReportDetail = document.getElementById("btn-close-report-detail");
    const btnCloseReportDetailTop = document.getElementById("btn-close-report-detail-top");
    const reportDetailSearch = document.getElementById("report-detail-search");

    function closeReportDetailModal() {
        if (reportDetailModal) {
            reportDetailModal.classList.add("hidden");
        }
    }

    if (btnCloseReportDetail) {
        btnCloseReportDetail.addEventListener("click", closeReportDetailModal);
    }
    if (btnCloseReportDetailTop) {
        btnCloseReportDetailTop.addEventListener("click", closeReportDetailModal);
    }
    if (reportDetailModal) {
        reportDetailModal.addEventListener("click", function (e) {
            if (e.target === reportDetailModal) {
                closeReportDetailModal();
            }
        });
    }
    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        if (document.querySelector(".app-modal-overlay")) return;
        const topModals = ["customer-admin-modal", "booking-admin-modal", "order-admin-modal", "shift-admin-modal", "service-modal", "product-modal", "staff-modal"];
        for (let i = 0; i < topModals.length; i++) {
            const el = document.getElementById(topModals[i]);
            if (el && !el.classList.contains("hidden")) {
                el.classList.add("hidden");
                return;
            }
        }
        if (reportDetailModal && !reportDetailModal.classList.contains("hidden")) {
            closeReportDetailModal();
        }
    });

    document.querySelectorAll("#report-detail-tabs .report-detail-tab").forEach(tabBtn => {
        tabBtn.addEventListener("click", function () {
            activeReportKpiKey = tabBtn.getAttribute("data-kpi") || "customers";
            renderReportKpiDetailContent();
        });
    });

    if (reportDetailSearch) {
        reportDetailSearch.addEventListener("input", debounceOwner(renderReportKpiDetailContent, 120));
    }

    /* Sửa khách hàng */
    const customerAdminModal = document.getElementById("customer-admin-modal");
    const btnCloseCustomerAdminModal = document.getElementById("btn-close-customer-admin-modal");
    const customerAdminForm = document.getElementById("customer-admin-modal-form");

    if (btnCloseCustomerAdminModal) {
        btnCloseCustomerAdminModal.addEventListener("click", function () {
            if (customerAdminModal) customerAdminModal.classList.add("hidden");
        });
    }

    if (customerAdminForm) {
        customerAdminForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const origEmail = document.getElementById("customer-edit-orig-email").value.trim().toLowerCase();
            const isLegacy = document.getElementById("customer-edit-is-legacy").value === "1";
            const fullname = document.getElementById("modal-customer-fullname").value.trim();
            const newEmail = document.getElementById("modal-customer-email").value.trim();
            const newEmailLower = newEmail.toLowerCase();
            const password = document.getElementById("modal-customer-password").value;
            const phone = document.getElementById("modal-customer-phone").value.trim();
            const dob = document.getElementById("modal-customer-dob").value;
            const address = document.getElementById("modal-customer-address").value.trim();

            const users = AppData.loadUsers();
            const duplicate = users.some(u =>
                u && u.email &&
                u.email.trim().toLowerCase() === newEmailLower &&
                u.email.trim().toLowerCase() !== origEmail
            );
            if (duplicate) {
                AppUI.error({
                    title: "Tài khoản đã tồn tại",
                    message: `Tài khoản "${newEmail}" đang được sử dụng bởi người dùng khác.`
                });
                return;
            }

            if (isLegacy) {
                users.push({
                    fullname: fullname,
                    email: newEmail,
                    password: password,
                    role: "khachhang",
                    phone: phone,
                    dob: dob,
                    address: address,
                    avatar: ""
                });
            } else {
                const idx = users.findIndex(u => u && u.role === "khachhang" && (u.email || "").trim().toLowerCase() === origEmail);
                if (idx === -1) {
                    AppUI.error({
                        title: "Không tìm thấy khách hàng",
                        message: "Tài khoản khách hàng này không còn tồn tại."
                    });
                    return;
                }
                users[idx] = Object.assign({}, users[idx], {
                    fullname: fullname,
                    email: newEmail,
                    password: password,
                    phone: phone,
                    dob: dob,
                    address: address
                });
            }

            if (!AppData.saveUsers(users)) {
                AppUI.error({
                    title: "Không thể lưu dữ liệu",
                    message: "Bộ nhớ trình duyệt đã đầy hoặc bị chặn."
                });
                return;
            }

            if (origEmail && newEmailLower !== origEmail) {
                const bookings = AppData.loadServiceBookings();
                let bChanged = false;
                bookings.forEach(bk => {
                    if (bk && (bk.customerEmail || "").trim().toLowerCase() === origEmail) {
                        bk.customerEmail = newEmail;
                        bChanged = true;
                    }
                });
                if (bChanged) AppData.saveServiceBookings(bookings);

                const orders = AppData.loadProductOrders();
                let oChanged = false;
                orders.forEach(ord => {
                    if (ord && (ord.customerEmail || "").trim().toLowerCase() === origEmail) {
                        ord.customerEmail = newEmail;
                        oChanged = true;
                    }
                });
                if (oChanged) AppData.saveProductOrders(orders);

                const oldCart = AppData.loadCart(origEmail);
                if (oldCart.length > 0) {
                    AppData.saveCart(newEmailLower, oldCart);
                    AppData.saveCart(origEmail, []);
                }
            }

            try {
                const khProfile = JSON.parse(localStorage.getItem("khachHangProfile"));
                if (isLegacy || (khProfile && (khProfile.email || "").trim().toLowerCase() === origEmail)) {
                    localStorage.setItem("khachHangProfile", JSON.stringify(Object.assign({}, khProfile || {}, {
                        email: newEmail,
                        fullname: fullname,
                        phone: phone,
                        dob: dob,
                        address: address
                    })));
                }
            } catch (err) {
                // ignore
            }

            customerAdminModal.classList.add("hidden");
            renderReport();
            AppUI.success({
                title: "Đã cập nhật khách hàng",
                message: "Thông tin tài khoản và hồ sơ khách hàng đã được lưu lại.",
                details: [
                    ["Họ và tên", fullname],
                    ["Tài khoản", newEmail],
                    ["Mật khẩu", password],
                    ["Số điện thoại", phone || "Chưa cập nhật"]
                ]
            });
        });
    }

    /* Sửa đăng ký dịch vụ */
    const bookingAdminModal = document.getElementById("booking-admin-modal");
    const btnCloseBookingAdminModal = document.getElementById("btn-close-booking-admin-modal");
    const bookingAdminForm = document.getElementById("booking-admin-modal-form");

    if (btnCloseBookingAdminModal) {
        btnCloseBookingAdminModal.addEventListener("click", function () {
            if (bookingAdminModal) bookingAdminModal.classList.add("hidden");
        });
    }

    if (bookingAdminForm) {
        bookingAdminForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const realIdx = parseInt(document.getElementById("booking-edit-real-index").value, 10);
            const svcSelect = document.getElementById("modal-booking-service");
            const selectedSvcId = svcSelect ? svcSelect.value : "";
            const selectedSvcName = svcSelect && svcSelect.selectedIndex >= 0
                ? svcSelect.options[svcSelect.selectedIndex].textContent
                : "";
            const dateIso = document.getElementById("modal-booking-date").value;
            const customerName = document.getElementById("modal-booking-customer-name").value.trim();
            const customerEmail = document.getElementById("modal-booking-customer-email").value.trim();
            const customerPhone = document.getElementById("modal-booking-customer-phone").value.trim();

            const bookings = AppData.loadServiceBookings();
            if (isNaN(realIdx) || realIdx < 0 || realIdx >= bookings.length) {
                AppUI.error({
                    title: "Không tìm thấy lượt đăng ký",
                    message: "Bản ghi này không còn tồn tại trong hệ thống."
                });
                return;
            }

            const dateObj = AppData.parseISODate(dateIso) || new Date();
            dateObj.setHours(12, 0, 0, 0);

            bookings[realIdx] = Object.assign({}, bookings[realIdx], {
                serviceId: selectedSvcId || bookings[realIdx].serviceId || "",
                name: selectedSvcName || bookings[realIdx].name || "",
                date: AppData.formatDate(dateIso),
                bookedAt: dateObj.toISOString(),
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone
            });

            if (!AppData.saveServiceBookings(bookings)) {
                AppUI.error({
                    title: "Không thể lưu dữ liệu",
                    message: "Không thể cập nhật lượt đăng ký dịch vụ vào cơ sở dữ liệu."
                });
                return;
            }
            bookingAdminModal.classList.add("hidden");
            renderReport();

            AppUI.success({
                title: "Đã cập nhật lượt đăng ký",
                message: "Thông tin đăng ký dịch vụ đã được cập nhật.",
                details: [
                    ["Dịch vụ", selectedSvcName],
                    ["Ngày đăng ký", AppData.formatDate(dateIso)],
                    ["Khách hàng", customerName]
                ]
            });
        });
    }

    /* Sửa đơn hàng sản phẩm */
    const orderAdminModal = document.getElementById("order-admin-modal");
    const btnCloseOrderAdminModal = document.getElementById("btn-close-order-admin-modal");
    const orderAdminForm = document.getElementById("order-admin-modal-form");

    if (btnCloseOrderAdminModal) {
        btnCloseOrderAdminModal.addEventListener("click", function () {
            if (orderAdminModal) orderAdminModal.classList.add("hidden");
        });
    }

    if (orderAdminForm) {
        orderAdminForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const realIdx = parseInt(document.getElementById("order-edit-real-index").value, 10);
            const statusVal = document.getElementById("modal-order-status").value || "pending";
            const dateIso = document.getElementById("modal-order-date").value;
            const customerName = document.getElementById("modal-order-customer-name").value.trim();
            const customerPhone = document.getElementById("modal-order-customer-phone").value.trim();
            const customerEmail = document.getElementById("modal-order-customer-email").value.trim();
            const customerAddress = document.getElementById("modal-order-customer-address").value.trim();
            const recallMessage = document.getElementById("modal-order-recall-message").value.trim();

            const orders = AppData.loadProductOrders();
            if (isNaN(realIdx) || realIdx < 0 || realIdx >= orders.length) {
                AppUI.error({
                    title: "Không tìm thấy đơn hàng",
                    message: "Đơn hàng này không còn tồn tại trong hệ thống."
                });
                return;
            }

            const prev = orders[realIdx];
            const dateObj = AppData.parseISODate(dateIso) || new Date();
            dateObj.setHours(12, 0, 0, 0);
            const nowIso = new Date().toISOString();

            const nextOrd = Object.assign({}, prev, {
                date: AppData.formatDate(dateIso),
                orderedAt: dateObj.toISOString(),
                customerName: customerName,
                customerPhone: customerPhone,
                customerEmail: customerEmail,
                customerAddress: customerAddress,
                status: statusVal
            });

            if (statusVal === "pending") {
                nextOrd.confirmedBy = "";
                nextOrd.confirmedAt = "";
                nextOrd.recalledBy = "";
                nextOrd.recalledAt = "";
                nextOrd.recallMessage = "";
                delete nextOrd.recallSeenByCustomer;
            } else if (statusVal === "confirmed") {
                nextOrd.confirmedBy = prev.confirmedBy || ownerName;
                nextOrd.confirmedAt = prev.confirmedAt || nowIso;
                nextOrd.recalledBy = "";
                nextOrd.recalledAt = "";
                nextOrd.recallMessage = "";
                delete nextOrd.recallSeenByCustomer;
            } else if (statusVal === "recalled") {
                nextOrd.recalledBy = prev.recalledBy || ownerName;
                nextOrd.recalledAt = prev.recalledAt || nowIso;
                nextOrd.recallMessage = recallMessage || prev.recallMessage || "Thu hồi bởi Chủ cơ sở";
                if (prev.status !== "recalled") {
                    nextOrd.recallSeenByCustomer = false;
                }
            }

            orders[realIdx] = nextOrd;
            if (!AppData.saveProductOrders(orders)) {
                AppUI.error({
                    title: "Không thể lưu đơn hàng",
                    message: "Bộ nhớ trình duyệt đã đầy hoặc bị chặn."
                });
                return;
            }

            orderAdminModal.classList.add("hidden");
            renderReport();

            const statusLabels = {
                pending: "Chờ xác nhận",
                confirmed: "Đã xác nhận",
                recalled: "Đã thu hồi"
            };
            AppUI.success({
                title: "Đã cập nhật đơn hàng",
                message: "Thông tin đơn hàng sản phẩm đã được cập nhật và đồng bộ.",
                details: [
                    ["Mã đơn hàng", nextOrd.code || "—"],
                    ["Trạng thái", statusLabels[statusVal] || statusVal],
                    ["Người nhận", `${customerName} (${customerPhone || "Chưa có SĐT"})`],
                    ["Tổng tiền", formatCatalogVnd(nextOrd.totalAmount)]
                ]
            });
        });
    }

    /* Sửa ca trực */
    const shiftAdminModal = document.getElementById("shift-admin-modal");
    const btnCloseShiftAdminModal = document.getElementById("btn-close-shift-admin-modal");
    const shiftAdminForm = document.getElementById("shift-admin-modal-form");

    if (btnCloseShiftAdminModal) {
        btnCloseShiftAdminModal.addEventListener("click", function () {
            if (shiftAdminModal) shiftAdminModal.classList.add("hidden");
        });
    }

    if (shiftAdminForm) {
        shiftAdminForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const realIdx = parseInt(document.getElementById("shift-edit-real-index").value, 10);
            const staffOptVal = document.getElementById("modal-shift-staff").value;
            const newDate = document.getElementById("modal-shift-date").value;
            const newShiftKey = document.getElementById("modal-shift-key").value;

            const shifts = AppData.loadShifts();
            if (isNaN(realIdx) || realIdx < 0 || realIdx >= shifts.length) {
                AppUI.error({
                    title: "Không tìm thấy ca trực",
                    message: "Ca trực này không còn tồn tại trong hệ thống."
                });
                return;
            }

            const prevShift = shifts[realIdx];
            let nextStaff = prevShift.staff;
            let nextEmail = prevShift.staffEmail || "";
            let nextPhone = prevShift.staffPhone || "";

            if (staffOptVal && staffOptVal.indexOf("idx:") === 0) {
                const stIdx = parseInt(staffOptVal.slice(4), 10);
                if (staffList[stIdx]) {
                    nextStaff = staffList[stIdx].name || "";
                    nextEmail = staffList[stIdx].email || "";
                    nextPhone = staffList[stIdx].phone || "";
                }
            }

            const emailLower = nextEmail.trim().toLowerCase();
            const conflict = shifts.some((s, idx) => {
                if (idx === realIdx || !s) return false;
                if (s.date !== newDate || s.shiftKey !== newShiftKey) return false;
                const sEmail = (s.staffEmail || "").trim().toLowerCase();
                if (emailLower && sEmail) return emailLower === sEmail;
                return (s.staff || "").trim().toLowerCase() === nextStaff.trim().toLowerCase();
            });
            if (conflict) {
                AppUI.warning({
                    title: "Trùng ca trực",
                    message: `Nhân viên "${nextStaff}" đã có ${AppData.shiftLabel(newShiftKey)} vào ngày ${AppData.formatDate(newDate)}.`
                });
                return;
            }

            const dateObj = AppData.parseISODate(newDate);
            const monday = dateObj ? AppData.getMonday(dateObj) : null;
            const dayIdx = dateObj ? (dateObj.getDay() + 6) % 7 : 0;

            shifts[realIdx] = Object.assign({}, prevShift, {
                date: newDate,
                weekStart: monday ? AppData.toISODate(monday) : (prevShift.weekStart || ""),
                day: dateObj ? AppData.DAY_NAMES[dayIdx] : (prevShift.day || ""),
                shiftKey: newShiftKey,
                time: AppData.shiftLabel(newShiftKey),
                staff: nextStaff,
                staffEmail: nextEmail,
                staffPhone: nextPhone
            });

            AppData.saveShifts(shifts);
            shiftAdminModal.classList.add("hidden");
            renderStaffTable();
            renderReport();

            AppUI.success({
                title: "Đã cập nhật ca trực",
                message: "Lịch ca trực đã được cập nhật và đồng bộ với trang Nhân Viên.",
                details: [
                    ["Nhân viên", nextStaff],
                    ["Ngày trực", `${AppData.formatDate(newDate)} (${shifts[realIdx].day})`],
                    ["Ca trực", AppData.shiftLabel(newShiftKey)]
                ]
            });
        });
    }

    [customerAdminModal, bookingAdminModal, orderAdminModal, shiftAdminModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                modal.classList.add("hidden");
            }
        });
    });

    window.addEventListener("storage", function (e) {
        if (e.key === AppData.SERVICES_KEY) {
            renderServicesTable();
            renderReport();
        }
        if (e.key === AppData.PRODUCTS_KEY) {
            renderProductsTable();
            renderReport();
        }
        if (e.key === "users" || e.key === "facilityStaffList" || e.key === AppData.SHIFTS_KEY || e.key === "myServices" || e.key === AppData.PRODUCT_ORDERS_KEY || e.key === "khachHangProfile") {
            if (e.key === "facilityStaffList") {
                staffList = AppData.loadStaff();
            }
            renderStaffTable();
            renderReport();
        }
    });
});
