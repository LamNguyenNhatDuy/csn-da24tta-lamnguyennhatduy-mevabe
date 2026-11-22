document.addEventListener('DOMContentLoaded', function() {
    const currentUser = AppData.requireRole('khachhang', '../html-dangki-dangnhap/login.html');
    if (!currentUser) return;

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            AppUI.confirm({
                title: 'Xác nhận đăng xuất',
                message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản khách hàng?',
                confirmText: 'Đăng xuất',
                cancelText: 'Ở lại',
                onConfirm: function() {
                    AppData.logout('../html-dangki-dangnhap/login.html');
                }
            });
        });
    }

    /* =========================================================
       TOAST THÔNG BÁO NHANH
       ========================================================= */
    const toastEl = document.getElementById('kh-toast');
    let toastTimer = null;
    function showToast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function() {
            toastEl.classList.add('hidden');
        }, 2400);
    }

    /* =========================================================
       PHẦN 1: THÔNG TIN CÁ NHÂN, ẢNH ĐẠI DIỆN, DỊCH VỤ & ĐƠN HÀNG
       ========================================================= */
    const profileDisplay = document.getElementById('profile-display');
    const profileForm = document.getElementById('profile-form');
    const btnEdit = document.getElementById('btn-edit');
    const btnCancel = document.getElementById('btn-cancel');

    const dispFullname = document.getElementById('disp-fullname');
    const dispPhone = document.getElementById('disp-phone');
    const dispDob = document.getElementById('disp-dob');
    const dispAddress = document.getElementById('disp-address');

    const inputFullname = document.getElementById('fullname');
    const inputPhone = document.getElementById('phone');
    const inputDob = document.getElementById('dob');
    const inputAddress = document.getElementById('address');

    const headerAvatar = document.getElementById('header-avatar');
    const headerUsername = document.getElementById('header-username');
    const profileAvatarDisplay = document.getElementById('profile-avatar-display');
    const profileAvatarName = document.getElementById('profile-avatar-name');

    const avatarPreview = document.getElementById('avatar-preview');
    const avatarInput = document.getElementById('avatar-input');
    const btnChooseAvatar = document.getElementById('btn-choose-avatar');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');

    let pendingAvatar = '';

    function formatCurrency(num) {
        return Number(num || 0).toLocaleString('vi-VN') + 'đ';
    }

    function getSavedProfile() {
        const users = AppData.loadUsers();
        const userRecord = users.find(u =>
            u && u.role === 'khachhang' &&
            (u.email || '').toLowerCase() === (currentUser.email || '').toLowerCase()
        );

        let fallback = {};
        try {
            const legacy = JSON.parse(localStorage.getItem('khachHangProfile'));
            if (legacy && (!legacy.email || legacy.email.toLowerCase() === (currentUser.email || '').toLowerCase())) {
                fallback = legacy;
            }
        } catch (err) {
            fallback = {};
        }

        const identityIsPhone = /^0\d{8,10}$/.test(currentUser.email || '');
        const source = userRecord || {};
        return {
            email: currentUser.email || '',
            fullname: source.fullname || fallback.fullname || currentUser.fullname || '',
            phone: source.phone || fallback.phone || (identityIsPhone ? currentUser.email : ''),
            dob: source.dob || fallback.dob || '',
            address: source.address || fallback.address || '',
            avatar: source.avatar !== undefined ? source.avatar : (fallback.avatar || '')
        };
    }

    function saveCustomerProfile(profileData) {
        const users = AppData.loadUsers();
        const idx = users.findIndex(u =>
            u && u.role === 'khachhang' &&
            (u.email || '').toLowerCase() === (currentUser.email || '').toLowerCase()
        );

        if (idx !== -1) {
            users[idx].fullname = profileData.fullname;
            users[idx].phone = profileData.phone;
            users[idx].dob = profileData.dob;
            users[idx].address = profileData.address;
            users[idx].avatar = profileData.avatar;
            if (!AppData.saveUsers(users)) {
                return false;
            }
        }

        try {
            localStorage.setItem('khachHangProfile', JSON.stringify(profileData));
        } catch (err) {
            return false;
        }

        AppData.setCurrentUser({
            fullname: profileData.fullname,
            email: currentUser.email,
            role: currentUser.role
        });
        currentUser.fullname = profileData.fullname;
        return true;
    }

    function renderAvatarPreview(src, name) {
        if (!avatarPreview) return;
        avatarPreview.innerHTML = '';
        avatarPreview.appendChild(AppUI.createAvatar(src, name || 'Khách hàng', 88));
        if (btnRemoveAvatar) {
            if (src) {
                btnRemoveAvatar.classList.remove('hidden');
            } else {
                btnRemoveAvatar.classList.add('hidden');
            }
        }
    }

    function isBookingOfCurrentCustomer(booking) {
        if (!booking) return false;
        if (!booking.customerEmail) return true;
        return booking.customerEmail.toLowerCase() === (currentUser.email || '').toLowerCase();
    }

    function renderMyProductOrders() {
        const ordersListEl = document.getElementById('my-product-orders-list');
        if (!ordersListEl) return;

        const allOrders = AppData.loadProductOrders();
        const myOrders = [];
        allOrders.forEach((order, realIndex) => {
            if (order && (!order.customerEmail || order.customerEmail.toLowerCase() === (currentUser.email || '').toLowerCase())) {
                myOrders.push({ order: order, realIndex: realIndex });
            }
        });

        ordersListEl.innerHTML = '';
        if (myOrders.length === 0) {
            ordersListEl.innerHTML = '<li>Chưa có đơn hàng sản phẩm nào.</li>';
            return;
        }

        const productsMap = new Map();
        AppData.loadProducts().forEach(p => {
            if (p && p.id) productsMap.set(p.id, p);
        });

        myOrders.forEach(entry => {
            const ord = entry.order;
            const items = Array.isArray(ord.items) ? ord.items : [];
            const itemCount = items.reduce((sum, it) => sum + (it.qty || 1), 0);
            const orderedTime = ord.orderedAt ? new Date(ord.orderedAt).toLocaleString('vi-VN') : (ord.date || '');
            const isRecalled = ord.status === 'recalled' || Boolean(ord.recalledBy);
            const isConfirmed = !isRecalled && (ord.status === 'confirmed' || Boolean(ord.confirmedBy));
            const confirmedTime = ord.confirmedAt ? new Date(ord.confirmedAt).toLocaleString('vi-VN') : '';
            const confirmerName = ord.confirmedBy || 'Nhân viên';
            const recalledTime = ord.recalledAt ? new Date(ord.recalledAt).toLocaleString('vi-VN') : '';
            const recallerName = ord.recalledBy || 'Nhân viên';
            const recallMessage = (ord.recallMessage || '').trim();

            const li = document.createElement('li');
            li.className = 'booked-detail-card';

            const itemRowsHtml = items.map(it => {
                const matchedProd = it.id ? productsMap.get(it.id) : null;
                const codeStr = AppData.formatProductCode(it.code || (matchedProd && matchedProd.code) || it.id || '');
                const unitPrice = Number(it.price || 0);
                const qty = Number(it.qty || 1);
                return `
                    <div class="booked-order-item-row">
                        <div>
                            ${codeStr ? `<span class="product-code-chip">Mã ${AppUI.escapeHtml(codeStr)}</span>` : ''}
                            <strong>${AppUI.escapeHtml(it.name || 'Sản phẩm')}</strong>
                            <span style="color: var(--text-muted);">(${formatCurrency(unitPrice)} × ${qty})</span>
                        </div>
                        <span style="font-weight: 600;">${formatCurrency(unitPrice * qty)}</span>
                    </div>
                `;
            }).join('');

            const statusBadgeHtml = isRecalled
                ? `<span class="booked-status-pill recalled">! Đã thu hồi</span>`
                : (isConfirmed
                    ? `<span class="booked-status-pill confirmed">✓ Đã xác nhận</span>`
                    : `<span class="booked-status-pill pending">Chờ nhân viên xác nhận</span>`);

            const confirmedNoteHtml = isRecalled
                ? `<div class="booked-recalled-note"><div><strong>! Đơn hàng đã bị thu hồi bởi nhân viên:</strong> ${AppUI.escapeHtml(recallerName)}${recalledTime ? ` (${AppUI.escapeHtml(recalledTime)})` : ''}</div>${recallMessage ? `<div style="margin-top:4px;"><strong>Lời nhắn:</strong> ${AppUI.escapeHtml(recallMessage)}</div>` : ''}</div>`
                : (isConfirmed
                    ? `<div class="booked-confirmed-note">✓ Đã xác nhận bởi nhân viên: ${AppUI.escapeHtml(confirmerName)}${confirmedTime ? ` (${AppUI.escapeHtml(confirmedTime)})` : ''} · Không thể hủy đơn</div>`
                    : '');

            const cancelActionHtml = isRecalled
                ? `<button type="button" class="booked-btn-locked" disabled title="Đơn hàng đã bị nhân viên thu hồi">Đã thu hồi</button>`
                : (isConfirmed
                    ? `<button type="button" class="booked-btn-locked" disabled title="Nhân viên đã xác nhận đơn hàng, không thể hủy">Không thể hủy</button>`
                    : `<button type="button" class="booked-btn-cancel">Hủy đơn</button>`);

            li.innerHTML = `
                <div class="booked-detail-top">
                    <div>
                        <span class="booked-code-label">Đơn ${AppUI.escapeHtml(ord.code || '—')}</span>
                        <span class="booked-date-label"> · ${AppUI.escapeHtml(orderedTime)} · ${itemCount} sản phẩm</span>
                    </div>
                    ${statusBadgeHtml}
                </div>
                ${confirmedNoteHtml}
                <div class="booked-order-items">${itemRowsHtml || '<div style="color: var(--text-muted);">Không có chi tiết sản phẩm</div>'}</div>
                <div class="booked-meta-line">
                    <strong>Người nhận:</strong> ${AppUI.escapeHtml(ord.customerName || 'Chưa cập nhật')} ·
                    <strong>SĐT:</strong> ${AppUI.escapeHtml(ord.customerPhone || 'Chưa cập nhật')} ·
                    <strong>Giao đến:</strong> ${AppUI.escapeHtml(ord.customerAddress || 'Chưa cập nhật')}
                </div>
                <div class="booked-actions-row">
                    <span class="booked-total-price">Tổng tiền: ${formatCurrency(ord.totalAmount)}</span>
                    <div class="booked-btn-group">
                        <button type="button" class="booked-btn-detail">Chi tiết</button>
                        ${cancelActionHtml}
                    </div>
                </div>
            `;

            const btnDetail = li.querySelector('.booked-btn-detail');
            const btnCancelOrder = li.querySelector('.booked-btn-cancel');

            btnDetail.addEventListener('click', function() {
                const detailStatusText = isRecalled
                    ? `Đã thu hồi bởi ${recallerName}`
                    : (isConfirmed ? `Đã xác nhận bởi ${confirmerName}` : 'Chờ nhân viên xác nhận');
                const detailRows = [
                    ['Mã đơn hàng', ord.code || '—'],
                    ['Trạng thái', detailStatusText],
                    ['Thời gian đặt', orderedTime || '—'],
                    ['Người nhận', `${ord.customerName || 'Chưa cập nhật'} (${ord.customerPhone || 'Chưa có SĐT'})`],
                    ['Địa chỉ giao hàng', ord.customerAddress || 'Chưa cập nhật'],
                    ['Tổng thanh toán', formatCurrency(ord.totalAmount)]
                ];
                if (isRecalled) {
                    if (recallMessage) {
                        detailRows.splice(2, 0, ['Lời nhắn thu hồi', recallMessage]);
                    }
                    if (recalledTime) {
                        detailRows.splice(2, 0, ['Thời gian thu hồi', recalledTime]);
                    }
                } else if (isConfirmed && confirmedTime) {
                    detailRows.splice(2, 0, ['Thời gian xác nhận', confirmedTime]);
                }

                AppUI.success({
                    title: `Chi tiết đơn hàng ${ord.code || ''}`,
                    message: 'Thông tin đầy đủ về sản phẩm và địa chỉ giao hàng của đơn đã đặt:',
                    details: detailRows,
                    table: {
                        headers: ['Mã SP', 'Sản phẩm', 'Đơn giá', 'SL', 'Thành tiền'],
                        rows: items.map(it => {
                            const matchedProd = it.id ? productsMap.get(it.id) : null;
                            const codeStr = AppData.formatProductCode(it.code || (matchedProd && matchedProd.code) || it.id || '');
                            const unitPrice = Number(it.price || 0);
                            const qty = Number(it.qty || 1);
                            return [
                                codeStr || '—',
                                it.name || '',
                                formatCurrency(unitPrice),
                                String(qty),
                                formatCurrency(unitPrice * qty)
                            ];
                        })
                    }
                });
            });

            if (btnCancelOrder) {
                btnCancelOrder.addEventListener('click', function() {
                    AppUI.confirm({
                        title: 'Xác nhận hủy đơn hàng',
                        message: `Bạn có chắc chắn muốn hủy đơn hàng ${ord.code || ''} (${formatCurrency(ord.totalAmount)}) không?`,
                        danger: true,
                        confirmText: 'Hủy đơn',
                        cancelText: 'Giữ lại',
                        onConfirm: function() {
                            const latest = AppData.loadProductOrders();
                            const target = latest[entry.realIndex];
                            if (target && (target.status === 'recalled' || target.recalledBy)) {
                                renderMyProductOrders();
                                AppUI.warning({
                                    title: 'Đơn hàng đã bị thu hồi',
                                    message: `Đơn hàng này đã được nhân viên "${target.recalledBy || 'Nhân viên'}" thu hồi.${target.recallMessage ? ` Lời nhắn: ${target.recallMessage}` : ''}`
                                });
                                return;
                            }
                            if (target && (target.status === 'confirmed' || target.confirmedBy)) {
                                renderMyProductOrders();
                                AppUI.warning({
                                    title: 'Không thể hủy đơn hàng',
                                    message: `Đơn hàng này đã được nhân viên "${target.confirmedBy || 'Nhân viên'}" xác nhận nên không thể hủy.`
                                });
                                return;
                            }
                            if (entry.realIndex >= 0 && entry.realIndex < latest.length) {
                                latest.splice(entry.realIndex, 1);
                                AppData.saveProductOrders(latest);
                            }
                            renderMyProductOrders();
                            renderProductsGrid();
                            AppUI.success({
                                title: 'Đã hủy đơn hàng',
                                message: `Đơn hàng ${ord.code || ''} đã được hủy.`
                            });
                        }
                    });
                });
            }

            ordersListEl.appendChild(li);
        });
    }

    function loadProfileData() {
        const data = getSavedProfile();
        dispFullname.textContent = data.fullname || 'Chưa cập nhật';
        dispPhone.textContent = data.phone || 'Chưa cập nhật';
        dispDob.textContent = data.dob || 'Chưa cập nhật';
        dispAddress.textContent = data.address || 'Chưa cập nhật';

        const displayName = data.fullname || currentUser.email || 'Khách hàng';
        if (headerAvatar) {
            headerAvatar.innerHTML = '';
            headerAvatar.appendChild(AppUI.createAvatar(data.avatar, displayName, 32));
        }
        if (headerUsername) {
            headerUsername.textContent = displayName;
        }
        if (profileAvatarDisplay) {
            profileAvatarDisplay.innerHTML = '';
            profileAvatarDisplay.appendChild(AppUI.createAvatar(data.avatar, displayName, 88));
        }
        if (profileAvatarName) {
            profileAvatarName.textContent = displayName;
        }

        // Tải danh sách dịch vụ đã đăng ký kèm nút Thu hồi
        const bookedListContainer = document.getElementById('my-booked-services-list');
        let allBookedServices = [];
        try {
            allBookedServices = JSON.parse(localStorage.getItem('myServices')) || [];
        } catch (err) {
            allBookedServices = [];
        }

        const myEntries = [];
        allBookedServices.forEach((item, realIndex) => {
            if (isBookingOfCurrentCustomer(item)) {
                myEntries.push({ item: item, realIndex: realIndex });
            }
        });

        const inlineServiceCount = document.getElementById('inline-service-count');
        if (inlineServiceCount) {
            inlineServiceCount.textContent = String(myEntries.length);
        }

        bookedListContainer.innerHTML = '';
        if (myEntries.length === 0) {
            bookedListContainer.innerHTML = '<li>Chưa có dịch vụ nào được đăng ký.</li>';
        } else {
            const servicesList = AppData.loadServices();
            const svcById = new Map();
            const svcByName = new Map();
            servicesList.forEach(s => {
                if (!s) return;
                if (s.id) svcById.set(s.id, s);
                if (s.name) svcByName.set(s.name.trim().toLowerCase(), s);
            });

            myEntries.forEach(entry => {
                const item = entry.item;
                const matchedSvc = (item.serviceId && svcById.get(item.serviceId)) ||
                    (item.name && svcByName.get(item.name.trim().toLowerCase())) || {};
                const imgSrc = matchedSvc.image || AppData.buildServiceIllustrationSvg(matchedSvc);
                const benefits = Array.isArray(matchedSvc.benefits) ? matchedSvc.benefits : [];
                const priceLabel = matchedSvc.price > 0 ? formatCurrency(matchedSvc.price) : 'Liên hệ tư vấn';
                const bookedTime = item.bookedAt ? new Date(item.bookedAt).toLocaleString('vi-VN') : (item.date || '');
                const bookingCode = item.id || 'DV';
                const isRecalled = item.status === 'recalled' || Boolean(item.recalledBy);
                const isConfirmed = !isRecalled && (item.status === 'confirmed' || Boolean(item.confirmedBy));
                const confirmedTime = item.confirmedAt ? new Date(item.confirmedAt).toLocaleString('vi-VN') : '';
                const confirmerName = item.confirmedBy || 'Nhân viên';
                const recalledTime = item.recalledAt ? new Date(item.recalledAt).toLocaleString('vi-VN') : '';
                const recallerName = item.recalledBy || 'Nhân viên';
                const recallMessage = (item.recallMessage || '').trim();

                const statusBadgeHtml = isRecalled
                    ? `<span class="booked-status-pill recalled">! Đã thu hồi</span>`
                    : (isConfirmed
                        ? `<span class="booked-status-pill confirmed">✓ Đã xác nhận</span>`
                        : `<span class="booked-status-pill pending">Chờ nhân viên xác nhận</span>`);

                const confirmedNoteHtml = isRecalled
                    ? `<div class="booked-recalled-note"><div><strong>! Dịch vụ đã bị thu hồi bởi nhân viên:</strong> ${AppUI.escapeHtml(recallerName)}${recalledTime ? ` (${AppUI.escapeHtml(recalledTime)})` : ''}</div>${recallMessage ? `<div style="margin-top:4px;"><strong>Lời nhắn:</strong> ${AppUI.escapeHtml(recallMessage)}</div>` : ''}</div>`
                    : (isConfirmed
                        ? `<div class="booked-confirmed-note">✓ Đã xác nhận bởi nhân viên: ${AppUI.escapeHtml(confirmerName)}${confirmedTime ? ` (${AppUI.escapeHtml(confirmedTime)})` : ''} · Không thể thu hồi</div>`
                        : '');

                const cancelBtnHtml = isRecalled
                    ? `<button type="button" class="booked-btn-locked" disabled title="Dịch vụ đã bị nhân viên thu hồi">Đã thu hồi</button>`
                    : (isConfirmed
                        ? `<button type="button" class="booked-btn-locked" disabled title="Nhân viên đã xác nhận dịch vụ, không thể thu hồi">Không thể thu hồi</button>`
                        : `<button type="button" class="booked-btn-cancel">Thu hồi</button>`);

                const li = document.createElement('li');
                li.className = 'booked-detail-card';

                li.innerHTML = `
                    <div class="booked-detail-top">
                        <div>
                            <span class="booked-code-label">Mã ${AppUI.escapeHtml(bookingCode)}</span>
                            <span class="booked-date-label"> · Đăng ký: ${AppUI.escapeHtml(bookedTime)}</span>
                        </div>
                        ${statusBadgeHtml}
                    </div>
                    ${confirmedNoteHtml}
                    <div class="booked-detail-main">
                        <div class="booked-service-left">
                            <img src="${AppUI.escapeHtml(imgSrc)}" alt="${AppUI.escapeHtml(item.name)}" class="booked-thumb">
                            <div>
                                <div class="booked-item-title">${AppUI.escapeHtml(item.name || 'Dịch vụ chăm sóc')}</div>
                                <div class="booked-meta-line">
                                    ${AppUI.escapeHtml([matchedSvc.category, matchedSvc.target, matchedSvc.location, matchedSvc.duration].filter(Boolean).join(' · ') || 'Dịch vụ chăm sóc Mẹ & Bé')}
                                </div>
                                <div class="booked-meta-line">
                                    <strong>Khách hàng:</strong> ${AppUI.escapeHtml(item.customerName || data.fullname || 'Chưa cập nhật')} ·
                                    <strong>SĐT:</strong> ${AppUI.escapeHtml(item.customerPhone || data.phone || 'Chưa cập nhật')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="booked-actions-row">
                        <span class="booked-total-price">${priceLabel}${benefits.length > 0 ? ` · ${benefits.length} quyền lợi` : ''}</span>
                        <div class="booked-btn-group">
                            <button type="button" class="booked-btn-detail">Chi tiết</button>
                            ${cancelBtnHtml}
                        </div>
                    </div>
                `;

                const btnServiceDetail = li.querySelector('.booked-btn-detail');
                const btnCancelService = li.querySelector('.booked-btn-cancel');

                btnServiceDetail.addEventListener('click', function() {
                    const serviceDetailStatus = isRecalled
                        ? `Đã thu hồi bởi ${recallerName}`
                        : (isConfirmed ? `Đã xác nhận bởi ${confirmerName}` : 'Chờ nhân viên xác nhận');
                    const detailsArr = [
                        ['Mã đăng ký', bookingCode],
                        ['Trạng thái', serviceDetailStatus],
                        ['Ngày giờ đăng ký', bookedTime || '—'],
                        ['Giá gói', priceLabel],
                        ['Thời lượng', matchedSvc.duration || 'Linh hoạt'],
                        ['Khách hàng', `${item.customerName || data.fullname || 'Chưa cập nhật'} (${item.customerPhone || data.phone || 'Chưa có SĐT'})`],
                        ['Mô tả', matchedSvc.desc || matchedSvc.shortDesc || 'Đang cập nhật']
                    ];
                    if (isRecalled) {
                        if (recallMessage) {
                            detailsArr.splice(2, 0, ['Lời nhắn thu hồi', recallMessage]);
                        }
                        if (recalledTime) {
                            detailsArr.splice(2, 0, ['Thời gian thu hồi', recalledTime]);
                        }
                    } else if (isConfirmed && confirmedTime) {
                        detailsArr.splice(2, 0, ['Thời gian xác nhận', confirmedTime]);
                    }

                    AppUI.profile({
                        avatar: imgSrc,
                        name: item.name || 'Dịch vụ chăm sóc',
                        subtitle: [matchedSvc.category, matchedSvc.target, matchedSvc.location].filter(Boolean).join(' · ') || 'Thông tin dịch vụ đã đăng ký',
                        details: detailsArr,
                        sections: [
                            {
                                heading: `Quyền lợi đi kèm (${benefits.length})`,
                                table: benefits.length > 0 ? {
                                    headers: ['STT', 'Nội dung quyền lợi'],
                                    rows: benefits.map((b, i) => [String(i + 1), b])
                                } : null,
                                emptyText: 'Đang cập nhật quyền lợi chi tiết.'
                            }
                        ]
                    });
                });

                if (btnCancelService) {
                    btnCancelService.addEventListener('click', function() {
                        AppUI.confirm({
                            title: 'Xác nhận thu hồi dịch vụ',
                            message: `Bạn có chắc chắn muốn thu hồi dịch vụ "${item.name}" không?`,
                            danger: true,
                            confirmText: 'Thu hồi',
                            cancelText: 'Hủy',
                            onConfirm: function() {
                                let latest = [];
                                try {
                                    latest = JSON.parse(localStorage.getItem('myServices')) || [];
                                } catch (err) {
                                    latest = [];
                                }
                                const target = latest[entry.realIndex];
                                if (target && (target.status === 'recalled' || target.recalledBy)) {
                                    loadProfileData();
                                    AppUI.warning({
                                        title: 'Dịch vụ đã bị thu hồi',
                                        message: `Dịch vụ này đã được nhân viên "${target.recalledBy || 'Nhân viên'}" thu hồi.${target.recallMessage ? ` Lời nhắn: ${target.recallMessage}` : ''}`
                                    });
                                    return;
                                }
                                if (target && (target.status === 'confirmed' || target.confirmedBy)) {
                                    loadProfileData();
                                    AppUI.warning({
                                        title: 'Không thể thu hồi dịch vụ',
                                        message: `Dịch vụ này đã được nhân viên "${target.confirmedBy || 'Nhân viên'}" xác nhận nên không thể thu hồi.`
                                    });
                                    return;
                                }
                                if (entry.realIndex >= 0 && entry.realIndex < latest.length) {
                                    latest.splice(entry.realIndex, 1);
                                }
                                try {
                                    localStorage.setItem('myServices', JSON.stringify(latest));
                                } catch (err) {
                                    AppUI.error({
                                        title: 'Lỗi lưu dữ liệu',
                                        message: 'Không thể cập nhật danh sách dịch vụ.'
                                    });
                                    return;
                                }
                                loadProfileData();
                                if (typeof renderServicesGrid === 'function') {
                                    renderServicesGrid();
                                }
                                AppUI.success({
                                    title: 'Đã thu hồi dịch vụ',
                                    message: `Dịch vụ "${item.name}" đã được thu hồi khỏi danh sách của bạn.`
                                });
                            }
                        });
                    });
                }

                bookedListContainer.appendChild(li);
            });
        }

        renderMyProductOrders();
    }

    let isShowingRecallModal = false;

    function getRecallNoticeKey(kind, record) {
        if (!record) return '';
        if (kind === 'service') {
            return `service|${record.id || ''}|${record.recalledAt || ''}|${record.name || ''}`;
        }
        return `order|${record.id || ''}|${record.code || ''}|${record.recalledAt || ''}`;
    }

    function checkUnreadRecallNotices() {
        if (isShowingRecallModal || document.querySelector('.app-modal-overlay')) return;

        let booked = [];
        try {
            booked = JSON.parse(localStorage.getItem('myServices')) || [];
        } catch (err) {
            booked = [];
        }

        const orders = AppData.loadProductOrders();
        const shownServiceKeys = new Set();
        const shownOrderKeys = new Set();
        const rows = [];

        booked.forEach(bk => {
            if (!bk || !isBookingOfCurrentCustomer(bk)) return;
            const isRecalled = bk.status === 'recalled' || Boolean(bk.recalledBy);
            if (!isRecalled || bk.recallSeenByCustomer !== false) return;
            shownServiceKeys.add(getRecallNoticeKey('service', bk));
            rows.push([
                'Dịch vụ',
                `${bk.id ? `[${bk.id}] ` : ''}${bk.name || 'Dịch vụ'}`,
                bk.recalledBy || 'Nhân viên',
                (bk.recallMessage || '').trim() || 'Không có lời nhắn',
                bk.recalledAt ? new Date(bk.recalledAt).toLocaleString('vi-VN') : (bk.date || '—')
            ]);
        });

        orders.forEach(ord => {
            if (!ord || !isBookingOfCurrentCustomer(ord)) return;
            const isRecalled = ord.status === 'recalled' || Boolean(ord.recalledBy);
            if (!isRecalled || ord.recallSeenByCustomer !== false) return;
            shownOrderKeys.add(getRecallNoticeKey('order', ord));
            const itemsSummary = Array.isArray(ord.items) && ord.items.length
                ? ord.items.map(it => `${it.name || 'Sản phẩm'} ×${it.qty || 1}`).join(', ')
                : 'Đơn sản phẩm';
            rows.push([
                'Đơn hàng SP',
                `${ord.code ? `[${ord.code}] ` : ''}${itemsSummary}`,
                ord.recalledBy || 'Nhân viên',
                (ord.recallMessage || '').trim() || 'Không có lời nhắn',
                ord.recalledAt ? new Date(ord.recalledAt).toLocaleString('vi-VN') : (ord.date || '—')
            ]);
        });

        if (!rows.length) return;

        isShowingRecallModal = true;
        AppUI.warning({
            title: 'Thông báo thu hồi đơn hàng / dịch vụ',
            message: `Nhân viên vừa thu hồi ${rows.length} mục đã xác nhận trước đó của bạn. Vui lòng xem chi tiết và lời nhắn bên dưới:`,
            table: {
                headers: ['Loại', 'Mục bị thu hồi', 'Nhân viên', 'Lời nhắn', 'Thời gian'],
                rows
            },
            buttonText: 'Tôi đã hiểu',
            onClose: function() {
                isShowingRecallModal = false;
                if (shownServiceKeys.size > 0) {
                    let latestBooked = [];
                    try {
                        latestBooked = JSON.parse(localStorage.getItem('myServices')) || [];
                    } catch (err) {
                        latestBooked = [];
                    }
                    let changedServices = false;
                    latestBooked.forEach(bk => {
                        if (!bk || !isBookingOfCurrentCustomer(bk)) return;
                        const isRecalled = bk.status === 'recalled' || Boolean(bk.recalledBy);
                        if (isRecalled && bk.recallSeenByCustomer === false && shownServiceKeys.has(getRecallNoticeKey('service', bk))) {
                            bk.recallSeenByCustomer = true;
                            changedServices = true;
                        }
                    });
                    if (changedServices) {
                        try {
                            localStorage.setItem('myServices', JSON.stringify(latestBooked));
                        } catch (err) {
                            // Bỏ qua lỗi lưu cờ đã xem thông báo
                        }
                    }
                }
                if (shownOrderKeys.size > 0) {
                    const latestOrders = AppData.loadProductOrders();
                    let changedOrders = false;
                    latestOrders.forEach(ord => {
                        if (!ord || !isBookingOfCurrentCustomer(ord)) return;
                        const isRecalled = ord.status === 'recalled' || Boolean(ord.recalledBy);
                        if (isRecalled && ord.recallSeenByCustomer === false && shownOrderKeys.has(getRecallNoticeKey('order', ord))) {
                            ord.recallSeenByCustomer = true;
                            changedOrders = true;
                        }
                    });
                    if (changedOrders) {
                        AppData.saveProductOrders(latestOrders);
                    }
                }
            }
        });
    }

    loadProfileData();
    checkUnreadRecallNotices();

    btnEdit.addEventListener('click', function() {
        const saved = getSavedProfile();
        inputFullname.value = dispFullname.textContent !== 'Chưa cập nhật' ? dispFullname.textContent : '';
        inputPhone.value = dispPhone.textContent !== 'Chưa cập nhật' ? dispPhone.textContent : '';
        inputDob.value = dispDob.textContent !== 'Chưa cập nhật' ? dispDob.textContent : '';
        inputAddress.value = dispAddress.textContent !== 'Chưa cập nhật' ? dispAddress.textContent : '';

        pendingAvatar = saved.avatar || '';
        renderAvatarPreview(pendingAvatar, inputFullname.value || 'Khách hàng');

        profileDisplay.classList.add('hidden');
        profileForm.classList.remove('hidden');
    });

    btnCancel.addEventListener('click', function() {
        pendingAvatar = '';
        profileForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');
    });

    if (btnChooseAvatar && avatarInput) {
        btnChooseAvatar.addEventListener('click', function() {
            avatarInput.click();
        });

        avatarInput.addEventListener('change', function() {
            const file = avatarInput.files && avatarInput.files[0];
            if (!file) return;

            AppUI.readImageFile(file, 256)
                .then(function(dataUrl) {
                    pendingAvatar = dataUrl;
                    renderAvatarPreview(pendingAvatar, inputFullname.value || 'Khách hàng');
                })
                .catch(function(err) {
                    AppUI.error({
                        title: 'Không thể tải ảnh đại diện',
                        message: err && err.message ? err.message : 'Vui lòng chọn tệp ảnh hợp lệ.'
                    });
                })
                .finally(function() {
                    avatarInput.value = '';
                });
        });
    }

    if (btnRemoveAvatar) {
        btnRemoveAvatar.addEventListener('click', function() {
            pendingAvatar = '';
            renderAvatarPreview('', inputFullname.value || 'Khách hàng');
        });
    }

    if (inputFullname) {
        inputFullname.addEventListener('input', function() {
            if (!pendingAvatar) {
                renderAvatarPreview('', inputFullname.value || 'Khách hàng');
            }
        });
    }

    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newData = {
            email: currentUser.email || '',
            fullname: inputFullname.value.trim(),
            phone: inputPhone.value.trim(),
            dob: inputDob.value,
            address: inputAddress.value.trim(),
            avatar: pendingAvatar || ''
        };

        if (!saveCustomerProfile(newData)) {
            AppUI.error({
                title: 'Không thể lưu thông tin',
                message: 'Bộ nhớ trình duyệt đã đầy hoặc bị chặn. Vui lòng thử ảnh nhỏ hơn hoặc xóa bớt dữ liệu cũ.'
            });
            return;
        }

        loadProfileData();

        profileForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');

        AppUI.success({
            title: 'Cập nhật thông tin thành công',
            message: 'Thông tin hồ sơ khách hàng của bạn đã được lưu lại.',
            details: [
                ['Họ và tên', newData.fullname || 'Chưa cập nhật'],
                ['Số điện thoại', newData.phone || 'Chưa cập nhật'],
                ['Ngày sinh', newData.dob || 'Chưa cập nhật'],
                ['Địa chỉ', newData.address || 'Chưa cập nhật']
            ]
        });
    });


    function buildPromoBannerElement(slides, slideIdx, extraClass, onSelectSlide, onBannerClick) {
        const slide = slides[slideIdx] || slides[0];
        const banner = document.createElement('div');
        banner.className = extraClass ? `product-promo-banner ${extraClass}` : 'product-promo-banner';

        banner.innerHTML = `
            <div class="promo-slide-body">
                <span class="promo-slide-badge">${AppUI.escapeHtml(slide.badge)}</span>
                <div class="promo-slide-heading">${AppUI.escapeHtml(slide.heading)}</div>
                <p class="promo-slide-sub">${AppUI.escapeHtml(slide.sub)}</p>
                <span class="promo-slide-cta">Xem ngay &rarr;</span>
            </div>
            <div class="promo-dots">
                ${slides.map((_, i) => `<button type="button" class="promo-dot${i === slideIdx ? ' active' : ''}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}
            </div>
            <div class="promo-caption-bar">${AppUI.escapeHtml(slide.caption)}</div>
        `;

        banner.querySelectorAll('.promo-dot').forEach(dot => {
            dot.addEventListener('click', function(e) {
                e.stopPropagation();
                onSelectSlide(parseInt(this.getAttribute('data-slide'), 10) || 0);
            });
        });

        banner.addEventListener('click', function() {
            onBannerClick(slide);
        });

        return banner;
    }

    function syncScopedPillsUI(sectionEl, state) {
        if (!sectionEl) return;
        sectionEl.querySelectorAll('.filter-pill').forEach(btn => {
            const type = btn.getAttribute('data-filter');
            const val = btn.getAttribute('data-value');
            const isActive = (type === 'category' && state.category === val) ||
                (type !== 'category' && state[type] === val);
            btn.classList.toggle('active', isActive);
        });

        sectionEl.querySelectorAll('.quick-pill').forEach(btn => {
            const q = btn.getAttribute('data-quick');
            btn.classList.toggle('active', Boolean(state.quick && state.quick[q]));
        });
    }

    function wireScopedCatalogControls(cfg) {
        const { sectionEl, state, searchEl, sortEl, resetBtn, onChange, onReset } = cfg;
        if (!sectionEl) return;

        sectionEl.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-filter');
                const val = this.getAttribute('data-value');
                if (type === 'category') {
                    state.category = val;
                } else {
                    state[type] = (state[type] === val) ? '' : val;
                }
                syncScopedPillsUI(sectionEl, state);
                onChange();
            });
        });

        sectionEl.querySelectorAll('.quick-pill').forEach(btn => {
            btn.addEventListener('click', function() {
                const q = this.getAttribute('data-quick');
                state.quick[q] = !state.quick[q];
                syncScopedPillsUI(sectionEl, state);
                onChange();
            });
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', onReset);
        }

        if (searchEl) {
            searchEl.addEventListener('input', function() {
                state.search = this.value;
                onChange();
            });
        }

        if (sortEl) {
            sortEl.addEventListener('change', function() {
                state.sort = this.value;
                onChange();
            });
        }
    }

    /* =========================================================
       PHẦN 2: SẢN PHẨM THIẾT YẾU CHO MẸ & BÉ + GIỎ HÀNG
       ========================================================= */
    const productSection = document.getElementById('san-pham');
    const productsGrid = document.getElementById('products-grid');
    const productSearch = document.getElementById('product-search');
    const productSort = document.getElementById('product-sort');
    const productResultCount = document.getElementById('product-result-count');
    const btnResetFilters = document.getElementById('btn-reset-filters');

    const headerCartCount = document.getElementById('header-cart-count');
    const inlineCartCount = document.getElementById('inline-cart-count');
    const btnOpenCart = document.getElementById('btn-open-cart');
    const btnOpenCartInline = document.getElementById('btn-open-cart-inline');

    const productDetailModal = document.getElementById('product-detail-modal');
    const productDetailBody = document.getElementById('product-detail-body');
    const cartModal = document.getElementById('cart-modal');
    const cartModalBody = document.getElementById('cart-modal-body');
    const btnCloseCart = document.getElementById('btn-close-cart');

    const filterState = {
        category: 'all',
        age: '',
        type: '',
        shipping: '',
        quick: {
            freeship: false,
            rating4: false,
            gift: false,
            discount: false
        },
        search: '',
        sort: 'popular'
    };

    const PROMO_SLIDES = [
        {
            badge: 'DINH DƯỠNG CHO BÉ',
            heading: 'Sữa Bột & Sữa Pha Sẵn Chính Hãng',
            sub: 'Đầy đủ dưỡng chất giúp bé tăng cân khỏe mạnh, phát triển chiều cao và trí não.',
            caption: 'Ưu đãi Sữa & Dinh dưỡng thiết yếu cho bé yêu mỗi ngày',
            category: 'Sữa & Dinh dưỡng'
        },
        {
            badge: 'CHĂM SÓC BÉ SƠ SINH',
            heading: 'Tã Bỉm Mềm Mịn – Thoáng Khí Cả Ngày',
            sub: 'Thấm hút vượt trội, bảo vệ làn da nhạy cảm của bé và giao nhanh 1H tại Trà Vinh.',
            caption: 'Combo Tã & Bỉm siêu tiết kiệm kèm Freeship tận nhà',
            category: 'Tã & Bỉm'
        },
        {
            badge: 'BÉ TẬP ĂN DẶM',
            heading: 'Bình Sữa BPA-Free & Máy Hâm Sữa',
            sub: 'Dụng cụ ăn dặm an toàn và thực phẩm hữu cơ đồng hành cùng mẹ chăm con nhàn tênh.',
            caption: 'Bộ bình sữa, máy hâm sữa & bột ăn dặm chuẩn an toàn cho bé',
            category: 'Bình sữa & Ăn dặm'
        },
        {
            badge: 'DÀNH CHO MẸ BẦU',
            heading: 'Đồng Hành Thai Kỳ & Sau Sinh Nhẹ Nhàng',
            sub: 'Sữa bầu ít đường giàu dưỡng chất và máy hút sữa điện đôi êm ái cho mẹ.',
            caption: 'Giải pháp chăm sóc mẹ bầu & mẹ sau sinh toàn diện tại nhà',
            category: 'Mẹ bầu & Sau sinh'
        }
    ];
    let currentSlideIdx = 0;
    let promoTimer = null;

    function getRealSoldCounts() {
        const orders = AppData.loadProductOrders();
        const map = new Map();
        orders.forEach(ord => {
            if (!ord || ord.status === 'recalled' || ord.recalledBy || !Array.isArray(ord.items)) return;
            ord.items.forEach(it => {
                if (!it) return;
                const qty = it.qty || 1;
                if (it.id) map.set(it.id, (map.get(it.id) || 0) + qty);
                if (it.code && it.code !== it.id) {
                    map.set(it.code, (map.get(it.code) || 0) + qty);
                }
            });
        });
        return map;
    }

    function updateCartBadge() {
        const cart = AppData.loadCart(currentUser.email);
        const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        if (headerCartCount) headerCartCount.textContent = String(totalQty);
        if (inlineCartCount) inlineCartCount.textContent = String(totalQty);
    }

    function addToCart(productId, qtyToAdd) {
        const products = AppData.loadProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const productCode = AppData.formatProductCode(product.code || product.id);
        const cart = AppData.loadCart(currentUser.email);
        const existing = cart.find(item => item.id === product.id);
        const qty = qtyToAdd || 1;
        if (existing) {
            existing.qty = (existing.qty || 1) + qty;
            existing.code = productCode;
        } else {
            cart.push({
                id: product.id,
                code: productCode,
                name: product.name,
                price: product.price,
                image: product.image,
                qty: qty
            });
        }

        if (!AppData.saveCart(currentUser.email, cart)) {
            AppUI.error({
                title: 'Không thể thêm vào giỏ',
                message: 'Bộ nhớ trình duyệt đã đầy hoặc bị chặn.'
            });
            return;
        }
        updateCartBadge();
        showToast(`✓ Đã thêm "${product.name}" vào giỏ hàng`);
    }

    function openProductDetailModal(productId) {
        if (!productDetailModal || !productDetailBody) return;
        const products = AppData.loadProducts();
        const p = products.find(item => item.id === productId);
        if (!p) return;

        const soldMap = getRealSoldCounts();
        const sold = soldMap.get(p.id) || 0;

        productDetailBody.innerHTML = `
            <div class="product-modal-grid">
                <div class="product-modal-img">
                    <img src="${AppUI.escapeHtml(p.image)}" alt="${AppUI.escapeHtml(p.name)}">
                </div>
                <div>
                    <h3 class="product-modal-title">${AppUI.escapeHtml(p.name)}</h3>
                    <div class="product-modal-price-row">
                        <span class="product-modal-price">${formatCurrency(p.price)}</span>
                        ${p.originalPrice > p.price ? `<span class="product-modal-old-price">${formatCurrency(p.originalPrice)}</span>` : ''}
                        ${p.discount > 0 ? `<span class="product-discount-pill">-${p.discount}%</span>` : ''}
                    </div>
                    <div class="product-modal-tags">
                        <span class="product-modal-tag">Mã SP: ${AppUI.escapeHtml(AppData.formatProductCode(p.code || p.id))}</span>
                        <span class="product-modal-tag">${AppUI.escapeHtml(p.category)}</span>
                        <span class="product-modal-tag">Độ tuổi: ${AppUI.escapeHtml(p.age)}</span>
                        <span class="product-modal-tag">Phân loại: ${AppUI.escapeHtml(p.type)}</span>
                        <span class="product-modal-tag">${AppUI.escapeHtml(p.shipping)}</span>
                        ${p.freeship ? '<span class="product-modal-tag" style="color:#059669;border-color:#a7f3d0;">Freeship</span>' : ''}
                        ${p.gift ? `<span class="product-modal-tag" style="color:#c2410c;border-color:#fed7aa;">🎁 ${AppUI.escapeHtml(p.gift)}</span>` : ''}
                        <span class="product-modal-tag">★ ${p.rating} · Đã bán ${sold}</span>
                    </div>
                    <p class="product-modal-desc">${AppUI.escapeHtml(p.desc || '')}</p>
                    <div class="product-modal-actions">
                        <button type="button" id="btn-modal-add-cart" class="btn-primary">Thêm vào giỏ hàng</button>
                        <button type="button" id="btn-modal-buy-now" class="btn-secondary">Mua ngay</button>
                        <button type="button" id="btn-close-product-modal" class="btn-secondary">Đóng</button>
                    </div>
                </div>
            </div>
        `;

        productDetailModal.setAttribute('data-product-id', productId);
        productDetailModal.classList.remove('hidden');

        document.getElementById('btn-modal-add-cart').addEventListener('click', function() {
            addToCart(p.id, 1);
            productDetailModal.classList.add('hidden');
        });
        document.getElementById('btn-modal-buy-now').addEventListener('click', function() {
            addToCart(p.id, 1);
            productDetailModal.classList.add('hidden');
            openCartModal();
        });
        document.getElementById('btn-close-product-modal').addEventListener('click', function() {
            productDetailModal.classList.add('hidden');
        });
    }

    function openCartModal() {
        if (!cartModal || !cartModalBody) return;
        const cart = AppData.loadCart(currentUser.email);
        const profile = getSavedProfile();

        if (cart.length === 0) {
            cartModalBody.innerHTML = `
                <div style="text-align:center; padding: 28px 12px; color: var(--text-muted);">
                    <p style="margin-bottom: 12px;">Giỏ hàng của bạn đang trống.</p>
                    <a href="#san-pham" id="btn-go-shop" class="btn-primary" style="text-decoration:none; display:inline-block;">Chọn mua sản phẩm thiết yếu</a>
                </div>
            `;
            const goShop = document.getElementById('btn-go-shop');
            if (goShop) {
                goShop.addEventListener('click', function() {
                    cartModal.classList.add('hidden');
                });
            }
            cartModal.classList.remove('hidden');
            return;
        }

        const totalAmount = cart.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);

        cartModalBody.innerHTML = `
            <div class="cart-items-list">
                ${cart.map((it, idx) => `
                    <div class="cart-item-row">
                        <div class="cart-item-info">
                            <img src="${AppUI.escapeHtml(it.image)}" alt="${AppUI.escapeHtml(it.name)}" class="cart-item-thumb">
                            <div>
                                <div class="cart-item-name">
                                    ${it.code || it.id ? `<span class="product-code-chip">Mã ${AppUI.escapeHtml(AppData.formatProductCode(it.code || it.id))}</span>` : ''}
                                    ${AppUI.escapeHtml(it.name)}
                                </div>
                                <div class="cart-item-price">${formatCurrency(it.price)}</div>
                            </div>
                        </div>
                        <div class="cart-qty-controls">
                            <button type="button" class="btn-qty btn-qty-dec" data-idx="${idx}">-</button>
                            <span style="min-width:22px;text-align:center;font-weight:600;">${it.qty || 1}</span>
                            <button type="button" class="btn-qty btn-qty-inc" data-idx="${idx}">+</button>
                            <button type="button" class="btn-sm btn-delete btn-cart-del" data-idx="${idx}" style="margin-left:4px;padding:4px 8px;border:none;border-radius:4px;background:#fee2e2;color:#ef4444;cursor:pointer;font-size:0.78rem;">Xóa</button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <form id="cart-checkout-form" class="cart-summary-box">
                <div class="cart-shipping-fields">
                    <div>
                        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Người nhận</label>
                        <input type="text" id="checkout-name" value="${AppUI.escapeHtml(profile.fullname || '')}" placeholder="Nhập họ tên người nhận..." required>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Số điện thoại</label>
                        <input type="tel" id="checkout-phone" value="${AppUI.escapeHtml(profile.phone || '')}" placeholder="Nhập số điện thoại..." required>
                    </div>
                    <div class="full-span">
                        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;">Địa chỉ giao hàng</label>
                        <input type="text" id="checkout-address" value="${AppUI.escapeHtml(profile.address || '')}" placeholder="Nhập địa chỉ nhận hàng tại Trà Vinh..." required>
                    </div>
                </div>

                <div class="cart-total-row">
                    <span>Tổng thanh toán:</span>
                    <span class="cart-total-amount">${formatCurrency(totalAmount)}</span>
                </div>

                <div style="display:flex;justify-content:flex-end;gap:10px;">
                    <button type="button" id="btn-clear-cart" class="btn-secondary">Xóa giỏ hàng</button>
                    <button type="submit" class="btn-primary">Xác nhận đặt mua</button>
                </div>
            </form>
        `;

        cartModal.querySelectorAll('.btn-qty-dec').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-idx'), 10);
                const latest = AppData.loadCart(currentUser.email);
                if (!latest[idx]) return;
                if (latest[idx].qty > 1) {
                    latest[idx].qty -= 1;
                } else {
                    latest.splice(idx, 1);
                }
                AppData.saveCart(currentUser.email, latest);
                updateCartBadge();
                openCartModal();
            });
        });

        cartModal.querySelectorAll('.btn-qty-inc').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-idx'), 10);
                const latest = AppData.loadCart(currentUser.email);
                if (!latest[idx]) return;
                latest[idx].qty = (latest[idx].qty || 1) + 1;
                AppData.saveCart(currentUser.email, latest);
                updateCartBadge();
                openCartModal();
            });
        });

        cartModal.querySelectorAll('.btn-cart-del').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-idx'), 10);
                const latest = AppData.loadCart(currentUser.email);
                latest.splice(idx, 1);
                AppData.saveCart(currentUser.email, latest);
                updateCartBadge();
                openCartModal();
            });
        });

        document.getElementById('btn-clear-cart').addEventListener('click', function() {
            AppData.saveCart(currentUser.email, []);
            updateCartBadge();
            openCartModal();
        });

        document.getElementById('cart-checkout-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const recvName = document.getElementById('checkout-name').value.trim();
            const recvPhone = document.getElementById('checkout-phone').value.trim();
            const recvAddr = document.getElementById('checkout-address').value.trim();

            const latestCart = AppData.loadCart(currentUser.email);
            if (latestCart.length === 0) return;

            const total = latestCart.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);
            const orderCode = 'DH' + String(Date.now()).slice(-6);
            const dateStr = new Date().toLocaleDateString();

            const orders = AppData.loadProductOrders();
            orders.unshift({
                code: orderCode,
                date: dateStr,
                orderedAt: new Date().toISOString(),
                customerEmail: currentUser.email || '',
                customerName: recvName,
                customerPhone: recvPhone,
                customerAddress: recvAddr,
                items: latestCart.map(it => ({
                    id: it.id,
                    code: AppData.formatProductCode(it.code || it.id),
                    name: it.name,
                    price: it.price,
                    qty: it.qty || 1
                })),
                status: 'pending',
                confirmedBy: '',
                confirmedAt: '',
                totalAmount: total
            });

            if (!AppData.saveProductOrders(orders)) {
                AppUI.error({
                    title: 'Không thể đặt hàng',
                    message: 'Bộ nhớ trình duyệt đã đầy hoặc bị chặn.'
                });
                return;
            }

            AppData.saveCart(currentUser.email, []);
            updateCartBadge();
            cartModal.classList.add('hidden');
            renderMyProductOrders();
            renderProductsGrid();

            AppUI.success({
                title: 'Đặt hàng thành công!',
                message: `Đơn hàng ${orderCode} đã được ghi nhận và sẽ sớm giao đến ${recvAddr}.`,
                details: [
                    ['Mã đơn hàng', orderCode],
                    ['Người nhận', `${recvName} (${recvPhone})`],
                    ['Tổng tiền', formatCurrency(total)]
                ],
                table: {
                    headers: ['Mã SP', 'Sản phẩm', 'SL', 'Thành tiền'],
                    rows: latestCart.map(it => [
                        AppData.formatProductCode(it.code || it.id) || '—',
                        it.name,
                        String(it.qty || 1),
                        formatCurrency((it.price || 0) * (it.qty || 1))
                    ])
                }
            });
        });

        cartModal.classList.remove('hidden');
    }

    function createPromoBannerElement() {
        return buildPromoBannerElement(
            PROMO_SLIDES,
            currentSlideIdx,
            '',
            function(nextIdx) {
                currentSlideIdx = nextIdx;
                renderProductsGrid();
            },
            function(slide) {
                filterState.category = slide.category;
                syncScopedPillsUI(productSection, filterState);
                renderProductsGrid();
            }
        );
    }

    function createProductCardElement(product, soldCount) {
        const card = document.createElement('article');
        card.className = 'product-card';
        const codeStr = AppData.formatProductCode(product.code || product.id);

        card.innerHTML = `
            <div>
                <div class="product-img-wrap">
                    <img src="${AppUI.escapeHtml(product.image)}" alt="${AppUI.escapeHtml(product.name)}">
                    ${product.saleTag ? `<span class="badge-sale-top">${AppUI.escapeHtml(product.saleTag)}</span>` : ''}
                    ${product.specBadge ? `<span class="badge-spec-right">${AppUI.escapeHtml(product.specBadge)}</span>` : ''}
                    ${product.freeship ? `<span class="badge-freeship-bottom">FREESHIP</span>` : ''}
                    ${product.gift ? `<span class="badge-gift-bottom">🎁 Quà tặng</span>` : ''}
                </div>
                <h3 class="product-title">${codeStr ? `<span class="product-code-chip">${AppUI.escapeHtml(codeStr)}</span>` : ''}${AppUI.escapeHtml(product.name)}</h3>
            </div>
            <div>
                <div class="product-meta-row">
                    <span class="product-stars">★★★★★</span>
                    <span>Đã bán ${soldCount}</span>
                </div>
                <div class="product-price-row">
                    <div class="product-price-group">
                        <span class="product-price">${formatCurrency(product.price)}</span>
                        ${product.discount > 0 ? `<span class="product-discount-pill">-${product.discount}%</span>` : ''}
                    </div>
                    <button type="button" class="btn-add-cart" title="Thêm vào giỏ hàng" aria-label="Thêm ${AppUI.escapeHtml(product.name)} vào giỏ">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const btnCart = card.querySelector('.btn-add-cart');
        btnCart.addEventListener('click', function(e) {
            e.stopPropagation();
            addToCart(product.id, 1);
        });

        card.addEventListener('click', function() {
            openProductDetailModal(product.id);
        });

        return card;
    }

    function getFilteredProducts(soldMap) {
        const products = AppData.loadProducts();
        const searchLower = filterState.search.trim().toLowerCase();

        const filtered = products.filter(p => {
            if (filterState.category !== 'all' && p.category !== filterState.category) return false;
            if (filterState.age && p.age !== filterState.age) return false;
            if (filterState.type && p.type !== filterState.type) return false;
            if (filterState.shipping && p.shipping !== filterState.shipping) return false;
            if (filterState.quick.freeship && !p.freeship) return false;
            if (filterState.quick.rating4 && (p.rating || 0) < 4) return false;
            if (filterState.quick.gift && !p.gift) return false;
            if (filterState.quick.discount && (p.discount || 0) <= 0) return false;
            if (searchLower) {
                const hay = `${p.code || p.id || ''} ${p.name} ${p.category} ${p.age} ${p.type}`.toLowerCase();
                if (hay.indexOf(searchLower) === -1) return false;
            }
            return true;
        });

        if (filterState.sort === 'price-asc') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (filterState.sort === 'price-desc') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (filterState.sort === 'discount-desc') {
            filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        } else if (filterState.sort === 'bestseller') {
            filtered.sort((a, b) => (soldMap.get(b.id) || 0) - (soldMap.get(a.id) || 0));
        }

        return filtered;
    }

    function renderProductsGrid() {
        if (!productsGrid) return;
        const soldMap = getRealSoldCounts();
        const filtered = getFilteredProducts(soldMap);

        if (productResultCount) {
            productResultCount.textContent = `Đang hiển thị ${filtered.length} sản phẩm thiết yếu`;
        }

        productsGrid.innerHTML = '';
        if (filtered.length === 0) {
            productsGrid.innerHTML = `
                <div class="products-empty">
                    <p style="margin-bottom: 10px;">Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
                    <button type="button" id="btn-empty-reset-filter" class="btn-primary">Xem tất cả sản phẩm</button>
                </div>
            `;
            const resetBtn = document.getElementById('btn-empty-reset-filter');
            if (resetBtn) {
                resetBtn.addEventListener('click', resetAllFilters);
            }
            return;
        }

        const showBanner = filtered.length >= 4;
        filtered.forEach((product, idx) => {
            productsGrid.appendChild(createProductCardElement(product, soldMap.get(product.id) || 0));
            if (showBanner && idx === 3) {
                productsGrid.appendChild(createPromoBannerElement());
            }
        });
    }

    function resetAllFilters() {
        filterState.category = 'all';
        filterState.age = '';
        filterState.type = '';
        filterState.shipping = '';
        filterState.quick.freeship = false;
        filterState.quick.rating4 = false;
        filterState.quick.gift = false;
        filterState.quick.discount = false;
        filterState.search = '';
        filterState.sort = 'popular';
        if (productSearch) productSearch.value = '';
        if (productSort) productSort.value = 'popular';
        syncScopedPillsUI(productSection, filterState);
        renderProductsGrid();
    }

    wireScopedCatalogControls({
        sectionEl: productSection,
        state: filterState,
        searchEl: productSearch,
        sortEl: productSort,
        resetBtn: btnResetFilters,
        onChange: renderProductsGrid,
        onReset: resetAllFilters
    });

    if (btnOpenCart) btnOpenCart.addEventListener('click', openCartModal);
    if (btnOpenCartInline) btnOpenCartInline.addEventListener('click', openCartModal);
    if (btnCloseCart) {
        btnCloseCart.addEventListener('click', function() {
            cartModal.classList.add('hidden');
        });
    }

    [productDetailModal, cartModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    updateCartBadge();
    renderProductsGrid();

    promoTimer = setInterval(function() {
        currentSlideIdx = (currentSlideIdx + 1) % PROMO_SLIDES.length;
        const banner = productsGrid ? productsGrid.querySelector('.product-promo-banner') : null;
        if (banner) {
            const replacement = createPromoBannerElement();
            banner.replaceWith(replacement);
        }
    }, 5000);


    /* =========================================================
       PHẦN 3: DỊCH VỤ ĐỒNG BỘ TỪ CHỦ CƠ SỞ (TRƯNG BÀY KIỂU CỬA HÀNG)
       ========================================================= */
    const serviceSection = document.getElementById('dich-vu');
    const servicesListView = document.getElementById('services-list-view');
    const serviceSearch = document.getElementById('service-search');
    const serviceSort = document.getElementById('service-sort');
    const serviceResultCount = document.getElementById('service-result-count');
    const btnResetServiceFilters = document.getElementById('btn-reset-service-filters');
    const serviceDetailModal = document.getElementById('service-detail-modal');
    const serviceDetailBody = document.getElementById('service-detail-body');

    const serviceFilterState = {
        category: 'all',
        target: '',
        location: '',
        quick: {
            atHome: false,
            rating4: false,
            richBenefits: false,
            discount: false
        },
        search: '',
        sort: 'popular'
    };

    const SERVICE_PROMO_SLIDES = [
        {
            badge: 'CHĂM SÓC BÉ TẠI NHÀ',
            heading: 'Tắm Bé & Bơi Thủy Liệu Chuẩn Điều Dưỡng',
            sub: 'Điều dưỡng tận tâm hỗ trợ chăm sóc bé sơ sinh an toàn, sạch sẽ và giúp bé ngủ sâu giấc.',
            caption: 'Ưu đãi các gói Chăm sóc Bé sơ sinh tại nhà & tại cơ sở',
            category: 'Chăm sóc Bé'
        },
        {
            badge: 'PHỤC HỒI SAU SINH',
            heading: 'Massage Bầu, Xông Hơi & Thông Tắc Tia Sữa',
            sub: 'Liệu trình thảo dược dịu nhẹ giúp mẹ xua tan đau mỏi, gọi sữa về nhanh và phục hồi vóc dáng.',
            caption: 'Chăm sóc Mẹ bầu & Mẹ sau sinh trọn gói chuyên sâu',
            category: 'Chăm sóc Mẹ'
        },
        {
            badge: 'ĐỒNG HÀNH Y KHOA',
            heading: 'Khám Sức Khỏe Nhi & Tư Vấn Ăn Dặm 1:1',
            sub: 'Bác sĩ và chuyên gia dinh dưỡng đồng hành theo dõi cân nặng, chiều cao và thực đơn cho bé.',
            caption: 'Dịch vụ Y tế & Dinh dưỡng khoa học cho từng giai đoạn phát triển',
            category: 'Y tế & Dinh dưỡng'
        },
        {
            badge: 'CHĂM SÓC TOÀN DIỆN',
            heading: 'Đặt Lịch Linh Hoạt – Phục Vụ Tận Tâm Tại Trà Vinh',
            sub: 'Xem nhanh quyền lợi gói dịch vụ, bảng giá công khai và xác nhận đặt lịch chỉ trong 1 chạm.',
            caption: 'Khám phá toàn bộ dịch vụ chăm sóc Mẹ & Bé chính quy',
            category: 'all'
        }
    ];
    let currentServiceSlideIdx = 0;

    if (serviceDetailModal) {
        serviceDetailModal.addEventListener('click', function(e) {
            if (e.target === serviceDetailModal) {
                serviceDetailModal.classList.add('hidden');
            }
        });
    }

    function getRealServiceBookedCounts() {
        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('myServices')) || [];
        } catch (err) {
            bookings = [];
        }
        const map = new Map();
        bookings.forEach(bk => {
            if (!bk || bk.status === 'recalled' || bk.recalledBy) return;
            const key = bk.serviceId || bk.name || '';
            if (!key) return;
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }

    function bookServiceById(serviceId) {
        const services = AppData.loadServices();
        const data = services.find(s => s.id === serviceId);
        if (!data) {
            AppUI.warning({
                title: 'Không thể đăng ký',
                message: 'Dịch vụ này vừa được thay đổi. Vui lòng chọn lại dịch vụ.'
            });
            renderServicesGrid();
            return false;
        }

        const dateStr = new Date().toLocaleDateString();
        const profile = getSavedProfile();

        let booked = [];
        try {
            booked = JSON.parse(localStorage.getItem('myServices')) || [];
        } catch (err) {
            booked = [];
        }

        booked.push({
            id: 'bk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            serviceId: data.id,
            name: data.name,
            date: dateStr,
            bookedAt: new Date().toISOString(),
            status: 'pending',
            confirmedBy: '',
            confirmedAt: '',
            customerEmail: currentUser.email || '',
            customerName: profile.fullname || currentUser.fullname || '',
            customerPhone: profile.phone || ''
        });

        try {
            localStorage.setItem('myServices', JSON.stringify(booked));
        } catch (err) {
            AppUI.error({
                title: 'Không thể đăng ký dịch vụ',
                message: 'Bộ nhớ trình duyệt đã đầy hoặc bị chặn. Vui lòng thử lại sau.'
            });
            return false;
        }

        loadProfileData();
        renderServicesGrid();

        const details = [
            ['Dịch vụ', data.name],
            ['Hình thức', data.location || 'Tại nhà'],
            ['Khách hàng', profile.fullname || currentUser.email || 'Chưa cập nhật'],
            ['Ngày đăng ký', dateStr]
        ];
        if (data.price > 0) {
            details.splice(1, 0, ['Chi phí gói', formatCurrency(data.price)]);
        }

        AppUI.success({
            title: 'Đăng ký dịch vụ thành công!',
            message: 'Dịch vụ đã được thêm vào danh sách đăng ký của bạn.',
            details: details
        });
        return true;
    }

    function openServiceDetail(serviceId) {
        const services = AppData.loadServices();
        const data = services.find(s => s.id === serviceId);
        if (!data) {
            AppUI.warning({
                title: 'Dịch vụ không tồn tại',
                message: 'Dịch vụ này có thể vừa được cập nhật hoặc xóa bởi cơ sở.'
            });
            if (serviceDetailModal) serviceDetailModal.classList.add('hidden');
            renderServicesGrid();
            return;
        }
        if (!serviceDetailModal || !serviceDetailBody) return;

        const bookedMap = getRealServiceBookedCounts();
        const bookedCount = bookedMap.get(data.id) || bookedMap.get(data.name) || 0;
        const benefits = Array.isArray(data.benefits) ? data.benefits : [];
        const priceHtml = data.price > 0 ? formatCurrency(data.price) : 'Liên hệ tư vấn';
        const imgSrc = data.image || AppData.buildServiceIllustrationSvg(data);

        serviceDetailBody.innerHTML = `
            <div class="product-modal-grid">
                <div class="product-modal-img">
                    <img src="${AppUI.escapeHtml(imgSrc)}" alt="${AppUI.escapeHtml(data.name)}">
                </div>
                <div>
                    <h3 class="product-modal-title">${AppUI.escapeHtml(data.name)}</h3>
                    <div class="product-modal-price-row">
                        <span class="product-modal-price">${priceHtml}</span>
                        ${data.originalPrice > data.price && data.price > 0 ? `<span class="product-modal-old-price">${formatCurrency(data.originalPrice)}</span>` : ''}
                        ${data.discount > 0 ? `<span class="product-discount-pill">-${data.discount}%</span>` : ''}
                    </div>
                    <div class="product-modal-tags">
                        <span class="product-modal-tag">${AppUI.escapeHtml(data.category || 'Chăm sóc Mẹ & Bé')}</span>
                        <span class="product-modal-tag">Đối tượng: ${AppUI.escapeHtml(data.target || 'Mẹ & Bé')}</span>
                        <span class="product-modal-tag">${AppUI.escapeHtml(data.location || 'Tại nhà')}</span>
                        ${data.duration ? `<span class="product-modal-tag">Thời lượng: ${AppUI.escapeHtml(data.duration)}</span>` : ''}
                        <span class="product-modal-tag">★ ${data.rating || 5.0} · Đã đặt ${bookedCount}</span>
                    </div>
                    <p class="product-modal-desc">${AppUI.escapeHtml(data.desc || data.shortDesc || '')}</p>
                    <div class="service-modal-benefits">
                        <div class="service-modal-benefits-title">Quyền lợi gói dịch vụ (${benefits.length})</div>
                        <ul>
                            ${benefits.length > 0 ? benefits.map(b => `<li>${AppUI.escapeHtml(b)}</li>`).join('') : '<li>Đang cập nhật quyền lợi chi tiết.</li>'}
                        </ul>
                    </div>
                    <div class="product-modal-actions">
                        <button type="button" id="btn-modal-book-service" class="btn-primary">Xác nhận đăng ký dịch vụ này</button>
                        <button type="button" id="btn-close-service-detail" class="btn-secondary">Đóng</button>
                    </div>
                </div>
            </div>
        `;

        serviceDetailModal.setAttribute('data-service-id', data.id);
        serviceDetailModal.classList.remove('hidden');

        document.getElementById('btn-modal-book-service').addEventListener('click', function() {
            serviceDetailModal.classList.add('hidden');
            bookServiceById(data.id);
        });
        document.getElementById('btn-close-service-detail').addEventListener('click', function() {
            serviceDetailModal.classList.add('hidden');
        });
    }

    function createServicePromoBannerElement() {
        return buildPromoBannerElement(
            SERVICE_PROMO_SLIDES,
            currentServiceSlideIdx,
            'service-promo-banner',
            function(nextIdx) {
                currentServiceSlideIdx = nextIdx;
                renderServicesGrid();
            },
            function(slide) {
                serviceFilterState.category = slide.category;
                syncScopedPillsUI(serviceSection, serviceFilterState);
                renderServicesGrid();
            }
        );
    }

    function createServiceCardElement(service, bookedCount) {
        const card = document.createElement('article');
        card.className = 'product-card';

        const imgSrc = service.image || AppData.buildServiceIllustrationSvg(service);
        const benefitsCount = Array.isArray(service.benefits) ? service.benefits.length : 0;
        const priceLabel = service.price > 0 ? formatCurrency(service.price) : 'Liên hệ';

        card.innerHTML = `
            <div>
                <div class="product-img-wrap">
                    <img src="${AppUI.escapeHtml(imgSrc)}" alt="${AppUI.escapeHtml(service.name)}">
                    ${service.saleTag ? `<span class="badge-sale-top">${AppUI.escapeHtml(service.saleTag)}</span>` : ''}
                    ${service.specBadge ? `<span class="badge-spec-right">${AppUI.escapeHtml(service.specBadge)}</span>` : ''}
                    ${service.location ? `<span class="badge-freeship-bottom">${AppUI.escapeHtml(service.location)}</span>` : ''}
                    ${benefitsCount > 0 ? `<span class="badge-gift-bottom">✓ ${benefitsCount} quyền lợi</span>` : ''}
                </div>
                <h3 class="product-title">${AppUI.escapeHtml(service.name)}</h3>
            </div>
            <div>
                <div class="product-meta-row">
                    <span class="product-stars">★★★★★</span>
                    <span>Đã đặt ${bookedCount}</span>
                </div>
                <div class="product-price-row">
                    <div class="product-price-group">
                        <span class="product-price">${priceLabel}</span>
                        ${service.discount > 0 ? `<span class="product-discount-pill">-${service.discount}%</span>` : ''}
                    </div>
                    <button type="button" class="btn-add-cart" title="Đăng ký nhanh dịch vụ" aria-label="Đăng ký ${AppUI.escapeHtml(service.name)}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <path d="M9 16l2 2 4-4"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const btnQuickBook = card.querySelector('.btn-add-cart');
        btnQuickBook.addEventListener('click', function(e) {
            e.stopPropagation();
            bookServiceById(service.id);
        });

        card.addEventListener('click', function() {
            openServiceDetail(service.id);
        });

        return card;
    }

    function getFilteredServices(bookedMap) {
        const services = AppData.loadServices();
        const searchLower = serviceFilterState.search.trim().toLowerCase();

        const filtered = services.filter(s => {
            if (serviceFilterState.category !== 'all' && s.category !== serviceFilterState.category) return false;
            if (serviceFilterState.target && s.target !== serviceFilterState.target) return false;
            if (serviceFilterState.location && s.location !== serviceFilterState.location) return false;
            if (serviceFilterState.quick.atHome && s.location !== 'Tại nhà') return false;
            if (serviceFilterState.quick.rating4 && (s.rating || 5) < 4) return false;
            if (serviceFilterState.quick.richBenefits && (!Array.isArray(s.benefits) || s.benefits.length < 3)) return false;
            if (serviceFilterState.quick.discount && (s.discount || 0) <= 0) return false;
            if (searchLower) {
                const hay = `${s.name} ${s.shortDesc || ''} ${s.category || ''} ${s.target || ''} ${s.location || ''}`.toLowerCase();
                if (hay.indexOf(searchLower) === -1) return false;
            }
            return true;
        });

        if (serviceFilterState.sort === 'price-asc') {
            filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (serviceFilterState.sort === 'price-desc') {
            filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (serviceFilterState.sort === 'discount-desc') {
            filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        } else if (serviceFilterState.sort === 'bestseller') {
            filtered.sort((a, b) => ((bookedMap.get(b.id) || bookedMap.get(b.name) || 0) - (bookedMap.get(a.id) || bookedMap.get(a.name) || 0)));
        }

        return filtered;
    }

    function resetAllServiceFilters() {
        serviceFilterState.category = 'all';
        serviceFilterState.target = '';
        serviceFilterState.location = '';
        serviceFilterState.quick.atHome = false;
        serviceFilterState.quick.rating4 = false;
        serviceFilterState.quick.richBenefits = false;
        serviceFilterState.quick.discount = false;
        serviceFilterState.search = '';
        serviceFilterState.sort = 'popular';
        if (serviceSearch) serviceSearch.value = '';
        if (serviceSort) serviceSort.value = 'popular';
        syncScopedPillsUI(serviceSection, serviceFilterState);
        renderServicesGrid();
    }

    function renderServicesGrid() {
        if (!servicesListView) return;
        const bookedMap = getRealServiceBookedCounts();
        const filtered = getFilteredServices(bookedMap);

        if (serviceResultCount) {
            serviceResultCount.textContent = `Đang hiển thị ${filtered.length} dịch vụ chăm sóc`;
        }

        servicesListView.innerHTML = '';
        if (filtered.length === 0) {
            servicesListView.innerHTML = `
                <div class="products-empty">
                    <p style="margin-bottom: 10px;">Không tìm thấy dịch vụ phù hợp với bộ lọc hiện tại.</p>
                    <button type="button" id="btn-empty-reset-service-filter" class="btn-primary">Xem tất cả dịch vụ</button>
                </div>
            `;
            const resetBtn = document.getElementById('btn-empty-reset-service-filter');
            if (resetBtn) {
                resetBtn.addEventListener('click', resetAllServiceFilters);
            }
            return;
        }

        const showBanner = filtered.length >= 4;
        filtered.forEach((service, idx) => {
            const count = bookedMap.get(service.id) || bookedMap.get(service.name) || 0;
            servicesListView.appendChild(createServiceCardElement(service, count));
            if (showBanner && idx === 3) {
                servicesListView.appendChild(createServicePromoBannerElement());
            }
        });
    }

    wireScopedCatalogControls({
        sectionEl: serviceSection,
        state: serviceFilterState,
        searchEl: serviceSearch,
        sortEl: serviceSort,
        resetBtn: btnResetServiceFilters,
        onChange: renderServicesGrid,
        onReset: resetAllServiceFilters
    });

    renderServicesGrid();

    setInterval(function() {
        currentServiceSlideIdx = (currentServiceSlideIdx + 1) % SERVICE_PROMO_SLIDES.length;
        const banner = servicesListView ? servicesListView.querySelector('.product-promo-banner') : null;
        if (banner) {
            banner.replaceWith(createServicePromoBannerElement());
        }
    }, 5000);

    window.addEventListener('storage', function(e) {
        if (e.key === AppData.SERVICES_KEY) {
            renderServicesGrid();
            if (serviceDetailModal && !serviceDetailModal.classList.contains('hidden')) {
                const activeServiceId = serviceDetailModal.getAttribute('data-service-id');
                if (activeServiceId) {
                    const services = AppData.loadServices();
                    if (services.some(s => s.id === activeServiceId)) {
                        openServiceDetail(activeServiceId);
                    } else {
                        serviceDetailModal.classList.add('hidden');
                    }
                }
            }
        } else if (e.key === AppData.PRODUCTS_KEY) {
            renderProductsGrid();
            if (productDetailModal && !productDetailModal.classList.contains('hidden')) {
                const activeProductId = productDetailModal.getAttribute('data-product-id');
                if (activeProductId) {
                    const products = AppData.loadProducts();
                    if (products.some(p => p.id === activeProductId)) {
                        openProductDetailModal(activeProductId);
                    } else {
                        productDetailModal.classList.add('hidden');
                    }
                }
            }
        } else if (e.key === 'myServices' || e.key === 'users' || e.key === AppData.PRODUCT_ORDERS_KEY) {
            loadProfileData();
            renderProductsGrid();
            renderServicesGrid();
            if (e.key === 'myServices' || e.key === AppData.PRODUCT_ORDERS_KEY) {
                checkUnreadRecallNotices();
            }
        }
    });
});
