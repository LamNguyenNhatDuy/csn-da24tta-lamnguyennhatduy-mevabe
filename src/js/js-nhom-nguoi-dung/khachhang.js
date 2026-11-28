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

    function debounce(fn, delayMs) {
        let timer = null;
        return function() {
            const ctx = this;
            const args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() {
                fn.apply(ctx, args);
            }, delayMs);
        };
    }

    /* Toast thông báo */
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

    /* Điều hướng tab tài khoản & đơn hàng */
    const hubTabs = document.querySelectorAll('#thong-tin [data-kh-tab]');
    const hubPanes = document.querySelectorAll('#thong-tin [data-kh-pane]');

    function switchHubTab(tabKey) {
        const key = tabKey || 'profile';
        hubTabs.forEach(btn => {
            const active = btn.getAttribute('data-kh-tab') === key;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        hubPanes.forEach(pane => {
            pane.classList.toggle('active', pane.getAttribute('data-kh-pane') === key);
        });
    }

    hubTabs.forEach(btn => {
        btn.addEventListener('click', function() {
            switchHubTab(this.getAttribute('data-kh-tab'));
        });
    });

    document.querySelectorAll('[data-switch-tab]').forEach(el => {
        el.addEventListener('click', function() {
            switchHubTab(this.getAttribute('data-switch-tab'));
        });
    });

    document.querySelectorAll('[data-jump-tab]').forEach(el => {
        el.addEventListener('click', function() {
            switchHubTab(this.getAttribute('data-jump-tab'));
        });
    });

    const btnOpenOffers = document.getElementById('btn-open-offers');
    if (btnOpenOffers) {
        btnOpenOffers.addEventListener('click', function() {
            switchHubTab('offers');
            const hubEl = document.getElementById('thong-tin');
            if (hubEl) hubEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    /* Engine carousel tự động chạy mượt GPU */
    const sliderRegistry = [];
    document.addEventListener('visibilitychange', function() {
        sliderRegistry.forEach(ctrl => ctrl.syncVisibility());
    });

    function mountAutoSlider(cfg) {
        const {
            container,
            slides,
            intervalMs,
            initialDelayMs,
            renderSlide,
            dotsClass,
            dotClass,
            onSlideClick
        } = cfg;
        if (!container || !Array.isArray(slides) || slides.length === 0) return null;

        container.innerHTML = '';
        const track = document.createElement('div');
        track.className = 'kh-slider-track';

        slides.forEach((slide, idx) => {
            const slideEl = document.createElement('div');
            slideEl.className = 'kh-slider-slide';
            slideEl.innerHTML = renderSlide(slide, idx);
            if (typeof onSlideClick === 'function') {
                slideEl.addEventListener('click', function() {
                    onSlideClick(slide, idx);
                });
            }
            track.appendChild(slideEl);
        });
        container.appendChild(track);

        let curIdx = 0;
        let timer = null;
        let paused = false;
        const dots = [];

        function goTo(nextIdx) {
            curIdx = (nextIdx + slides.length) % slides.length;
            track.style.transform = `translate3d(-${curIdx * 100}%, 0, 0)`;
            dots.forEach((d, i) => d.classList.toggle('active', i === curIdx));
        }

        if (slides.length > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.type = 'button';
            btnPrev.className = 'kh-slider-arrow prev';
            btnPrev.setAttribute('aria-label', 'Banner trước');
            btnPrev.innerHTML = '&lsaquo;';
            btnPrev.addEventListener('click', function(e) {
                e.stopPropagation();
                goTo(curIdx - 1);
            });

            const btnNext = document.createElement('button');
            btnNext.type = 'button';
            btnNext.className = 'kh-slider-arrow next';
            btnNext.setAttribute('aria-label', 'Banner sau');
            btnNext.innerHTML = '&rsaquo;';
            btnNext.addEventListener('click', function(e) {
                e.stopPropagation();
                goTo(curIdx + 1);
            });

            const dotsWrap = document.createElement('div');
            dotsWrap.className = dotsClass || 'kh-slider-dots';
            slides.forEach((_, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = (dotClass || 'kh-slider-dot') + (idx === 0 ? ' active' : '');
                dot.setAttribute('aria-label', `Slide ${idx + 1}`);
                dot.addEventListener('click', function(e) {
                    e.stopPropagation();
                    goTo(idx);
                });
                dots.push(dot);
                dotsWrap.appendChild(dot);
            });

            container.appendChild(btnPrev);
            container.appendChild(btnNext);
            container.appendChild(dotsWrap);

            function startTimer() {
                if (timer || document.hidden || paused) return;
                timer = setInterval(function() {
                    if (!document.hidden && !paused) {
                        goTo(curIdx + 1);
                    }
                }, intervalMs || 4800);
            }

            function stopTimer() {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
            }

            container.addEventListener('mouseenter', function() {
                paused = true;
                stopTimer();
            });
            container.addEventListener('mouseleave', function() {
                paused = false;
                startTimer();
            });

            const ctrl = {
                syncVisibility: function() {
                    if (document.hidden) stopTimer();
                    else startTimer();
                }
            };
            sliderRegistry.push(ctrl);

            if (initialDelayMs > 0) {
                setTimeout(startTimer, initialDelayMs);
            } else {
                startTimer();
            }
        }

        return container;
    }

    /* Hồ sơ, dịch vụ & đơn hàng */
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
            btnRemoveAvatar.classList.toggle('hidden', !src);
        }
    }

    function isBookingOfCurrentCustomer(record) {
        if (!record) return false;
        if (!record.customerEmail) return true;
        return record.customerEmail.toLowerCase() === (currentUser.email || '').toLowerCase();
    }

    function buildEmptyIllustrationLi(kind, message, btnText, targetSectionId) {
        const svg = kind === 'orders'
            ? `<svg viewBox="0 0 120 100" width="96" height="80" fill="none" aria-hidden="true">
                <circle cx="60" cy="50" r="42" fill="#fff1f6"/>
                <rect x="30" y="34" width="60" height="40" rx="8" fill="#ffffff" stroke="#ff4d8d" stroke-width="2.5"/>
                <path d="M44 34v-6a16 16 0 0 1 32 0v6" stroke="#ff4d8d" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M46 54h28M52 63h16" stroke="#fbcfe8" stroke-width="3" stroke-linecap="round"/>
               </svg>`
            : `<svg viewBox="0 0 120 100" width="96" height="80" fill="none" aria-hidden="true">
                <circle cx="60" cy="50" r="42" fill="#eff6ff"/>
                <rect x="34" y="28" width="52" height="54" rx="10" fill="#ffffff" stroke="#0284c7" stroke-width="2.5"/>
                <rect x="55" y="42" width="10" height="26" rx="3" fill="#ff4d8d"/>
                <rect x="47" y="50" width="26" height="10" rx="3" fill="#ff4d8d"/>
               </svg>`;
        const li = document.createElement('li');
        li.className = 'kh-empty-state';
        li.innerHTML = `
            ${svg}
            <p>${AppUI.escapeHtml(message)}</p>
            <button type="button" class="btn-primary kh-empty-cta">${AppUI.escapeHtml(btnText)}</button>
        `;
        const btn = li.querySelector('.kh-empty-cta');
        if (btn) {
            btn.addEventListener('click', function() {
                const target = document.getElementById(targetSectionId);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        return li;
    }

    function buildCustomerRequestMeta(rec, nounLower, cancelLabel, lockLabel) {
        const isRecalled = rec.status === 'recalled' || Boolean(rec.recalledBy);
        const isConfirmed = !isRecalled && (rec.status === 'confirmed' || Boolean(rec.confirmedBy));
        const confirmedTime = rec.confirmedAt ? new Date(rec.confirmedAt).toLocaleString('vi-VN') : '';
        const confirmerName = rec.confirmedBy || 'Nhân viên';
        const recalledTime = rec.recalledAt ? new Date(rec.recalledAt).toLocaleString('vi-VN') : '';
        const recallerName = rec.recalledBy || 'Nhân viên';
        const recallMessage = (rec.recallMessage || '').trim();

        const statusBadgeHtml = isRecalled
            ? `<span class="booked-status-pill recalled">! Đã thu hồi</span>`
            : (isConfirmed
                ? `<span class="booked-status-pill confirmed">✓ Đã xác nhận</span>`
                : `<span class="booked-status-pill pending">Chờ nhân viên xác nhận</span>`);

        const noteHtml = isRecalled
            ? `<div class="booked-recalled-note"><div><strong>! ${nounLower === 'đơn hàng' ? 'Đơn hàng' : 'Dịch vụ'} đã bị thu hồi bởi nhân viên:</strong> ${AppUI.escapeHtml(recallerName)}${recalledTime ? ` (${AppUI.escapeHtml(recalledTime)})` : ''}</div>${recallMessage ? `<div style="margin-top:4px;"><strong>Lời nhắn:</strong> ${AppUI.escapeHtml(recallMessage)}</div>` : ''}</div>`
            : (isConfirmed
                ? `<div class="booked-confirmed-note">✓ Đã xác nhận bởi nhân viên: ${AppUI.escapeHtml(confirmerName)}${confirmedTime ? ` (${AppUI.escapeHtml(confirmedTime)})` : ''} · Không thể ${lockLabel}</div>`
                : '');

        const cancelBtnHtml = isRecalled
            ? `<button type="button" class="booked-btn-locked" disabled title="${nounLower === 'đơn hàng' ? 'Đơn hàng' : 'Dịch vụ'} đã bị nhân viên thu hồi">Đã thu hồi</button>`
            : (isConfirmed
                ? `<button type="button" class="booked-btn-locked" disabled title="Nhân viên đã xác nhận ${nounLower}, không thể ${lockLabel}">Không thể ${lockLabel}</button>`
                : `<button type="button" class="booked-btn-cancel">${cancelLabel}</button>`);

        const detailStatusText = isRecalled
            ? `Đã thu hồi bởi ${recallerName}`
            : (isConfirmed ? `Đã xác nhận bởi ${confirmerName}` : 'Chờ nhân viên xác nhận');

        return {
            isRecalled,
            isConfirmed,
            confirmedTime,
            recalledTime,
            recallMessage,
            statusBadgeHtml,
            noteHtml,
            cancelBtnHtml,
            detailStatusText
        };
    }

    function appendRequestStatusRows(rows, meta) {
        if (meta.isRecalled) {
            if (meta.recallMessage) rows.splice(2, 0, ['Lời nhắn thu hồi', meta.recallMessage]);
            if (meta.recalledTime) rows.splice(2, 0, ['Thời gian thu hồi', meta.recalledTime]);
        } else if (meta.isConfirmed && meta.confirmedTime) {
            rows.splice(2, 0, ['Thời gian xác nhận', meta.confirmedTime]);
        }
    }

    function isCancelBlocked(target, nounCap, nounLower, reloadFn) {
        if (!target) return false;
        if (target.status === 'recalled' || target.recalledBy) {
            reloadFn();
            AppUI.warning({
                title: `${nounCap} đã bị thu hồi`,
                message: `${nounCap} này đã được nhân viên "${target.recalledBy || 'Nhân viên'}" thu hồi.${target.recallMessage ? ` Lời nhắn: ${target.recallMessage}` : ''}`
            });
            return true;
        }
        if (target.status === 'confirmed' || target.confirmedBy) {
            reloadFn();
            AppUI.warning({
                title: `Không thể ${nounLower === 'đơn hàng' ? 'hủy đơn hàng' : 'thu hồi dịch vụ'}`,
                message: `${nounCap} này đã được nhân viên "${target.confirmedBy || 'Nhân viên'}" xác nhận nên không thể ${nounLower === 'đơn hàng' ? 'hủy' : 'thu hồi'}.`
            });
            return true;
        }
        return false;
    }

    function updateOrderCountBadges(count) {
        ['hub-order-count', 'stat-order-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(count);
        });
    }

    function updateServiceCountBadges(count) {
        ['inline-service-count', 'hub-service-count', 'stat-service-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(count);
        });
    }

    function renderMyProductOrders() {
        const ordersListEl = document.getElementById('my-product-orders-list');
        if (!ordersListEl) return;

        const allOrders = AppData.loadProductOrders();
        const myOrders = [];
        allOrders.forEach((order, realIndex) => {
            if (isBookingOfCurrentCustomer(order)) {
                myOrders.push({ order: order, realIndex: realIndex });
            }
        });

        updateOrderCountBadges(myOrders.length);
        ordersListEl.innerHTML = '';
        if (myOrders.length === 0) {
            ordersListEl.appendChild(
                buildEmptyIllustrationLi('orders', 'Hiện ba mẹ chưa có thông tin đơn hàng sản phẩm nào', 'Mua sắm sản phẩm ngay', 'san-pham')
            );
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
            const meta = buildCustomerRequestMeta(ord, 'đơn hàng', 'Hủy đơn', 'hủy đơn');

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

            li.innerHTML = `
                <div class="booked-detail-top">
                    <div>
                        <span class="booked-code-label">Đơn ${AppUI.escapeHtml(ord.code || '—')}</span>
                        <span class="booked-date-label"> · ${AppUI.escapeHtml(orderedTime)} · ${itemCount} sản phẩm</span>
                    </div>
                    ${meta.statusBadgeHtml}
                </div>
                ${meta.noteHtml}
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
                        ${meta.cancelBtnHtml}
                    </div>
                </div>
            `;

            const btnDetail = li.querySelector('.booked-btn-detail');
            const btnCancelOrder = li.querySelector('.booked-btn-cancel');

            btnDetail.addEventListener('click', function() {
                const detailRows = [
                    ['Mã đơn hàng', ord.code || '—'],
                    ['Trạng thái', meta.detailStatusText],
                    ['Thời gian đặt', orderedTime || '—'],
                    ['Người nhận', `${ord.customerName || 'Chưa cập nhật'} (${ord.customerPhone || 'Chưa có SĐT'})`],
                    ['Địa chỉ giao hàng', ord.customerAddress || 'Chưa cập nhật'],
                    ['Tổng thanh toán', formatCurrency(ord.totalAmount)]
                ];
                appendRequestStatusRows(detailRows, meta);

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
                            if (isCancelBlocked(latest[entry.realIndex], 'Đơn hàng', 'đơn hàng', renderMyProductOrders)) return;
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

        const bookedListContainer = document.getElementById('my-booked-services-list');
        const allBookedServices = AppData.loadServiceBookings();

        const myEntries = [];
        allBookedServices.forEach((item, realIndex) => {
            if (isBookingOfCurrentCustomer(item)) {
                myEntries.push({ item: item, realIndex: realIndex });
            }
        });

        updateServiceCountBadges(myEntries.length);

        bookedListContainer.innerHTML = '';
        if (myEntries.length === 0) {
            bookedListContainer.appendChild(
                buildEmptyIllustrationLi('services', 'Hiện ba mẹ chưa đăng ký gói dịch vụ chăm sóc nào', 'Xem các gói dịch vụ', 'dich-vu')
            );
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
                const bookingCode = item.id || 'DV_01';
                const meta = buildCustomerRequestMeta(item, 'dịch vụ', 'Thu hồi', 'thu hồi');

                const li = document.createElement('li');
                li.className = 'booked-detail-card';

                li.innerHTML = `
                    <div class="booked-detail-top">
                        <div>
                            <span class="booked-code-label">Mã ${AppUI.escapeHtml(bookingCode)}</span>
                            <span class="booked-date-label"> · Đăng ký: ${AppUI.escapeHtml(bookedTime)}</span>
                        </div>
                        ${meta.statusBadgeHtml}
                    </div>
                    ${meta.noteHtml}
                    <div class="booked-detail-main">
                        <div class="booked-service-left">
                            <img src="${AppUI.escapeHtml(imgSrc)}" alt="${AppUI.escapeHtml(item.name)}" class="booked-thumb" loading="lazy" decoding="async">
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
                            ${meta.cancelBtnHtml}
                        </div>
                    </div>
                `;

                const btnServiceDetail = li.querySelector('.booked-btn-detail');
                const btnCancelService = li.querySelector('.booked-btn-cancel');

                btnServiceDetail.addEventListener('click', function() {
                    const detailsArr = [
                        ['Mã đăng ký', bookingCode],
                        ['Trạng thái', meta.detailStatusText],
                        ['Ngày giờ đăng ký', bookedTime || '—'],
                        ['Giá gói', priceLabel],
                        ['Thời lượng', matchedSvc.duration || 'Linh hoạt'],
                        ['Khách hàng', `${item.customerName || data.fullname || 'Chưa cập nhật'} (${item.customerPhone || data.phone || 'Chưa có SĐT'})`],
                        ['Mô tả', matchedSvc.desc || matchedSvc.shortDesc || 'Đang cập nhật']
                    ];
                    appendRequestStatusRows(detailsArr, meta);

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
                            message: `Bạn có chắc chắn muốn thu hồi dịch vụ "${item.name}" (${bookingCode}) không?`,
                            danger: true,
                            confirmText: 'Thu hồi',
                            cancelText: 'Hủy',
                            onConfirm: function() {
                                const latest = AppData.loadServiceBookings();
                                if (isCancelBlocked(latest[entry.realIndex], 'Dịch vụ', 'dịch vụ', loadProfileData)) return;
                                if (entry.realIndex >= 0 && entry.realIndex < latest.length) {
                                    latest.splice(entry.realIndex, 1);
                                }
                                if (!AppData.saveServiceBookings(latest)) {
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
                                    message: `Dịch vụ "${item.name}" (${bookingCode}) đã được thu hồi khỏi danh sách.`
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

        const booked = AppData.loadServiceBookings();
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
                const markSeen = (shownKeys, loadFn, saveFn, kind) => {
                    if (shownKeys.size === 0) return;
                    const latest = loadFn();
                    let changed = false;
                    latest.forEach(rec => {
                        if (!rec || !isBookingOfCurrentCustomer(rec)) return;
                        const isRecalled = rec.status === 'recalled' || Boolean(rec.recalledBy);
                        if (isRecalled && rec.recallSeenByCustomer === false && shownKeys.has(getRecallNoticeKey(kind, rec))) {
                            rec.recallSeenByCustomer = true;
                            changed = true;
                        }
                    });
                    if (changed) saveFn(latest);
                };
                markSeen(shownServiceKeys, AppData.loadServiceBookings, AppData.saveServiceBookings, 'service');
                markSeen(shownOrderKeys, AppData.loadProductOrders, AppData.saveProductOrders, 'order');
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

    /* Tiện ích bộ lọc & lưới dùng chung */
    function buildSmoothGridPromoBanner(slides, extraClass, onBannerClick, intervalMs, initialDelayMs) {
        const banner = document.createElement('div');
        banner.className = extraClass ? `product-promo-banner ${extraClass}` : 'product-promo-banner';
        mountAutoSlider({
            container: banner,
            slides: slides,
            intervalMs: intervalMs || 4800,
            initialDelayMs: initialDelayMs || 0,
            dotsClass: 'promo-dots',
            dotClass: 'promo-dot',
            renderSlide: slide => `
                <div class="promo-slide-item">
                    <div class="promo-slide-body">
                        <span class="promo-slide-badge">${AppUI.escapeHtml(slide.badge)}</span>
                        <div class="promo-slide-heading">${AppUI.escapeHtml(slide.heading)}</div>
                        <p class="promo-slide-sub">${AppUI.escapeHtml(slide.sub)}</p>
                        <span class="promo-slide-cta">Xem ngay &rarr;</span>
                    </div>
                    <div class="promo-caption-bar">${AppUI.escapeHtml(slide.caption)}</div>
                </div>
            `,
            onSlideClick: onBannerClick
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
            searchEl.addEventListener('input', debounce(function() {
                state.search = searchEl.value;
                onChange();
            }, 120));
        }

        if (sortEl) {
            sortEl.addEventListener('change', function() {
                state.sort = this.value;
                onChange();
            });
        }
    }

    function renderStorefrontGrid(cfg) {
        const {
            gridEl, countEl, items, countLabel, emptyMessage, emptyResetId,
            emptyButtonLabel, onReset, renderCard, bannerEl
        } = cfg;
        if (!gridEl) return;

        if (countEl) countEl.textContent = countLabel;
        gridEl.innerHTML = '';

        if (items.length === 0) {
            gridEl.innerHTML = `
                <div class="products-empty">
                    <p style="margin-bottom: 10px;">${AppUI.escapeHtml(emptyMessage)}</p>
                    <button type="button" id="${emptyResetId}" class="btn-primary">${AppUI.escapeHtml(emptyButtonLabel)}</button>
                </div>
            `;
            const resetBtn = document.getElementById(emptyResetId);
            if (resetBtn) resetBtn.addEventListener('click', onReset);
            return;
        }

        const showBanner = Boolean(bannerEl) && items.length >= 2;
        items.forEach((item, idx) => {
            gridEl.appendChild(renderCard(item));
            if (showBanner && idx === 1) {
                gridEl.appendChild(bannerEl);
            }
        });
    }

    function resetCatalogFilterState(cfg) {
        const { sectionEl, state, optionalKeys, searchEl, sortEl, onRender } = cfg;
        state.category = 'all';
        (optionalKeys || []).forEach(key => { state[key] = ''; });
        if (state.quick) {
            Object.keys(state.quick).forEach(q => { state.quick[q] = false; });
        }
        state.search = '';
        state.sort = 'popular';
        if (searchEl) searchEl.value = '';
        if (sortEl) sortEl.value = 'popular';
        syncScopedPillsUI(sectionEl, state);
        onRender();
    }

    function syncOpenDetailModal(modalEl, attrName, catalog, openFn) {
        if (!modalEl || modalEl.classList.contains('hidden')) return;
        const activeId = modalEl.getAttribute(attrName);
        if (!activeId) return;
        if (catalog.some(item => item && item.id === activeId)) {
            openFn(activeId);
        } else {
            modalEl.classList.add('hidden');
        }
    }

    /* Sản phẩm & giỏ hàng */
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
            badge: 'SIÊU HỘI MẸ & BÉ',
            heading: 'Sữa Dinh Dưỡng & Tã Bỉm Chính Hãng',
            sub: 'Giảm ngay đến 22%, tặng quà hấp dẫn kèm đơn và Freeship siêu tốc 1H tại Trà Vinh.',
            caption: 'Ưu đãi tháng 11: Aptamil KID, GrowPLUS+, Huggies & Bobby đồng loạt giảm sốc',
            category: 'Sữa & Dinh dưỡng'
        },
        {
            badge: 'CHĂM SÓC BÉ YÊU',
            heading: 'Tã Bỉm Thoáng Mát – Chống Hăm Tối Đa',
            sub: 'Đa dạng size sơ sinh đến 3 tuổi, giao nhanh 1H để mẹ luôn sẵn tã cho bé.',
            caption: 'Combo Tã dán & Tã quần chính hãng giá tiết kiệm đến 20%',
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
                    <img src="${AppUI.escapeHtml(p.image)}" alt="${AppUI.escapeHtml(p.name)}" decoding="async">
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
                            <img src="${AppUI.escapeHtml(it.image)}" alt="${AppUI.escapeHtml(it.name)}" class="cart-item-thumb" decoding="async">
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

            const orders = AppData.loadProductOrders();
            const orderCode = AppData.generateOrderCode(latestCart, orders);
            const total = latestCart.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);
            const dateStr = new Date().toLocaleDateString();

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

    const productGridBannerEl = buildSmoothGridPromoBanner(
        PROMO_SLIDES,
        '',
        function(slide) {
            filterState.category = slide.category;
            syncScopedPillsUI(productSection, filterState);
            renderProductsGrid();
        },
        4800,
        600
    );

    function createProductCardElement(product, soldCount) {
        const card = document.createElement('article');
        card.className = 'product-card';
        const codeStr = AppData.formatProductCode(product.code || product.id);

        card.innerHTML = `
            <div>
                <div class="product-img-wrap">
                    <img src="${AppUI.escapeHtml(product.image)}" alt="${AppUI.escapeHtml(product.name)}" loading="lazy" decoding="async">
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
        const soldMap = getRealSoldCounts();
        const filtered = getFilteredProducts(soldMap);
        renderStorefrontGrid({
            gridEl: productsGrid,
            countEl: productResultCount,
            items: filtered,
            countLabel: `Đang hiển thị ${filtered.length} sản phẩm thiết yếu`,
            emptyMessage: 'Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.',
            emptyResetId: 'btn-empty-reset-filter',
            emptyButtonLabel: 'Xem tất cả sản phẩm',
            onReset: resetAllFilters,
            renderCard: p => createProductCardElement(p, soldMap.get(p.id) || 0),
            bannerEl: productGridBannerEl
        });
    }

    function resetAllFilters() {
        resetCatalogFilterState({
            sectionEl: productSection,
            state: filterState,
            optionalKeys: ['age', 'type', 'shipping'],
            searchEl: productSearch,
            sortEl: productSort,
            onRender: renderProductsGrid
        });
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

    /* Dịch vụ */
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

    if (serviceDetailModal) {
        serviceDetailModal.addEventListener('click', function(e) {
            if (e.target === serviceDetailModal) {
                serviceDetailModal.classList.add('hidden');
            }
        });
    }

    function getRealServiceBookedCounts() {
        const bookings = AppData.loadServiceBookings();
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
        const booked = AppData.loadServiceBookings();
        const bookingCode = AppData.generateServiceBookingCode(data.name || data.id, booked);

        booked.push({
            id: bookingCode,
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

        if (!AppData.saveServiceBookings(booked)) {
            AppUI.error({
                title: 'Không thể đăng ký dịch vụ',
                message: 'Không thể lưu đăng ký dịch vụ vào cơ sở dữ liệu. Vui lòng thử lại sau.'
            });
            return false;
        }

        loadProfileData();
        renderServicesGrid();

        const details = [
            ['Mã đăng ký', bookingCode],
            ['Dịch vụ', data.name],
            ['Hình thức', data.location || 'Tại nhà'],
            ['Khách hàng', profile.fullname || currentUser.email || 'Chưa cập nhật'],
            ['Ngày đăng ký', dateStr]
        ];
        if (data.price > 0) {
            details.splice(2, 0, ['Chi phí gói', formatCurrency(data.price)]);
        }

        AppUI.success({
            title: 'Đăng ký dịch vụ thành công!',
            message: `Mã đăng ký ${bookingCode} đã được thêm vào danh sách của bạn.`,
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
                    <img src="${AppUI.escapeHtml(imgSrc)}" alt="${AppUI.escapeHtml(data.name)}" decoding="async">
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

    const serviceGridBannerEl = buildSmoothGridPromoBanner(
        SERVICE_PROMO_SLIDES,
        'service-promo-banner',
        function(slide) {
            serviceFilterState.category = slide.category;
            syncScopedPillsUI(serviceSection, serviceFilterState);
            renderServicesGrid();
        },
        5200,
        1400
    );

    function createServiceCardElement(service, bookedCount) {
        const card = document.createElement('article');
        card.className = 'product-card';

        const imgSrc = service.image || AppData.buildServiceIllustrationSvg(service);
        const benefitsCount = Array.isArray(service.benefits) ? service.benefits.length : 0;
        const priceLabel = service.price > 0 ? formatCurrency(service.price) : 'Liên hệ';

        card.innerHTML = `
            <div>
                <div class="product-img-wrap">
                    <img src="${AppUI.escapeHtml(imgSrc)}" alt="${AppUI.escapeHtml(service.name)}" loading="lazy" decoding="async">
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
        resetCatalogFilterState({
            sectionEl: serviceSection,
            state: serviceFilterState,
            optionalKeys: ['target', 'location'],
            searchEl: serviceSearch,
            sortEl: serviceSort,
            onRender: renderServicesGrid
        });
    }

    function renderServicesGrid() {
        const bookedMap = getRealServiceBookedCounts();
        const filtered = getFilteredServices(bookedMap);
        renderStorefrontGrid({
            gridEl: servicesListView,
            countEl: serviceResultCount,
            items: filtered,
            countLabel: `Đang hiển thị ${filtered.length} dịch vụ chăm sóc`,
            emptyMessage: 'Không tìm thấy dịch vụ phù hợp với bộ lọc hiện tại.',
            emptyResetId: 'btn-empty-reset-service-filter',
            emptyButtonLabel: 'Xem tất cả dịch vụ',
            onReset: resetAllServiceFilters,
            renderCard: svc => createServiceCardElement(svc, bookedMap.get(svc.id) || bookedMap.get(svc.name) || 0),
            bannerEl: serviceGridBannerEl
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

    /* Khởi tạo Banner tự động chạy đầu trang, giữa trang & Tab Ưu đãi */
    function handleCatalogJump(targetKind, category, quickKey) {
        if (targetKind === 'service') {
            serviceFilterState.category = category || 'all';
            if (quickKey) {
                Object.keys(serviceFilterState.quick).forEach(k => {
                    serviceFilterState.quick[k] = (k === quickKey);
                });
            }
            syncScopedPillsUI(serviceSection, serviceFilterState);
            renderServicesGrid();
            if (serviceSection) serviceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        filterState.category = category || 'all';
        if (quickKey) {
            Object.keys(filterState.quick).forEach(k => {
                filterState.quick[k] = (k === quickKey);
            });
        }
        syncScopedPillsUI(productSection, filterState);
        renderProductsGrid();
        if (productSection) productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const HERO_MAIN_SLIDES = [
        {
            tag: 'SIÊU HỘI MẸ & BÉ · TRÀ VINH',
            title: 'Chính Hãng 100% – Giao Siêu Tốc 1H',
            desc: 'Sữa công thức, tã bỉm thấm hút và bình sữa BPA-Free đồng loạt ưu đãi đến 22%, tặng quà kèm đơn.',
            cta: 'Mua sắm ngay',
            bg: 'linear-gradient(135deg, #ff4d8d 0%, #fb7185 55%, #ff9ec0 100%)',
            kind: 'product',
            category: 'all',
            art: `<svg viewBox="0 0 180 150" fill="none"><circle cx="90" cy="75" r="64" fill="rgba(255,255,255,0.18)"/><rect x="42" y="38" width="54" height="76" rx="10" fill="#ffffff"/><rect x="40" y="32" width="58" height="14" rx="5" fill="#ffe4ee"/><circle cx="69" cy="76" r="14" fill="#ff4d8d"/><path d="M108 58h36l-6 44h-24z" fill="#fef3c7"/><circle cx="126" cy="48" r="10" fill="#ffffff"/></svg>`
        },
        {
            tag: 'CHĂM SÓC SAU SINH CHUYÊN SÂU',
            title: 'Thông Tắc Tia Sữa Không Đau Chuẩn Y Khoa',
            desc: 'Điều dưỡng kinh nghiệm hỗ trợ tận nhà trong 1H, ứng dụng sóng siêu âm và day ấn huyệt an toàn.',
            cta: 'Đặt lịch ngay',
            bg: 'linear-gradient(135deg, #db2777 0%, #ff4d8d 60%, #f472b6 100%)',
            kind: 'service',
            category: 'Chăm sóc Mẹ',
            art: `<svg viewBox="0 0 180 150" fill="none"><circle cx="90" cy="75" r="64" fill="rgba(255,255,255,0.18)"/><path d="M90 28 C118 62 132 82 132 102 A42 42 0 1 1 48 102 C48 82 62 62 90 28 Z" fill="#ffffff"/><rect x="84" y="84" width="12" height="32" rx="4" fill="#ff4d8d"/><rect x="74" y="94" width="32" height="12" rx="4" fill="#ff4d8d"/></svg>`
        },
        {
            tag: 'TẮM BÉ & THỦY LIỆU SƠ SINH',
            title: 'Tắm Massage Bé Tại Nhà Chỉ Từ 280.000đ',
            desc: 'Kiểm tra rốn, massage kích thích tiêu hóa, tắm thảo dược ấm giúp bé ngủ ngon trọn giấc.',
            cta: 'Xem dịch vụ bé',
            bg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 65%, #7dd3fc 100%)',
            kind: 'service',
            category: 'Chăm sóc Bé',
            art: `<svg viewBox="0 0 180 150" fill="none"><circle cx="90" cy="75" r="64" fill="rgba(255,255,255,0.2)"/><path d="M40 84 C40 116 140 116 140 84 Z" fill="#ffffff"/><rect x="34" y="76" width="112" height="12" rx="6" fill="#e0f2fe"/><circle cx="72" cy="54" r="14" fill="#ffffff"/><circle cx="110" cy="46" r="10" fill="#bae6fd"/></svg>`
        },
        {
            tag: 'COMBO BÌNH SỮA & ĂN DẶM',
            title: 'Máy Hâm Sữa, Tiệt Trùng & Bột Hữu Cơ',
            desc: 'An toàn tuyệt đối cho giai đoạn bé bắt đầu ăn dặm, bảo hành chính hãng 12 tháng.',
            cta: 'Khám phá ngay',
            bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 65%, #fbbf24 100%)',
            kind: 'product',
            category: 'Bình sữa & Ăn dặm',
            art: `<svg viewBox="0 0 180 150" fill="none"><circle cx="90" cy="75" r="64" fill="rgba(255,255,255,0.2)"/><rect x="64" y="42" width="52" height="82" rx="14" fill="#ffffff"/><rect x="72" y="28" width="36" height="14" rx="5" fill="#fef3c7"/><rect x="74" y="80" width="32" height="30" rx="6" fill="#fde68a"/></svg>`
        },
        {
            tag: 'BÁC SĨ NHI & DINH DƯỠNG 1:1',
            title: 'Theo Dõi Tăng Trưởng & Thực Đơn Cho Bé',
            desc: 'Thăm khám nhi khoa tại nhà, tư vấn lịch tiêm chủng và xây dựng thực đơn ăn dặm khoa học.',
            cta: 'Tìm hiểu thêm',
            bg: 'linear-gradient(135deg, #059669 0%, #10b981 65%, #34d399 100%)',
            kind: 'service',
            category: 'Y tế & Dinh dưỡng',
            art: `<svg viewBox="0 0 180 150" fill="none"><circle cx="90" cy="75" r="64" fill="rgba(255,255,255,0.2)"/><rect x="52" y="34" width="76" height="86" rx="14" fill="#ffffff"/><rect x="84" y="54" width="12" height="44" rx="4" fill="#10b981"/><rect x="68" y="70" width="44" height="12" rx="4" fill="#10b981"/></svg>`
        }
    ];

    mountAutoSlider({
        container: document.getElementById('hero-main-slider'),
        slides: HERO_MAIN_SLIDES,
        intervalMs: 4500,
        renderSlide: slide => `
            <div class="hero-slide-card" style="background: ${slide.bg};">
                <div class="hero-slide-content">
                    <span class="hero-slide-tag">${AppUI.escapeHtml(slide.tag)}</span>
                    <h1 class="hero-slide-title">${AppUI.escapeHtml(slide.title)}</h1>
                    <p class="hero-slide-desc">${AppUI.escapeHtml(slide.desc)}</p>
                    <button type="button" class="hero-slide-cta">${AppUI.escapeHtml(slide.cta)} &rarr;</button>
                </div>
                <div class="hero-slide-art">${slide.art}</div>
            </div>
        `,
        onSlideClick: slide => handleCatalogJump(slide.kind, slide.category)
    });

    const MINI_TOP_SLIDES = [
        { tag: 'FREESHIP 1H', title: 'Freeship Mọi Đơn Sữa & Bỉm', sub: 'Giao tận tay trong 60 phút tại Trà Vinh', bg: 'linear-gradient(135deg, #ff4d8d 0%, #f43f5e 100%)', kind: 'product', category: 'all', quick: 'freeship', icon: '🚚' },
        { tag: 'TẶNG QUÀ XINH', title: 'Tặng 20 Túi Trữ Sữa', sub: 'Áp dụng khi mua Máy hút sữa điện đôi', bg: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)', kind: 'product', category: 'Mẹ bầu & Sau sinh', quick: '', icon: '🎁' },
        { tag: 'COMBO TIẾT KIỆM', title: 'Tã Bobby & Huggies -20%', sub: 'Mua combo 2 bịch tặng thêm khăn ướt', bg: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)', kind: 'product', category: 'Tã & Bỉm', quick: 'discount', icon: '🏷️' }
    ];

    mountAutoSlider({
        container: document.getElementById('hero-side-slider-top'),
        slides: MINI_TOP_SLIDES,
        intervalMs: 4200,
        initialDelayMs: 900,
        renderSlide: slide => `
            <div class="mini-slide-card" style="background: ${slide.bg};">
                <div>
                    <span class="mini-slide-tag">${AppUI.escapeHtml(slide.tag)}</span>
                    <div class="mini-slide-title">${AppUI.escapeHtml(slide.title)}</div>
                    <div class="mini-slide-sub">${AppUI.escapeHtml(slide.sub)}</div>
                </div>
                <span class="mini-slide-icon" aria-hidden="true">${slide.icon}</span>
            </div>
        `,
        onSlideClick: slide => handleCatalogJump(slide.kind, slide.category, slide.quick)
    });

    const MINI_BOTTOM_SLIDES = [
        { tag: 'MÃ TTTSCS_01', title: 'Thông Tắc Tia Sữa Cấp Tốc', sub: 'Sóng siêu âm không đau · Có mặt sau 1H', bg: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', kind: 'service', category: 'Chăm sóc Mẹ', quick: '', icon: '🩺' },
        { tag: 'GIẢM -20%', title: 'Tắm & Massage Bé Sơ Sinh', sub: 'Điều dưỡng chăm sóc chuẩn y khoa tại nhà', bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', kind: 'service', category: 'Chăm sóc Bé', quick: 'atHome', icon: '🛁' },
        { tag: 'Y TẾ 1:1', title: 'Khám Sức Khỏe Nhi Tại Nhà', sub: 'Theo dõi biểu đồ tăng trưởng cho bé yêu', bg: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', kind: 'service', category: 'Y tế & Dinh dưỡng', quick: '', icon: '📋' }
    ];

    mountAutoSlider({
        container: document.getElementById('hero-side-slider-bottom'),
        slides: MINI_BOTTOM_SLIDES,
        intervalMs: 5100,
        initialDelayMs: 1700,
        renderSlide: slide => `
            <div class="mini-slide-card" style="background: ${slide.bg};">
                <div>
                    <span class="mini-slide-tag">${AppUI.escapeHtml(slide.tag)}</span>
                    <div class="mini-slide-title">${AppUI.escapeHtml(slide.title)}</div>
                    <div class="mini-slide-sub">${AppUI.escapeHtml(slide.sub)}</div>
                </div>
                <span class="mini-slide-icon" aria-hidden="true">${slide.icon}</span>
            </div>
        `,
        onSlideClick: slide => handleCatalogJump(slide.kind, slide.category, slide.quick)
    });

    const MID_DUAL_PAIRS = [
        {
            left: { badge: 'SỮA BỘT & SỮA PHA SẴN', title: 'Tuần Lễ Dinh Dưỡng Cho Bé 1-3 Tuổi', sub: 'Aptamil KID, GrowPLUS+ giảm đến 20% kèm quà', cta: 'Xem Sữa', bg: 'linear-gradient(135deg, #ff4d8d 0%, #fb7185 100%)', kind: 'product', category: 'Sữa & Dinh dưỡng' },
            right: { badge: 'ĐIỀU DƯỠNG TẠI NHÀ', title: 'Phục Hồi Sức Khỏe & Xông Hơi Sau Sinh', sub: 'Xông hơi thảo mộc, massage body & thông tia sữa', cta: 'Đặt lịch', bg: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', kind: 'service', category: 'Chăm sóc Mẹ' }
        },
        {
            left: { badge: 'CHĂM SÓC DA BÉ YÊU', title: 'Sữa Tắm Dịu Nhẹ & Khăn Ướt Tinh Khiết', sub: 'Cetaphil Baby, Mamamy Freeship tận nhà 1H', cta: 'Mua ngay', bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', kind: 'product', category: 'Chăm sóc da & Tắm gội' },
            right: { badge: 'BƠI THỦY LIỆU', title: 'Vận Động Sớm Phát Triển Chiều Cao Cho Bé', sub: 'Hồ bơi riêng vô trùng, nhiệt độ nước chuẩn 37°C', cta: 'Xem gói', bg: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', kind: 'service', category: 'Chăm sóc Bé' }
        },
        {
            left: { badge: 'MẸ BẦU THÔNG THÁI', title: 'Sữa Bầu Morinaga & Máy Hút Sữa Rảnh Tay', sub: 'Đầy đủ dưỡng chất thai kỳ, kích sữa nhẹ nhàng', cta: 'Chọn mua', bg: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)', kind: 'product', category: 'Mẹ bầu & Sau sinh' },
            right: { badge: 'BẢO MẪU & DINH DƯỠNG', title: 'Tư Vấn Ăn Dặm 1:1 & Trông Trẻ Theo Ca', sub: 'Nhân sự đã kiểm tra lý lịch, hỗ trợ mẹ chu đáo', cta: 'Khám phá', bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', kind: 'service', category: 'Y tế & Dinh dưỡng' }
        }
    ];

    const midCarouselEl = document.getElementById('mid-promo-carousel');
    if (midCarouselEl) {
        mountAutoSlider({
            container: midCarouselEl,
            slides: MID_DUAL_PAIRS,
            intervalMs: 5600,
            initialDelayMs: 2100,
            renderSlide: pair => `
                <div class="mid-dual-grid">
                    <div class="mid-dual-card" data-side="left" style="background: ${pair.left.bg};">
                        <div>
                            <span class="mid-dual-badge">${AppUI.escapeHtml(pair.left.badge)}</span>
                            <div class="mid-dual-title">${AppUI.escapeHtml(pair.left.title)}</div>
                            <div class="mid-dual-sub">${AppUI.escapeHtml(pair.left.sub)}</div>
                        </div>
                        <span class="mid-dual-cta">${AppUI.escapeHtml(pair.left.cta)}</span>
                    </div>
                    <div class="mid-dual-card" data-side="right" style="background: ${pair.right.bg};">
                        <div>
                            <span class="mid-dual-badge">${AppUI.escapeHtml(pair.right.badge)}</span>
                            <div class="mid-dual-title">${AppUI.escapeHtml(pair.right.title)}</div>
                            <div class="mid-dual-sub">${AppUI.escapeHtml(pair.right.sub)}</div>
                        </div>
                        <span class="mid-dual-cta">${AppUI.escapeHtml(pair.right.cta)}</span>
                    </div>
                </div>
            `
        });

        midCarouselEl.addEventListener('click', function(e) {
            const card = e.target.closest('.mid-dual-card');
            if (!card) return;
            const slideIdx = Array.from(midCarouselEl.querySelectorAll('.kh-slider-slide')).indexOf(card.closest('.kh-slider-slide'));
            const pair = MID_DUAL_PAIRS[slideIdx];
            if (!pair) return;
            const cfg = card.getAttribute('data-side') === 'right' ? pair.right : pair.left;
            handleCatalogJump(cfg.kind, cfg.category);
        });
    }

    const offersGridEl = document.getElementById('kh-offers-grid');
    if (offersGridEl) {
        const offers = [
            { title: 'Freeship Siêu Tốc 1H Trà Vinh', desc: 'Áp dụng cho sản phẩm gắn nhãn Freeship giao nhanh tận nhà.', btn: 'Lọc Freeship', kind: 'product', category: 'all', quick: 'freeship' },
            { title: 'Ưu Đãi Sữa, Tã & Dụng Cụ -22%', desc: 'Các sản phẩm giảm giá sâu và kèm quà tặng hấp dẫn cho mẹ và bé.', btn: 'Xem giảm giá', kind: 'product', category: 'all', quick: 'discount' },
            { title: 'Dịch Vụ Điều Dưỡng Tận Nhà', desc: 'Tắm bé, massage bầu, thông tia sữa thực hiện ngay tại nhà.', btn: 'Xem dịch vụ', kind: 'service', category: 'all', quick: 'atHome' },
            { title: 'Gói Chăm Sóc Nhiều Quyền Lợi', desc: 'Các gói từ 3 quyền lợi chuyên sâu kèm theo dõi sức khỏe miễn phí.', btn: 'Khám phá', kind: 'service', category: 'all', quick: 'richBenefits' }
        ];
        offersGridEl.innerHTML = offers.map((o, idx) => `
            <div class="kh-offer-card">
                <div>
                    <div class="kh-offer-title">${AppUI.escapeHtml(o.title)}</div>
                    <div class="kh-offer-desc">${AppUI.escapeHtml(o.desc)}</div>
                </div>
                <button type="button" class="kh-offer-btn" data-offer-idx="${idx}">${AppUI.escapeHtml(o.btn)}</button>
            </div>
        `).join('');
        offersGridEl.querySelectorAll('[data-offer-idx]').forEach(btn => {
            btn.addEventListener('click', function() {
                const o = offers[parseInt(this.getAttribute('data-offer-idx'), 10)];
                if (o) handleCatalogJump(o.kind, o.category, o.quick);
            });
        });
    }

    /* Menu danh mục bên trái & Thanh tìm kiếm toàn trang */
    const sidebarItems = document.querySelectorAll('#kh-sidebar-menu .kh-sidebar-item');
    sidebarItems.forEach(btn => {
        btn.addEventListener('click', function() {
            sidebarItems.forEach(item => item.classList.remove('active'));
            this.classList.add('active');

            const action = this.getAttribute('data-side-action');
            const val = this.getAttribute('data-value') || 'all';
            if (action === 'product' || action === 'service') {
                handleCatalogJump(action, val);
            } else if (action === 'tab') {
                switchHubTab(val);
                const hubEl = document.getElementById('thong-tin');
                if (hubEl) hubEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    const headerSearchForm = document.getElementById('header-search-form');
    const headerSearchInput = document.getElementById('header-search-input');

    function applyGlobalSearch(scrollAfter) {
        if (!headerSearchInput) return;
        const term = headerSearchInput.value.trim();
        filterState.search = term;
        serviceFilterState.search = term;
        if (productSearch) productSearch.value = term;
        if (serviceSearch) serviceSearch.value = term;

        renderProductsGrid();
        renderServicesGrid();

        if (scrollAfter && term) {
            const matchedProds = getFilteredProducts(getRealSoldCounts()).length;
            const matchedSvcs = getFilteredServices(getRealServiceBookedCounts()).length;
            const targetSection = (matchedProds === 0 && matchedSvcs > 0) ? serviceSection : productSection;
            if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (headerSearchInput) {
        headerSearchInput.addEventListener('input', debounce(function() {
            applyGlobalSearch(false);
        }, 140));
    }

    if (headerSearchForm) {
        headerSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            applyGlobalSearch(true);
        });
    }

    /* Đồng bộ realtime giữa các tab trình duyệt */
    window.addEventListener('storage', function(e) {
        if (e.key === AppData.SERVICES_KEY) {
            renderServicesGrid();
            syncOpenDetailModal(serviceDetailModal, 'data-service-id', AppData.loadServices(), openServiceDetail);
        } else if (e.key === AppData.PRODUCTS_KEY) {
            renderProductsGrid();
            syncOpenDetailModal(productDetailModal, 'data-product-id', AppData.loadProducts(), openProductDetailModal);
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
