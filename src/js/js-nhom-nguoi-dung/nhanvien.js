document.addEventListener('DOMContentLoaded', function() {
    const currentUser = AppData.requireRole('nhanvien', '../html-dangki-dangnhap/login.html');
    if (!currentUser) return;

    function debounceStaff(fn, delayMs) {
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

    function updateBadge(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(text);
    }

    /* Trạng thái kết nối CSDL */
    function updateStaffDatabasePill() {
        const pill = document.getElementById('staff-db-status');
        if (!pill) return;
        const connected = typeof AppData.isDatabaseConnected === 'function' && AppData.isDatabaseConnected();
        pill.textContent = connected ? '● MySQL Real-time' : '● Chế độ trình duyệt';
        pill.classList.toggle('is-mysql', connected);
    }

    /* Cuộn tới mục và đồng bộ active sidebar */
    function scrollToStaffSection(sectionId) {
        const target = sectionId ? document.getElementById(sectionId) : null;
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.staff-sidebar [data-scroll-target]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-scroll-target') === sectionId);
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            AppUI.confirm({
                title: 'Xác nhận đăng xuất',
                message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản nhân viên?',
                confirmText: 'Đăng xuất',
                cancelText: 'Ở lại',
                onConfirm: function() {
                    AppData.logout('../html-dangki-dangnhap/login.html');
                }
            });
        });
    }

    /* Hồ sơ nhân viên */
    const staffDisplay = document.getElementById('staff-display');
    const staffForm = document.getElementById('staff-form');
    const btnEditStaff = document.getElementById('btn-edit-staff');
    const btnCancelStaff = document.getElementById('btn-cancel-staff');

    const dispName = document.getElementById('disp-staff-name');
    const dispPhone = document.getElementById('disp-staff-phone');
    const dispRole = document.getElementById('disp-staff-role');
    const dispArea = document.getElementById('disp-staff-area');

    const inputName = document.getElementById('staff-name-input');
    const inputPhone = document.getElementById('staff-phone-input');
    const inputRole = document.getElementById('staff-role-input');
    const inputArea = document.getElementById('staff-area-input');

    const headerAvatar = document.getElementById('header-avatar');
    const headerUsername = document.getElementById('header-username');
    const staffAvatarDisplay = document.getElementById('staff-avatar-display');
    const staffAvatarName = document.getElementById('staff-avatar-name');
    const staffAvatarRole = document.getElementById('staff-avatar-role');
    const heroStaffGreeting = document.getElementById('hero-staff-greeting');

    const staffAvatarPreview = document.getElementById('staff-avatar-preview');
    const staffAvatarInput = document.getElementById('staff-avatar-input');
    const btnChooseStaffAvatar = document.getElementById('btn-choose-staff-avatar');
    const btnRemoveStaffAvatar = document.getElementById('btn-remove-staff-avatar');

    let pendingStaffAvatar = '';

    function getStaffProfile() {
        const emailLower = (currentUser.email || '').toLowerCase();
        const users = AppData.loadUsers();
        const userRecord = users.find(u =>
            u && u.role === 'nhanvien' && (u.email || '').toLowerCase() === emailLower
        ) || {};

        const staffList = AppData.loadStaff();

        const staffRecord = staffList.find(s =>
            s && (
                (s.email && s.email.toLowerCase() === emailLower) ||
                (userRecord.phone && s.phone && s.phone.trim() === userRecord.phone.trim())
            )
        ) || {};

        return {
            email: currentUser.email || '',
            name: staffRecord.name || userRecord.fullname || currentUser.fullname || '',
            phone: staffRecord.phone || userRecord.phone || '',
            role: staffRecord.role || userRecord.staffRole || '',
            area: staffRecord.area || userRecord.area || '',
            avatar: staffRecord.avatar !== undefined ? staffRecord.avatar : (userRecord.avatar || '')
        };
    }

    function saveStaffProfileData(newData) {
        const emailLower = (currentUser.email || '').toLowerCase();

        // 1. Cập nhật trong users
        const users = AppData.loadUsers();
        const uIdx = users.findIndex(u =>
            u && u.role === 'nhanvien' && (u.email || '').toLowerCase() === emailLower
        );
        if (uIdx !== -1) {
            users[uIdx].fullname = newData.name;
            users[uIdx].phone = newData.phone;
            users[uIdx].staffRole = newData.role;
            users[uIdx].area = newData.area;
            users[uIdx].avatar = newData.avatar;
            if (!AppData.saveUsers(users)) return false;
        }

        // 2. Đồng bộ sang facilityStaffList (CSDL bảng staff)
        const staffList = AppData.loadStaff();

        const sIdx = staffList.findIndex(s =>
            s && (
                (s.email && s.email.toLowerCase() === emailLower) ||
                (newData.phone && s.phone && s.phone.trim() === newData.phone)
            )
        );
        const staffEntry = {
            email: currentUser.email || '',
            name: newData.name,
            phone: newData.phone,
            role: newData.role,
            area: newData.area,
            avatar: newData.avatar
        };
        if (sIdx !== -1) {
            staffList[sIdx] = staffEntry;
        } else {
            staffList.push(staffEntry);
        }

        if (!AppData.saveStaff(staffList)) {
            return false;
        }
        try {
            localStorage.setItem('nhanVienProfile', JSON.stringify(staffEntry));
        } catch (err) {
            // ignore profile cache warning
        }

        // 3. Cập nhật tên/SĐT trên các ca trực đã đăng ký của chính nhân viên này
        const shifts = AppData.loadShifts();
        let shiftChanged = false;
        shifts.forEach(sh => {
            if (sh.staffEmail && sh.staffEmail.toLowerCase() === emailLower) {
                if (sh.staff !== newData.name || sh.staffPhone !== newData.phone) {
                    sh.staff = newData.name;
                    sh.staffPhone = newData.phone;
                    shiftChanged = true;
                }
            }
        });
        if (shiftChanged) {
            AppData.saveShifts(shifts);
        }

        AppData.setCurrentUser({
            fullname: newData.name,
            email: currentUser.email,
            role: currentUser.role
        });
        currentUser.fullname = newData.name;
        return true;
    }

    function renderStaffAvatarPreview(src, name) {
        if (!staffAvatarPreview) return;
        staffAvatarPreview.innerHTML = '';
        staffAvatarPreview.appendChild(AppUI.createAvatar(src, name || 'Nhân viên', 88));
        if (btnRemoveStaffAvatar) {
            if (src) {
                btnRemoveStaffAvatar.classList.remove('hidden');
            } else {
                btnRemoveStaffAvatar.classList.add('hidden');
            }
        }
    }

    function loadStaffProfile() {
        const data = getStaffProfile();
        dispName.textContent = data.name || 'Chưa cập nhật';
        dispPhone.textContent = data.phone || 'Chưa cập nhật';
        dispRole.textContent = data.role || 'Chưa cập nhật';
        dispArea.textContent = data.area || 'Chưa cập nhật';

        const displayName = data.name || currentUser.email || 'Nhân viên';
        if (headerAvatar) {
            headerAvatar.innerHTML = '';
            headerAvatar.appendChild(AppUI.createAvatar(data.avatar, displayName, 32));
        }
        if (headerUsername) {
            headerUsername.textContent = displayName;
        }
        if (staffAvatarDisplay) {
            staffAvatarDisplay.innerHTML = '';
            staffAvatarDisplay.appendChild(AppUI.createAvatar(data.avatar, displayName, 88));
        }
        if (staffAvatarName) {
            staffAvatarName.textContent = displayName;
        }
        if (staffAvatarRole) {
            staffAvatarRole.textContent = data.role || 'Nhân viên chuyên môn';
        }
        if (heroStaffGreeting) {
            heroStaffGreeting.textContent = `Xin chào, ${displayName}!`;
        }
    }

    updateStaffDatabasePill();
    loadStaffProfile();

    btnEditStaff.addEventListener('click', function() {
        const saved = getStaffProfile();
        inputName.value = dispName.textContent !== 'Chưa cập nhật' ? dispName.textContent : '';
        inputPhone.value = dispPhone.textContent !== 'Chưa cập nhật' ? dispPhone.textContent : '';
        inputRole.value = dispRole.textContent !== 'Chưa cập nhật' ? dispRole.textContent : '';
        inputArea.value = dispArea.textContent !== 'Chưa cập nhật' ? dispArea.textContent : '';

        pendingStaffAvatar = saved.avatar || '';
        renderStaffAvatarPreview(pendingStaffAvatar, inputName.value || 'Nhân viên');

        staffDisplay.classList.add('hidden');
        staffForm.classList.remove('hidden');
    });

    btnCancelStaff.addEventListener('click', function() {
        pendingStaffAvatar = '';
        staffForm.classList.add('hidden');
        staffDisplay.classList.remove('hidden');
    });

    if (btnChooseStaffAvatar && staffAvatarInput) {
        btnChooseStaffAvatar.addEventListener('click', function() {
            staffAvatarInput.click();
        });

        staffAvatarInput.addEventListener('change', function() {
            const file = staffAvatarInput.files && staffAvatarInput.files[0];
            if (!file) return;

            AppUI.readImageFile(file, 256)
                .then(function(dataUrl) {
                    pendingStaffAvatar = dataUrl;
                    renderStaffAvatarPreview(pendingStaffAvatar, inputName.value || 'Nhân viên');
                })
                .catch(function(err) {
                    AppUI.error({
                        title: 'Không thể tải ảnh đại diện',
                        message: err && err.message ? err.message : 'Vui lòng chọn tệp ảnh hợp lệ.'
                    });
                })
                .finally(function() {
                    staffAvatarInput.value = '';
                });
        });
    }

    if (btnRemoveStaffAvatar) {
        btnRemoveStaffAvatar.addEventListener('click', function() {
            pendingStaffAvatar = '';
            renderStaffAvatarPreview('', inputName.value || 'Nhân viên');
        });
    }

    if (inputName) {
        inputName.addEventListener('input', function() {
            if (!pendingStaffAvatar) {
                renderStaffAvatarPreview('', inputName.value || 'Nhân viên');
            }
        });
    }

    staffForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newData = {
            name: inputName.value.trim(),
            phone: inputPhone.value.trim(),
            role: inputRole.value.trim(),
            area: inputArea.value.trim(),
            avatar: pendingStaffAvatar || ''
        };

        if (!saveStaffProfileData(newData)) {
            AppUI.error({
                title: 'Không thể lưu thông tin',
                message: 'Bộ nhớ trình duyệt đã đầy hoặc bị chặn. Vui lòng thử ảnh nhỏ hơn.'
            });
            return;
        }

        loadStaffProfile();
        renderTimetable();
        if (!shiftForm.classList.contains('hidden')) {
            renderShiftPicker();
        }

        staffForm.classList.add('hidden');
        staffDisplay.classList.remove('hidden');

        AppUI.success({
            title: 'Cập nhật thông tin thành công',
            message: 'Hồ sơ nhân viên của bạn đã được lưu lại.',
            details: [
                ['Họ và tên', newData.name || 'Chưa cập nhật'],
                ['Số điện thoại', newData.phone || 'Chưa cập nhật'],
                ['Chuyên môn', newData.role || 'Chưa cập nhật'],
                ['Khu vực', newData.area || 'Chưa cập nhật']
            ]
        });
    });


    /* Lịch ca trực */
    const timetableContainer = document.getElementById('weekly-timetable-container');
    const shiftWeekSummary = document.getElementById('shift-week-summary');
    const filterYear = document.getElementById('filter-year');
    const filterWeek = document.getElementById('filter-week');
    const btnPrevWeek = document.getElementById('btn-prev-week');
    const btnThisWeek = document.getElementById('btn-this-week');
    const btnNextWeek = document.getElementById('btn-next-week');

    const btnAddShift = document.getElementById('btn-add-shift');
    const shiftForm = document.getElementById('shift-form');
    const shiftFormWeekLabel = document.getElementById('shift-form-week-label');
    const shiftPickerTable = document.getElementById('shift-picker');
    const shiftSelectedCount = document.getElementById('shift-selected-count');
    const btnClearShiftSelection = document.getElementById('btn-clear-shift-selection');
    const btnConfirmShifts = document.getElementById('btn-confirm-shifts');
    const btnCancelShift = document.getElementById('btn-cancel-shift');

    const selectedSlots = new Map();

    function isMyShift(shift, profile) {
        if (!shift || !profile) return false;
        const cEmail = (currentUser.email || '').trim().toLowerCase();
        const sEmail = (shift.staffEmail || '').trim().toLowerCase();
        if (cEmail && sEmail) {
            return cEmail === sEmail;
        }
        const pPhone = (profile.phone || '').trim();
        const sPhone = (shift.staffPhone || '').trim();
        if (pPhone && sPhone) {
            return pPhone === sPhone;
        }
        const pName = (profile.name || '').trim();
        const sName = (shift.staff || '').trim();
        if (!pName || !sName) return false;
        return pName.toLowerCase() === sName.toLowerCase();
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function populateYearFilter() {
        const currentYear = new Date().getFullYear();
        filterYear.innerHTML = '';
        for (let y = currentYear - 1; y <= currentYear + 2; y++) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            if (y === currentYear) opt.selected = true;
            filterYear.appendChild(opt);
        }
    }

    function formatWeekLabel(weekNumber, mondayDate) {
        const sundayDate = AppData.addDays(mondayDate, 6);
        return `Tuần ${pad2(weekNumber)} (${pad2(mondayDate.getDate())}/${pad2(mondayDate.getMonth() + 1)} – ${AppData.formatDate(sundayDate)})`;
    }

    function populateWeeksForYear(year, preferredMondayISO) {
        const y = parseInt(year, 10);
        filterWeek.innerHTML = '';

        const firstMonday = AppData.getMonday(new Date(y, 0, 1));
        const groups = new Map();
        let weekNumber = 1;
        let cursor = firstMonday;

        while (cursor.getFullYear() <= y) {
            const mondayISO = AppData.toISODate(cursor);
            const groupKey = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`;
            const groupLabel = `Tháng ${cursor.getMonth() + 1}/${cursor.getFullYear()}`;

            if (!groups.has(groupKey)) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = groupLabel;
                groups.set(groupKey, optgroup);
                filterWeek.appendChild(optgroup);
            }

            const opt = document.createElement('option');
            opt.value = mondayISO;
            opt.textContent = formatWeekLabel(weekNumber, cursor);
            groups.get(groupKey).appendChild(opt);

            cursor = AppData.addDays(cursor, 7);
            weekNumber++;
        }

        const todayMondayISO = AppData.toISODate(AppData.getMonday(new Date()));
        const allOptions = Array.from(filterWeek.options);
        const preferred = preferredMondayISO && allOptions.find(o => o.value === preferredMondayISO);
        const currentWeekOpt = allOptions.find(o => o.value === todayMondayISO);

        if (preferred) {
            filterWeek.value = preferred.value;
        } else if (currentWeekOpt) {
            filterWeek.value = currentWeekOpt.value;
        } else if (allOptions.length > 0) {
            filterWeek.value = allOptions[0].value;
        }

        selectedSlots.clear();
        renderTimetable();
        if (!shiftForm.classList.contains('hidden')) {
            renderShiftPicker();
        }
    }

    function getSelectedWeekText() {
        const opt = filterWeek.options[filterWeek.selectedIndex];
        return opt ? opt.textContent : '';
    }

    function navigateWeekBy(offsetDays) {
        const currentMonday = AppData.parseISODate(filterWeek.value);
        if (!currentMonday) return;
        const targetMonday = AppData.addDays(currentMonday, offsetDays);
        const targetISO = AppData.toISODate(targetMonday);

        const existsInCurrent = Array.from(filterWeek.options).some(o => o.value === targetISO);
        if (existsInCurrent) {
            filterWeek.value = targetISO;
            selectedSlots.clear();
            renderTimetable();
            if (!shiftForm.classList.contains('hidden')) {
                renderShiftPicker();
            }
            return;
        }

        const targetSunday = AppData.addDays(targetMonday, 6);
        const candidateYears = [targetMonday.getFullYear(), targetSunday.getFullYear()];
        const availableYears = Array.from(filterYear.options).map(o => parseInt(o.value, 10));

        const matchedYear = candidateYears.find(cy => availableYears.indexOf(cy) !== -1);
        if (matchedYear !== undefined) {
            filterYear.value = String(matchedYear);
            populateWeeksForYear(matchedYear, targetISO);
        } else {
            AppUI.warning({
                title: 'Ngoài phạm vi hiển thị',
                message: 'Đã chạm giới hạn năm hỗ trợ trên bộ lọc lịch trực.'
            });
        }
    }

    /* Bảng thời khóa biểu ca trực tuần */
    function renderTimetable() {
        const shifts = AppData.loadShifts();
        const profile = getStaffProfile();
        const weekStartISO = filterWeek.value;
        const weekMonday = AppData.parseISODate(weekStartISO);
        const todayISO = AppData.toISODate(new Date());
        const now = new Date();

        const weekShifts = shifts.filter(s => s.weekStart === weekStartISO);
        const myWeekShifts = weekShifts.filter(s => isMyShift(s, profile));
        const myHours = myWeekShifts.reduce((sum, s) => sum + AppData.shiftHours(s.shiftKey), 0);

        if (shiftWeekSummary) {
            shiftWeekSummary.textContent = `Tuần này bạn đã đăng ký ${myWeekShifts.length} ca (${myHours} giờ)`;
        }
        updateBadge('hero-week-shifts', `${myWeekShifts.length} ca (${myHours} giờ)`);
        updateBadge('side-shifts-count', `${myWeekShifts.length} ca`);
        updateBadge('shift-count-pill', `${myWeekShifts.length} ca tuần này`);

        const weekLabel = getSelectedWeekText();
        const shiftOrder = { sang: 1, chieu: 2, toi: 3 };

        const rowsHtml = AppData.DAY_NAMES.map((day, offset) => {
            const dayDateObj = weekMonday ? AppData.addDays(weekMonday, offset) : null;
            const dayDateISO = dayDateObj ? AppData.toISODate(dayDateObj) : '';
            const dayDateLabel = dayDateObj ? AppData.formatDate(dayDateObj) : '';
            const isToday = Boolean(dayDateISO && dayDateISO === todayISO);

            const dayShifts = weekShifts
                .filter(item => item.date === dayDateISO || item.day === day)
                .slice()
                .sort((a, b) => (shiftOrder[a.shiftKey] || 9) - (shiftOrder[b.shiftKey] || 9));

            let timeContent = '<span style="color: var(--text-muted); font-style: italic;">Trống (Nghỉ)</span>';
            let staffContent = '-';
            let statusContent = '-';
            let actionContent = '-';

            if (dayShifts.length > 0) {
                timeContent = dayShifts.map(s => `<div style="padding: 3px 0; font-weight: 500;">• ${AppUI.escapeHtml(s.time)}</div>`).join('');
                staffContent = dayShifts.map(s => `<div style="padding: 3px 0; font-weight: 600; color: #0284c7;">${AppUI.escapeHtml(s.staff || 'Chưa rõ')}</div>`).join('');

                statusContent = dayShifts.map(s => {
                    const statusText = AppData.getShiftStatus(s, now);
                    const pillCls = statusText === 'Đã hoàn thành'
                        ? 'is-done'
                        : (statusText === 'Đang trực' ? 'is-active' : 'is-upcoming');
                    return `<div><span class="shift-status-pill ${pillCls}">${statusText}</span></div>`;
                }).join('');

                actionContent = dayShifts.map(s => {
                    const statusText = AppData.getShiftStatus(s, now);
                    if (isMyShift(s, profile) && statusText === 'Sắp tới') {
                        return `<button type="button" class="btn-delete-shift" data-id="${AppUI.escapeHtml(s.id)}">Hủy</button>`;
                    }
                    return '<div style="padding: 3px 0; color: var(--text-muted);">-</div>';
                }).join('');
            }

            return `
                <tr class="${isToday ? 'row-today' : ''}">
                    <td style="font-weight: 600;">
                        <div>${day}${isToday ? ' <span style="font-size:0.75rem;color:var(--primary);">(Hôm nay)</span>' : ''}</div>
                        <div style="font-size: 0.78rem; font-weight: 400; color: var(--text-muted);">${dayDateLabel}</div>
                    </td>
                    <td>${timeContent}</td>
                    <td>${staffContent}</td>
                    <td>${statusContent}</td>
                    <td style="text-align: center;">${actionContent}</td>
                </tr>
            `;
        }).join('');

        timetableContainer.innerHTML = `
            <table class="staff-data-table">
                <thead>
                    <tr>
                        <th style="width: 20%;">Thứ</th>
                        <th style="width: 35%;">Ca Trực (${AppUI.escapeHtml(weekLabel)})</th>
                        <th style="width: 15%;">Nhân viên</th>
                        <th style="width: 15%;">Trạng thái</th>
                        <th style="width: 15%; text-align: center;">Hành động</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;
    }

    if (timetableContainer) {
        timetableContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-delete-shift');
            if (!btn) return;
            const shiftId = btn.getAttribute('data-id');
            const currentShifts = AppData.loadShifts();
            const target = currentShifts.find(item => item.id === shiftId);
            if (!target) return;

            AppUI.confirm({
                title: 'Xác nhận hủy ca trực',
                message: `Bạn có chắc chắn muốn hủy ${target.time} vào ${target.day} (${AppData.formatDate(target.date)}) không?`,
                danger: true,
                confirmText: 'Hủy ca',
                cancelText: 'Giữ lại',
                onConfirm: function() {
                    const latest = AppData.loadShifts();
                    const idx = latest.findIndex(item => item.id === shiftId);
                    if (idx === -1) return;
                    latest.splice(idx, 1);
                    if (!AppData.saveShifts(latest)) {
                        AppUI.error({
                            title: 'Lỗi lưu dữ liệu',
                            message: 'Không thể cập nhật lịch trực.'
                        });
                        return;
                    }
                    renderTimetable();
                    if (!shiftForm.classList.contains('hidden')) {
                        renderShiftPicker();
                    }
                    AppUI.success({
                        title: 'Đã hủy ca trực',
                        message: 'Ca trực đã được xóa khỏi thời khóa biểu.',
                        details: [
                            ['Ngày trực', `${target.day}, ${AppData.formatDate(target.date)}`],
                            ['Khung giờ', target.time]
                        ]
                    });
                }
            });
        });
    }

    function updateSelectedCountLabel() {
        if (shiftSelectedCount) {
            shiftSelectedCount.textContent = `Đã chọn: ${selectedSlots.size} ca`;
        }
    }

    /* Bảng chọn đăng ký đa ca trực */
    function renderShiftPicker() {
        const shifts = AppData.loadShifts();
        const profile = getStaffProfile();
        const weekStartISO = filterWeek.value;
        const weekMonday = AppData.parseISODate(weekStartISO);
        const todayISO = AppData.toISODate(new Date());
        const now = new Date();

        if (shiftFormWeekLabel) {
            shiftFormWeekLabel.textContent = getSelectedWeekText();
        }

        const weekDates = AppData.DAY_NAMES.map((dayName, offset) => {
            const dObj = weekMonday ? AppData.addDays(weekMonday, offset) : null;
            const dISO = dObj ? AppData.toISODate(dObj) : '';
            const shortDate = dObj ? `${pad2(dObj.getDate())}/${pad2(dObj.getMonth() + 1)}` : '';
            return { dayName, dateISO: dISO, shortDate };
        });

        const headColsHtml = weekDates.map(d => `
            <th class="${d.dateISO === todayISO ? 'col-today' : ''}">
                <div>${d.dayName}</div>
                <div style="font-size: 0.78rem; font-weight: 400;">${d.shortDate}</div>
            </th>
        `).join('');

        const bodyRowsHtml = AppData.SHIFT_TYPES.map(shiftType => {
            const cellsHtml = weekDates.map(dayInfo => {
                const slotKey = `${dayInfo.dateISO}|${shiftType.key}`;
                const existing = shifts.find(s => s.date === dayInfo.dateISO && s.shiftKey === shiftType.key);
                const started = AppData.isShiftStarted(dayInfo.dateISO, shiftType.key, now);

                let cls = 'shift-slot ';
                let label = '';
                let disabledAttr = '';

                if (existing) {
                    cls += isMyShift(existing, profile) ? 'slot-mine' : 'slot-taken';
                    label = isMyShift(existing, profile) ? 'Ca của bạn' : `Đã có: ${existing.staff || 'Nhân viên'}`;
                    disabledAttr = 'disabled';
                    selectedSlots.delete(slotKey);
                } else if (started) {
                    cls += 'slot-past';
                    label = 'Đã qua';
                    disabledAttr = 'disabled';
                    selectedSlots.delete(slotKey);
                } else {
                    const isSelected = selectedSlots.has(slotKey);
                    cls += isSelected ? 'slot-selected' : 'slot-available';
                    label = isSelected ? '✓ Đã chọn' : '+ Chọn';
                }

                return `
                    <td>
                        <button type="button" class="${cls}" data-date="${AppUI.escapeHtml(dayInfo.dateISO)}" data-shift="${AppUI.escapeHtml(shiftType.key)}" ${disabledAttr}>${AppUI.escapeHtml(label)}</button>
                    </td>
                `;
            }).join('');

            return `
                <tr>
                    <td class="shift-picker-row-label">
                        <div>${AppUI.escapeHtml(shiftType.label)}</div>
                        <span class="shift-picker-row-time">${AppUI.escapeHtml(shiftType.start)} - ${AppUI.escapeHtml(shiftType.end)}</span>
                    </td>
                    ${cellsHtml}
                </tr>
            `;
        }).join('');

        shiftPickerTable.innerHTML = `
            <thead>
                <tr>
                    <th>Buổi / Thứ</th>
                    ${headColsHtml}
                </tr>
            </thead>
            <tbody>${bodyRowsHtml}</tbody>
        `;
        updateSelectedCountLabel();
    }

    if (shiftPickerTable) {
        shiftPickerTable.addEventListener('click', function(e) {
            const btn = e.target.closest('.shift-slot');
            if (!btn || btn.disabled) return;
            const dateISO = btn.getAttribute('data-date') || '';
            const shiftKey = btn.getAttribute('data-shift') || '';
            if (!dateISO || !shiftKey) return;

            const slotKey = `${dateISO}|${shiftKey}`;
            if (selectedSlots.has(slotKey)) {
                selectedSlots.delete(slotKey);
                btn.classList.remove('slot-selected');
                btn.classList.add('slot-available');
                btn.textContent = '+ Chọn';
            } else {
                selectedSlots.set(slotKey, { dateISO: dateISO, shiftKey: shiftKey });
                btn.classList.remove('slot-available');
                btn.classList.add('slot-selected');
                btn.textContent = '✓ Đã chọn';
            }
            updateSelectedCountLabel();
        });
    }

    populateYearFilter();
    populateWeeksForYear(filterYear.value);

    filterYear.addEventListener('change', function() {
        populateWeeksForYear(filterYear.value);
    });

    filterWeek.addEventListener('change', function() {
        selectedSlots.clear();
        renderTimetable();
        if (!shiftForm.classList.contains('hidden')) {
            renderShiftPicker();
        }
    });

    btnPrevWeek.addEventListener('click', function() {
        navigateWeekBy(-7);
    });

    btnNextWeek.addEventListener('click', function() {
        navigateWeekBy(7);
    });

    btnThisWeek.addEventListener('click', function() {
        const thisMonday = AppData.getMonday(new Date());
        const thisISO = AppData.toISODate(thisMonday);
        const currentYear = new Date().getFullYear();
        filterYear.value = String(currentYear);
        populateWeeksForYear(currentYear, thisISO);
    });

    btnAddShift.addEventListener('click', function() {
        const profile = getStaffProfile();
        if (!profile.name || !profile.name.trim()) {
            AppUI.warning({
                title: 'Chưa có thông tin nhân viên',
                message: 'Vui lòng cập nhật họ tên trong mục Thông Tin Nhân Viên trước khi đăng ký ca trực.'
            });
            return;
        }
        selectedSlots.clear();
        shiftForm.classList.remove('hidden');
        renderShiftPicker();
    });

    btnCancelShift.addEventListener('click', function() {
        selectedSlots.clear();
        shiftForm.classList.add('hidden');
    });

    btnClearShiftSelection.addEventListener('click', function() {
        selectedSlots.clear();
        renderShiftPicker();
    });

    btnConfirmShifts.addEventListener('click', function() {
        if (selectedSlots.size === 0) {
            AppUI.warning({
                title: 'Chưa chọn ca trực',
                message: 'Vui lòng chọn ít nhất một ô ca trống trong bảng để đăng ký.'
            });
            return;
        }

        const profile = getStaffProfile();
        const staffName = (profile.name || '').trim() || currentUser.fullname || currentUser.email;
        const staffPhone = (profile.phone || '').trim();
        const shifts = AppData.loadShifts();
        const now = new Date();

        const addedRecords = [];
        let skippedCount = 0;

        const shiftOrder = { sang: 1, chieu: 2, toi: 3 };
        const sortedSelections = Array.from(selectedSlots.values()).sort((a, b) => {
            if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO);
            return (shiftOrder[a.shiftKey] || 9) - (shiftOrder[b.shiftKey] || 9);
        });

        sortedSelections.forEach(slot => {
            const started = AppData.isShiftStarted(slot.dateISO, slot.shiftKey, now);
            const conflict = shifts.some(s => s.date === slot.dateISO && s.shiftKey === slot.shiftKey);
            if (started || conflict) {
                skippedCount++;
                return;
            }
            const record = AppData.createShiftRecord(slot.dateISO, slot.shiftKey, staffName, staffPhone, currentUser.email);
            if (record) {
                shifts.push(record);
                addedRecords.push(record);
            }
        });

        if (addedRecords.length === 0) {
            AppUI.error({
                title: 'Không thể đăng ký ca trực',
                message: 'Tất cả các ca đã chọn đều đã quá giờ hoặc vừa có nhân viên khác đăng ký.'
            });
            selectedSlots.clear();
            renderTimetable();
            renderShiftPicker();
            return;
        }

        if (!AppData.saveShifts(shifts)) {
            AppUI.error({
                title: 'Lỗi lưu dữ liệu',
                message: 'Không thể lưu lịch trực vào trình duyệt.'
            });
            return;
        }

        const weekText = getSelectedWeekText();
        selectedSlots.clear();
        shiftForm.classList.add('hidden');
        renderTimetable();

        let successMsg = `Bạn đã đăng ký ${addedRecords.length} ca trong ${weekText}.`;
        if (skippedCount > 0) {
            successMsg += ` (${skippedCount} ca đã qua giờ hoặc bị trùng nên được bỏ qua.)`;
        }

        AppUI.success({
            title: 'Đăng ký ca trực thành công!',
            message: successMsg,
            table: {
                headers: ['Thứ', 'Ngày', 'Ca'],
                rows: addedRecords.map(r => [r.day, AppData.formatDate(r.date), r.time])
            }
        });
    });


    /* Quản lý khách hàng & đơn hàng */
    const customerListContainer = document.getElementById('customer-list-container');
    const staffCustKpis = document.getElementById('staff-cust-kpis');
    const staffCustTabs = document.getElementById('staff-cust-tabs');
    const staffCustomerSearch = document.getElementById('staff-customer-search');
    const staffRequestTypeFilter = document.getElementById('staff-request-type-filter');
    const staffRequestStatusFilter = document.getElementById('staff-request-status-filter');

    let activeStaffCustTab = 'requests';

    function formatVnd(amount) {
        return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
    }

    function getRequestStatusFlags(item) {
        const isRecalled = Boolean(item && (item.status === 'recalled' || item.recalledBy));
        const isConfirmed = Boolean(item && !isRecalled && (item.status === 'confirmed' || item.confirmedBy));
        return { isRecalled: isRecalled, isConfirmed: isConfirmed, isPending: !isRecalled && !isConfirmed };
    }

    function getRequestStore(kind) {
        return kind === 'service'
            ? { load: AppData.loadServiceBookings, save: AppData.saveServiceBookings }
            : { load: AppData.loadProductOrders, save: AppData.saveProductOrders };
    }

    function updateRequestRecord(kind, realIdx, buildPatchFn, saveErrMessage) {
        const store = getRequestStore(kind);
        const latest = store.load();
        const target = latest[realIdx];
        if (!target) return null;
        const patch = buildPatchFn(target);
        if (!patch) return { aborted: true };
        latest[realIdx] = Object.assign({}, target, patch);
        if (!store.save(latest)) {
            AppUI.error({ title: 'Lỗi lưu dữ liệu', message: saveErrMessage });
            return null;
        }
        return latest[realIdx];
    }

    function getStaffConfirmerInfo() {
        const profile = getStaffProfile();
        return {
            name: (profile.name || '').trim() || currentUser.fullname || currentUser.email || 'Nhân viên',
            email: currentUser.email || '',
            phone: (profile.phone || '').trim()
        };
    }

    function loadCustomerManagementSnapshot() {
        const bookedServices = AppData.loadServiceBookings();

        const productOrders = AppData.loadProductOrders();
        const servicesCatalog = AppData.loadServices();
        const productsCatalog = AppData.loadProducts();
        const users = AppData.loadUsers();

        let legacyProfile = null;
        try {
            legacyProfile = JSON.parse(localStorage.getItem('khachHangProfile'));
        } catch (err) {
            legacyProfile = null;
        }

        const serviceById = new Map();
        const serviceByName = new Map();
        servicesCatalog.forEach(s => {
            if (!s) return;
            if (s.id) serviceById.set(s.id, s);
            if (s.name) serviceByName.set(s.name.trim().toLowerCase(), s);
        });

        const productById = new Map();
        productsCatalog.forEach(p => {
            if (p && p.id) productById.set(p.id, p);
        });

        const customersMap = new Map();
        const ensureCustomerBucket = (key, seed) => {
            if (!customersMap.has(key)) {
                customersMap.set(key, {
                    key: key,
                    email: seed.email || '',
                    name: seed.name || 'Khách hàng',
                    phone: seed.phone || 'Chưa cập nhật',
                    dob: seed.dob || 'Chưa cập nhật',
                    address: seed.address || 'Chưa cập nhật',
                    avatar: seed.avatar || '',
                    services: [],
                    orders: []
                });
            }
            return customersMap.get(key);
        };

        users.forEach(u => {
            if (!u || u.role !== 'khachhang') return;
            const key = (u.email || u.phone || u.fullname || '').trim().toLowerCase();
            if (!key) return;
            const matchesLegacy = legacyProfile && (!legacyProfile.email || legacyProfile.email.trim().toLowerCase() === key);
            ensureCustomerBucket(key, {
                email: u.email || '',
                name: u.fullname || (matchesLegacy ? legacyProfile.fullname : '') || u.email,
                phone: u.phone || (matchesLegacy ? legacyProfile.phone : '') || 'Chưa cập nhật',
                dob: u.dob || (matchesLegacy ? legacyProfile.dob : '') || 'Chưa cập nhật',
                address: u.address || (matchesLegacy ? legacyProfile.address : '') || 'Chưa cập nhật',
                avatar: u.avatar || (matchesLegacy ? legacyProfile.avatar : '') || ''
            });
        });

        const requests = [];

        bookedServices.forEach((bk, realIdx) => {
            if (!bk) return;
            const emailKey = (bk.customerEmail || '').trim().toLowerCase();
            const bucketKey = emailKey || (bk.customerPhone ? `phone:${bk.customerPhone.trim()}` : '__legacy__');
            const fallback = (bucketKey === '__legacy__' && legacyProfile) ? legacyProfile : {};
            const bucket = ensureCustomerBucket(bucketKey, {
                email: bk.customerEmail || fallback.email || '',
                name: bk.customerName || fallback.fullname || bk.customerEmail || 'Khách hàng',
                phone: bk.customerPhone || fallback.phone || 'Chưa cập nhật',
                dob: fallback.dob || 'Chưa cập nhật',
                address: fallback.address || 'Chưa cập nhật',
                avatar: fallback.avatar || ''
            });
            if (bucket.name === 'Khách hàng' && bk.customerName) bucket.name = bk.customerName;
            if (bucket.phone === 'Chưa cập nhật' && bk.customerPhone) bucket.phone = bk.customerPhone;
            bucket.services.push(Object.assign({}, bk, { _realIdx: realIdx }));

            const svcMeta = (bk.serviceId && serviceById.get(bk.serviceId)) ||
                (bk.name && serviceByName.get(bk.name.trim().toLowerCase())) || {};
            const flags = getRequestStatusFlags(bk);
            const ts = bk.bookedAt ? Date.parse(bk.bookedAt) : 0;

            requests.push({
                kind: 'service',
                realIdx: realIdx,
                code: bk.id || `DV-${realIdx + 1}`,
                title: bk.name || 'Dịch vụ chăm sóc',
                subInfo: [svcMeta.category, svcMeta.target, svcMeta.location, svcMeta.duration].filter(Boolean).join(' · ') || 'Dịch vụ Mẹ & Bé',
                price: Number(svcMeta.price || 0),
                dateLabel: bk.bookedAt ? new Date(bk.bookedAt).toLocaleString('vi-VN') : (bk.date || '—'),
                sortTs: isNaN(ts) ? 0 : ts,
                customerName: bucket.name,
                customerEmail: bucket.email,
                customerPhone: bk.customerPhone || bucket.phone,
                customerAddress: bucket.address,
                customerAvatar: bucket.avatar,
                isRecalled: flags.isRecalled,
                isConfirmed: flags.isConfirmed,
                confirmedBy: bk.confirmedBy || '',
                confirmedAt: bk.confirmedAt || '',
                recalledBy: bk.recalledBy || '',
                recalledAt: bk.recalledAt || '',
                recallMessage: bk.recallMessage || '',
                raw: bk,
                svcMeta: svcMeta
            });
        });

        productOrders.forEach((ord, realIdx) => {
            if (!ord) return;
            const emailKey = (ord.customerEmail || '').trim().toLowerCase();
            const bucketKey = emailKey || (ord.customerPhone ? `phone:${ord.customerPhone.trim()}` : '__legacy__');
            const fallback = (bucketKey === '__legacy__' && legacyProfile) ? legacyProfile : {};
            const bucket = ensureCustomerBucket(bucketKey, {
                email: ord.customerEmail || fallback.email || '',
                name: ord.customerName || fallback.fullname || ord.customerEmail || 'Khách hàng',
                phone: ord.customerPhone || fallback.phone || 'Chưa cập nhật',
                dob: fallback.dob || 'Chưa cập nhật',
                address: ord.customerAddress || fallback.address || 'Chưa cập nhật',
                avatar: fallback.avatar || ''
            });
            if (bucket.address === 'Chưa cập nhật' && ord.customerAddress) bucket.address = ord.customerAddress;
            if (bucket.phone === 'Chưa cập nhật' && ord.customerPhone) bucket.phone = ord.customerPhone;
            bucket.orders.push(Object.assign({}, ord, { _realIdx: realIdx }));

            const items = Array.isArray(ord.items) ? ord.items.map(it => {
                const matchedProd = it.id ? productById.get(it.id) : null;
                return Object.assign({}, it, {
                    code: AppData.formatProductCode(it.code || (matchedProd && matchedProd.code) || it.id || '')
                });
            }) : [];
            const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 1), 0);
            const flags = getRequestStatusFlags(ord);
            const ts = ord.orderedAt ? Date.parse(ord.orderedAt) : 0;

            requests.push({
                kind: 'order',
                realIdx: realIdx,
                code: ord.code || `DH-${realIdx + 1}`,
                title: `Đơn hàng ${ord.code || ''} (${totalQty} sản phẩm)`,
                items: items,
                price: Number(ord.totalAmount || 0),
                dateLabel: ord.orderedAt ? new Date(ord.orderedAt).toLocaleString('vi-VN') : (ord.date || '—'),
                sortTs: isNaN(ts) ? 0 : ts,
                customerName: ord.customerName || bucket.name,
                customerEmail: ord.customerEmail || bucket.email,
                customerPhone: ord.customerPhone || bucket.phone,
                customerAddress: ord.customerAddress || bucket.address,
                customerAvatar: bucket.avatar,
                isRecalled: flags.isRecalled,
                isConfirmed: flags.isConfirmed,
                confirmedBy: ord.confirmedBy || '',
                confirmedAt: ord.confirmedAt || '',
                recalledBy: ord.recalledBy || '',
                recalledAt: ord.recalledAt || '',
                recallMessage: ord.recallMessage || '',
                raw: ord
            });
        });

        if (customersMap.size === 0 && legacyProfile && (legacyProfile.fullname || legacyProfile.phone || legacyProfile.address)) {
            ensureCustomerBucket('__legacy__', {
                email: legacyProfile.email || '',
                name: legacyProfile.fullname || 'Khách hàng',
                phone: legacyProfile.phone || 'Chưa cập nhật',
                dob: legacyProfile.dob || 'Chưa cập nhật',
                address: legacyProfile.address || 'Chưa cập nhật',
                avatar: legacyProfile.avatar || ''
            });
        }

        const statusRank = r => (r.isRecalled ? 2 : (r.isConfirmed ? 1 : 0));
        requests.sort((a, b) => {
            const ra = statusRank(a);
            const rb = statusRank(b);
            if (ra !== rb) return ra - rb;
            return b.sortTs - a.sortTs;
        });

        const countPending = list => list.filter(x => getRequestStatusFlags(x).isPending).length;
        const customers = Array.from(customersMap.values()).sort((a, b) => {
            const aPending = countPending(a.services) + countPending(a.orders);
            const bPending = countPending(b.services) + countPending(b.orders);
            if (bPending !== aPending) return bPending - aPending;
            return (b.services.length + b.orders.length) - (a.services.length + a.orders.length);
        });

        return { requests: requests, customers: customers };
    }

    function confirmCustomerRequest(kind, realIdx) {
        const isService = kind === 'service';
        const store = getRequestStore(kind);
        const list = store.load();
        const item = list[realIdx];
        if (!item) return;

        if (getRequestStatusFlags(item).isConfirmed) {
            renderCustomerList();
            AppUI.warning({
                title: isService ? 'Dịch vụ đã được xác nhận' : 'Đơn hàng đã được xác nhận',
                message: `${isService ? 'Dịch vụ' : 'Đơn hàng'} này đã được "${item.confirmedBy || 'Nhân viên'}" xác nhận trước đó.`
            });
            return;
        }

        const staffInfo = getStaffConfirmerInfo();
        const nowIso = new Date().toISOString();
        const titleLabel = isService
            ? `dịch vụ "${item.name || 'Dịch vụ'}"`
            : `đơn hàng ${item.code || ''} (${formatVnd(item.totalAmount)})`;

        AppUI.confirm({
            title: isService ? 'Xác nhận đăng ký dịch vụ' : `Xác nhận đơn hàng ${item.code || ''}`,
            message: `Xác nhận ${isService ? 'tiếp nhận ' : ''}${titleLabel} của khách hàng "${item.customerName || item.customerEmail || 'Khách hàng'}"? Sau khi xác nhận, khách hàng sẽ thấy tên bạn và không thể tự hủy.`,
            confirmText: isService ? 'Xác nhận ngay' : 'Xác nhận đơn hàng',
            cancelText: 'Hủy',
            onConfirm: function() {
                const updated = updateRequestRecord(kind, realIdx, function(target) {
                    if (getRequestStatusFlags(target).isConfirmed) return null;
                    return {
                        status: 'confirmed',
                        confirmedBy: staffInfo.name,
                        confirmedByEmail: staffInfo.email,
                        confirmedByPhone: staffInfo.phone,
                        confirmedAt: nowIso
                    };
                }, 'Không thể cập nhật trạng thái vào cơ sở dữ liệu.');

                renderCustomerList();
                if (!updated || updated.aborted) return;

                AppUI.success({
                    title: isService ? 'Đã xác nhận dịch vụ!' : 'Đã xác nhận đơn hàng!',
                    message: 'Trạng thái đã xác nhận và tên nhân viên xử lý đã đồng bộ sang trang Khách Hàng.',
                    details: isService
                        ? [
                            ['Dịch vụ', updated.name || 'Dịch vụ'],
                            ['Khách hàng', updated.customerName || updated.customerEmail || 'Chưa cập nhật'],
                            ['Nhân viên xác nhận', staffInfo.name],
                            ['Thời gian xác nhận', new Date(nowIso).toLocaleString('vi-VN')]
                        ]
                        : [
                            ['Mã đơn hàng', updated.code || '—'],
                            ['Khách hàng', `${updated.customerName || 'Khách hàng'} (${updated.customerPhone || 'Chưa có SĐT'})`],
                            ['Tổng thanh toán', formatVnd(updated.totalAmount)],
                            ['Nhân viên xác nhận', staffInfo.name],
                            ['Thời gian xác nhận', new Date(nowIso).toLocaleString('vi-VN')]
                        ]
                });
            }
        });
    }

    function openRecallModal(req) {
        const modal = document.getElementById('recall-modal');
        const titleEl = document.getElementById('recall-modal-title');
        const summaryEl = document.getElementById('recall-modal-summary');
        const msgInput = document.getElementById('recall-message-input');
        if (!modal || !req) return;

        document.getElementById('recall-kind').value = req.kind;
        document.getElementById('recall-real-index').value = String(req.realIdx);
        if (titleEl) {
            titleEl.textContent = req.kind === 'service' ? 'Thu Hồi Dịch Vụ Đã Xác Nhận' : 'Thu Hồi Đơn Hàng Đã Xác Nhận';
        }
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div><strong>${req.kind === 'service' ? 'Dịch vụ' : 'Đơn hàng'}:</strong> ${AppUI.escapeHtml(req.title)} (${AppUI.escapeHtml(req.code)})</div>
                <div><strong>Khách hàng:</strong> ${AppUI.escapeHtml(req.customerName)} · <strong>SĐT:</strong> ${AppUI.escapeHtml(req.customerPhone)}</div>
                ${req.confirmedBy ? `<div><strong>Đã xác nhận trước đó bởi:</strong> ${AppUI.escapeHtml(req.confirmedBy)}</div>` : ''}
            `;
        }
        if (msgInput) msgInput.value = '';
        modal.classList.remove('hidden');
        if (msgInput) msgInput.focus();
    }

    function openRequestDetail(req) {
        if (!req) return;
        const confirmedTime = req.confirmedAt ? new Date(req.confirmedAt).toLocaleString('vi-VN') : '';
        const recalledTime = req.recalledAt ? new Date(req.recalledAt).toLocaleString('vi-VN') : '';
        const statusText = req.isRecalled
            ? `Đã thu hồi bởi ${req.recalledBy}`
            : (req.isConfirmed ? `Đã xác nhận bởi ${req.confirmedBy}` : 'Chờ nhân viên xác nhận');

        if (req.kind === 'service') {
            const benefits = Array.isArray(req.svcMeta && req.svcMeta.benefits) ? req.svcMeta.benefits : [];
            const details = [
                ['Mã đăng ký', req.code],
                ['Trạng thái', statusText],
                ['Thời gian đặt', req.dateLabel],
                ['Giá gói', req.price > 0 ? formatVnd(req.price) : 'Liên hệ tư vấn'],
                ['SĐT khách hàng', req.customerPhone],
                ['Tài khoản', req.customerEmail || 'Hồ sơ cục bộ'],
                ['Địa chỉ', req.customerAddress]
            ];
            if (req.isConfirmed && confirmedTime) {
                details.splice(2, 0, ['Thời gian xác nhận', confirmedTime]);
            }
            if (req.isRecalled) {
                details.splice(2, 0, ['Lời nhắn thu hồi', req.recallMessage || 'Không có lời nhắn']);
                if (recalledTime) details.splice(2, 0, ['Thời gian thu hồi', recalledTime]);
            }
            AppUI.profile({
                avatar: req.customerAvatar,
                name: `${req.title} — ${req.customerName}`,
                subtitle: req.subInfo,
                details: details,
                sections: [
                    {
                        heading: `Quyền lợi gói dịch vụ (${benefits.length})`,
                        table: benefits.length > 0 ? {
                            headers: ['STT', 'Nội dung quyền lợi'],
                            rows: benefits.map((b, i) => [String(i + 1), b])
                        } : null,
                        emptyText: 'Không có ghi chú quyền lợi bổ sung.'
                    }
                ]
            });
            return;
        }

        const details = [
            ['Mã đơn hàng', req.code],
            ['Trạng thái', statusText],
            ['Thời gian đặt', req.dateLabel],
            ['Khách hàng', `${req.customerName} (${req.customerPhone})`],
            ['Địa chỉ giao hàng', req.customerAddress],
            ['Tổng thanh toán', formatVnd(req.price)]
        ];
        if (req.isConfirmed && confirmedTime) {
            details.splice(2, 0, ['Thời gian xác nhận', confirmedTime]);
        }
        if (req.isRecalled) {
            details.splice(2, 0, ['Lời nhắn thu hồi', req.recallMessage || 'Không có lời nhắn']);
            if (recalledTime) details.splice(2, 0, ['Thời gian thu hồi', recalledTime]);
        }

        AppUI.success({
            title: `Chi tiết đơn hàng ${req.code}`,
            message: 'Chi tiết đầy đủ sản phẩm và thông tin giao hàng của khách:',
            details: details,
            table: {
                headers: ['Mã SP', 'Sản phẩm', 'Đơn giá', 'SL', 'Thành tiền'],
                rows: (req.items || []).map(it => [
                    it.code || '—',
                    it.name || '',
                    formatVnd(it.price),
                    String(it.qty || 1),
                    formatVnd((it.price || 0) * (it.qty || 1))
                ])
            }
        });
    }

    function openCustomerDetail(cust) {
        if (!cust) return;
        const orderTotal = cust.orders
            .filter(o => !getRequestStatusFlags(o).isRecalled)
            .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
        const getRecStatusLabel = r => {
            const f = getRequestStatusFlags(r);
            return f.isRecalled ? 'Đã thu hồi' : (f.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận');
        };
        const getRecStaffLabel = r => (getRequestStatusFlags(r).isRecalled ? `Thu hồi: ${r.recalledBy || '—'}` : (r.confirmedBy || '—'));

        AppUI.profile({
            avatar: cust.avatar,
            name: cust.name,
            subtitle: cust.email ? `Tài khoản: ${cust.email}` : 'Khách hàng hệ thống',
            details: [
                ['Tài khoản / Email', cust.email || 'Chưa cập nhật'],
                ['Số điện thoại', cust.phone],
                ['Ngày sinh', cust.dob],
                ['Địa chỉ', cust.address],
                ['Tổng chi tiêu đơn SP', orderTotal > 0 ? formatVnd(orderTotal) : '0đ']
            ],
            sections: [
                {
                    heading: `Dịch vụ đã đăng ký (${cust.services.length})`,
                    table: cust.services.length > 0 ? {
                        headers: ['Mã', 'Dịch vụ', 'Ngày đặt', 'Trạng thái', 'Nhân viên xử lý'],
                        rows: cust.services.map(s => [
                            s.id || '—',
                            s.name || '',
                            s.date || '',
                            getRecStatusLabel(s),
                            getRecStaffLabel(s)
                        ])
                    } : null,
                    emptyText: 'Khách hàng chưa đặt dịch vụ nào.'
                },
                {
                    heading: `Đơn hàng sản phẩm (${cust.orders.length})`,
                    table: cust.orders.length > 0 ? {
                        headers: ['Mã đơn', 'Sản phẩm', 'Tổng tiền', 'Trạng thái', 'Nhân viên xử lý'],
                        rows: cust.orders.map(o => [
                            o.code || '—',
                            Array.isArray(o.items) ? o.items.map(it => `${it.code ? `[${it.code}] ` : ''}${it.name} (×${it.qty || 1})`).join(', ') : '',
                            formatVnd(o.totalAmount),
                            getRecStatusLabel(o),
                            getRecStaffLabel(o)
                        ])
                    } : null,
                    emptyText: 'Khách hàng chưa đặt đơn hàng sản phẩm nào.'
                }
            ]
        });
    }

    let currentRenderedRequests = [];
    let currentFilteredCustomers = [];

    /* Kích hoạt tab quản lý khách hàng */
    function setActiveCustomerTab(tabName) {
        activeStaffCustTab = tabName || 'requests';
        if (staffCustTabs) {
            staffCustTabs.querySelectorAll('.staff-cust-tab').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-tab') === activeStaffCustTab);
            });
        }
    }

    /* Render KPI, danh sách yêu cầu và hồ sơ khách hàng theo batch */
    function renderCustomerList() {
        const snapshot = loadCustomerManagementSnapshot();
        const pendingCount = snapshot.requests.filter(r => !r.isConfirmed && !r.isRecalled).length;
        const confirmedCount = snapshot.requests.filter(r => r.isConfirmed).length;
        const recalledCount = snapshot.requests.filter(r => r.isRecalled).length;
        const ordersRevenue = snapshot.requests
            .filter(r => r.kind === 'order' && !r.isRecalled)
            .reduce((s, r) => s + r.price, 0);

        updateBadge('hero-pending-count', `${pendingCount} yêu cầu`);
        updateBadge('hero-confirmed-count', `${confirmedCount} yêu cầu`);
        updateBadge('hero-customers-count', `${snapshot.customers.length} khách`);
        updateBadge('side-req-pending-count', pendingCount);
        updateBadge('side-req-confirmed-count', confirmedCount);
        updateBadge('side-req-recalled-count', recalledCount);
        updateBadge('side-customers-count', snapshot.customers.length);

        const pendingBadge = document.getElementById('side-pending-badge');
        if (pendingBadge) {
            pendingBadge.textContent = String(pendingCount);
            pendingBadge.classList.toggle('hidden', pendingCount <= 0);
        }

        if (staffCustKpis) {
            const kpiItems = [
                ['Khách hàng', snapshot.customers.length, '#ff4d8d', 'var(--text-main)'],
                ['Chờ xác nhận', pendingCount, '#d97706', '#d97706'],
                ['Đã xác nhận', confirmedCount, '#10b981', '#059669'],
                ['Đã thu hồi', recalledCount, '#ef4444', '#dc2626'],
                ['Giá trị đơn SP', formatVnd(ordersRevenue), '#0284c7', 'var(--primary)']
            ];
            staffCustKpis.innerHTML = kpiItems.map(([label, val, dotColor, valColor]) => `
                <div class="staff-cust-kpi">
                    <div class="kpi-top">
                        <div class="staff-cust-kpi-label">${label}</div>
                        <span class="kpi-dot" style="background: ${dotColor};"></span>
                    </div>
                    <div class="staff-cust-kpi-val" style="color: ${valColor};">${val}</div>
                </div>
            `).join('');
        }

        if (staffRequestTypeFilter) {
            staffRequestTypeFilter.classList.toggle('hidden', activeStaffCustTab !== 'requests');
        }
        if (staffRequestStatusFilter) {
            staffRequestStatusFilter.classList.toggle('hidden', activeStaffCustTab !== 'requests');
        }

        const query = (staffCustomerSearch ? staffCustomerSearch.value : '').trim().toLowerCase();

        if (activeStaffCustTab === 'requests') {
            const typeVal = staffRequestTypeFilter ? staffRequestTypeFilter.value : 'all';
            const statusVal = staffRequestStatusFilter ? staffRequestStatusFilter.value : 'all';

            const filteredReqs = snapshot.requests.filter(req => {
                if (typeVal !== 'all' && req.kind !== typeVal) return false;
                if (statusVal === 'pending' && (req.isConfirmed || req.isRecalled)) return false;
                if (statusVal === 'confirmed' && !req.isConfirmed) return false;
                if (statusVal === 'recalled' && !req.isRecalled) return false;
                if (query) {
                    const itemNames = Array.isArray(req.items)
                        ? req.items.map(it => `${it.code || ''} ${it.name || ''}`).join(' ')
                        : '';
                    const hay = `${req.code} ${req.title} ${req.customerName} ${req.customerPhone} ${req.customerEmail} ${req.customerAddress} ${req.confirmedBy} ${req.recalledBy} ${req.recallMessage} ${itemNames}`.toLowerCase();
                    if (hay.indexOf(query) === -1) return false;
                }
                return true;
            });

            currentRenderedRequests = filteredReqs;
            const isReqFiltered = Boolean(query || typeVal !== 'all' || statusVal !== 'all');
            updateBadge('req-count-pill', isReqFiltered ? `${filteredReqs.length}/${snapshot.requests.length} yêu cầu` : `${snapshot.requests.length} yêu cầu`);

            if (filteredReqs.length === 0) {
                customerListContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; padding: 12px 0;">${snapshot.requests.length === 0 ? 'Hiện chưa có đơn hàng hoặc đăng ký dịch vụ nào từ khách hàng.' : 'Không có bản ghi nào khớp với bộ lọc hiện tại.'}</p>`;
                return;
            }

            customerListContainer.innerHTML = `<div class="staff-req-list">${filteredReqs.map((req, idx) => {
                const cardStateClass = req.isRecalled ? ' is-recalled' : (req.isConfirmed ? ' is-confirmed' : '');
                const kindLabel = req.kind === 'service' ? 'Đăng ký dịch vụ' : 'Đơn hàng sản phẩm';
                const kindClass = req.kind === 'service' ? 'kind-service' : 'kind-order';
                const statusBadge = req.isRecalled
                    ? `<span class="staff-req-status recalled">! Đã thu hồi bởi ${AppUI.escapeHtml(req.recalledBy)}</span>`
                    : (req.isConfirmed
                        ? `<span class="staff-req-status confirmed">✓ Đã xác nhận bởi ${AppUI.escapeHtml(req.confirmedBy)}</span>`
                        : `<span class="staff-req-status pending">Chờ xác nhận</span>`);

                const recalledAtText = req.recalledAt ? new Date(req.recalledAt).toLocaleString('vi-VN') : '';
                const recallNoteBlock = req.isRecalled
                    ? `<div class="staff-recalled-note"><strong>Đã thu hồi bởi ${AppUI.escapeHtml(req.recalledBy)}</strong>${recalledAtText ? ` (${AppUI.escapeHtml(recalledAtText)})` : ''} · <strong>Lời nhắn gửi khách:</strong> "${AppUI.escapeHtml(req.recallMessage || 'Không có lời nhắn')}"</div>`
                    : '';

                const contentHtml = req.kind === 'service'
                    ? `
                        <div class="staff-req-content-box">
                            <div style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">${AppUI.escapeHtml(req.title)}</div>
                            <div style="color: var(--text-muted); font-size: 0.82rem;">${AppUI.escapeHtml(req.subInfo)}</div>
                        </div>
                    `
                    : `
                        <div class="staff-req-content-box">
                            <div style="font-weight: 700; color: var(--text-main);">${AppUI.escapeHtml(req.title)}</div>
                            <div class="staff-req-item-list">
                                ${(req.items || []).map(it => `
                                    <div class="staff-req-item-row">
                                        <span>${it.code ? `<strong>[${AppUI.escapeHtml(it.code)}]</strong> ` : ''}${AppUI.escapeHtml(it.name)} × ${it.qty || 1}</span>
                                        <span style="font-weight: 600;">${formatVnd((it.price || 0) * (it.qty || 1))}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;

                const confirmedAtText = req.confirmedAt ? new Date(req.confirmedAt).toLocaleString('vi-VN') : '';
                let rightActionHtml = '';
                if (req.isRecalled) {
                    rightActionHtml = `<span class="staff-req-status recalled">Đã thu hồi</span>`;
                } else if (req.isConfirmed) {
                    rightActionHtml = `
                        <span class="staff-confirmed-tag">✓ Đã xác nhận bởi: ${AppUI.escapeHtml(req.confirmedBy)}${confirmedAtText ? ` (${AppUI.escapeHtml(confirmedAtText)})` : ''}</span>
                        <button type="button" class="btn-recall-req" data-req-idx="${idx}">Thu hồi</button>
                    `;
                } else {
                    rightActionHtml = `<button type="button" class="btn-confirm-req" data-req-idx="${idx}">${req.kind === 'service' ? 'Xác nhận dịch vụ' : 'Xác nhận đơn hàng'}</button>`;
                }

                const priceText = req.kind === 'service'
                    ? (req.price > 0 ? `Giá gói: ${formatVnd(req.price)}` : 'Liên hệ tư vấn')
                    : `Tổng tiền: ${formatVnd(req.price)}`;

                return `
                    <div class="staff-req-card${cardStateClass}">
                        <div class="staff-req-top">
                            <div class="staff-req-badges">
                                <span class="staff-req-kind ${kindClass}">${kindLabel}</span>
                                <span class="staff-req-code">${AppUI.escapeHtml(req.code)}</span>
                                <span class="staff-req-time">· ${AppUI.escapeHtml(req.dateLabel)}</span>
                            </div>
                            ${statusBadge}
                        </div>
                        ${recallNoteBlock}
                        <div class="staff-req-body">
                            <div class="staff-req-customer-box">
                                ${AppUI.avatarHtml(req.customerAvatar, req.customerName, 38)}
                                <div class="staff-req-customer-meta">
                                    <div class="staff-req-customer-name">${AppUI.escapeHtml(req.customerName)}</div>
                                    <div><strong>SĐT:</strong> ${AppUI.escapeHtml(req.customerPhone)}</div>
                                    <div><strong>Tài khoản:</strong> ${AppUI.escapeHtml(req.customerEmail || 'Khách hàng')}</div>
                                    <div><strong>Địa chỉ:</strong> ${AppUI.escapeHtml(req.customerAddress)}</div>
                                </div>
                            </div>
                            ${contentHtml}
                        </div>
                        <div class="staff-req-footer">
                            <span class="staff-req-amount">${priceText}</span>
                            <div class="staff-req-actions">
                                <button type="button" class="btn-secondary btn-view-req" data-req-idx="${idx}" style="padding: 6px 12px; font-size: 0.84rem;">Xem chi tiết</button>
                                ${rightActionHtml}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}</div>`;
            return;
        }

        const filteredCustomers = snapshot.customers.filter(cust => {
            if (!query) return true;
            const svcText = cust.services.map(s => s.name || '').join(' ');
            const ordText = cust.orders.map(o => `${o.code || ''} ${Array.isArray(o.items) ? o.items.map(it => it.name).join(' ') : ''}`).join(' ');
            const hay = `${cust.name} ${cust.email} ${cust.phone} ${cust.dob} ${cust.address} ${svcText} ${ordText}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        currentFilteredCustomers = filteredCustomers;
        updateBadge('req-count-pill', query ? `${filteredCustomers.length}/${snapshot.customers.length} khách hàng` : `${snapshot.customers.length} khách hàng`);

        if (filteredCustomers.length === 0) {
            customerListContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; padding: 12px 0;">${snapshot.customers.length === 0 ? 'Chưa có dữ liệu khách hàng trong hệ thống.' : 'Không tìm thấy khách hàng phù hợp.'}</p>`;
            return;
        }

        customerListContainer.innerHTML = `
            <div class="table-scroll-wrap">
                <table class="staff-data-table">
                    <thead>
                        <tr>
                            <th>Khách hàng</th>
                            <th>Liên hệ &amp; Địa chỉ</th>
                            <th>Dịch vụ đã đặt</th>
                            <th>Đơn hàng SP</th>
                            <th style="text-align: center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredCustomers.map((cust, idx) => {
                            const svcConfirmed = cust.services.filter(s => getRequestStatusFlags(s).isConfirmed).length;
                            const ordConfirmed = cust.orders.filter(o => getRequestStatusFlags(o).isConfirmed).length;
                            const ordTotal = cust.orders.filter(o => !getRequestStatusFlags(o).isRecalled).reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
                            return `
                                <tr>
                                    <td>
                                        <div class="customer-name-cell">
                                            ${AppUI.avatarHtml(cust.avatar, cust.name, 34)}
                                            <div>
                                                <div style="font-weight: 700; color: var(--primary);">${AppUI.escapeHtml(cust.name)}</div>
                                                <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml(cust.email || 'Hồ sơ cục bộ')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="font-size: 0.85rem;">
                                        <div><strong>SĐT:</strong> ${AppUI.escapeHtml(cust.phone)}</div>
                                        <div><strong>Ngày sinh:</strong> ${AppUI.escapeHtml(cust.dob)}</div>
                                        <div style="color: var(--text-muted);"><strong>ĐC:</strong> ${AppUI.escapeHtml(cust.address)}</div>
                                    </td>
                                    <td style="font-size: 0.85rem;">
                                        <div><strong>${cust.services.length}</strong> gói dịch vụ</div>
                                        <div style="color: #059669; font-size: 0.78rem;">Đã xác nhận: ${svcConfirmed}/${cust.services.length}</div>
                                    </td>
                                    <td style="font-size: 0.85rem;">
                                        <div><strong>${cust.orders.length}</strong> đơn (${formatVnd(ordTotal)})</div>
                                        <div style="color: #059669; font-size: 0.78rem;">Đã xác nhận: ${ordConfirmed}/${cust.orders.length}</div>
                                    </td>
                                    <td style="text-align: center; white-space: nowrap;">
                                        <button type="button" class="btn-view-customer btn-primary" data-cust-idx="${idx}" style="padding: 5px 12px; font-size: 0.82rem;">Xem chi tiết</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* Event delegation xử lý yêu cầu và hồ sơ khách hàng */
    if (customerListContainer) {
        customerListContainer.addEventListener('click', function(e) {
            const viewReqBtn = e.target.closest('.btn-view-req');
            if (viewReqBtn) {
                const req = currentRenderedRequests[parseInt(viewReqBtn.getAttribute('data-req-idx'), 10)];
                if (req) openRequestDetail(req);
                return;
            }
            const confirmBtn = e.target.closest('.btn-confirm-req');
            if (confirmBtn) {
                const req = currentRenderedRequests[parseInt(confirmBtn.getAttribute('data-req-idx'), 10)];
                if (req) confirmCustomerRequest(req.kind, req.realIdx);
                return;
            }
            const recallBtn = e.target.closest('.btn-recall-req');
            if (recallBtn) {
                const req = currentRenderedRequests[parseInt(recallBtn.getAttribute('data-req-idx'), 10)];
                if (req) openRecallModal(req);
                return;
            }
            const viewCustBtn = e.target.closest('.btn-view-customer');
            if (viewCustBtn) {
                const cust = currentFilteredCustomers[parseInt(viewCustBtn.getAttribute('data-cust-idx'), 10)];
                if (cust) openCustomerDetail(cust);
            }
        });
    }

    if (staffCustTabs) {
        staffCustTabs.querySelectorAll('.staff-cust-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', function() {
                setActiveCustomerTab(tabBtn.getAttribute('data-tab') || 'requests');
                renderCustomerList();
            });
        });
    }

    const staffGlobalSearch = document.getElementById('staff-global-search');
    const staffGlobalSearchForm = document.getElementById('staff-global-search-form');
    const debouncedRenderCustomerList = debounceStaff(renderCustomerList, 120);

    if (staffCustomerSearch) {
        staffCustomerSearch.addEventListener('input', function() {
            if (staffGlobalSearch) staffGlobalSearch.value = staffCustomerSearch.value;
            debouncedRenderCustomerList();
        });
    }
    if (staffGlobalSearch) {
        staffGlobalSearch.addEventListener('input', debounceStaff(function() {
            if (staffCustomerSearch) staffCustomerSearch.value = staffGlobalSearch.value;
            renderCustomerList();
        }, 140));
    }
    if (staffGlobalSearchForm) {
        staffGlobalSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (staffCustomerSearch && staffGlobalSearch) {
                staffCustomerSearch.value = staffGlobalSearch.value;
            }
            renderCustomerList();
            scrollToStaffSection('quan-ly-khach-hang');
        });
    }
    if (staffRequestTypeFilter) {
        staffRequestTypeFilter.addEventListener('change', renderCustomerList);
    }
    if (staffRequestStatusFilter) {
        staffRequestStatusFilter.addEventListener('change', renderCustomerList);
    }

    /* Điều hướng sidebar, nút Hero và làm mới CSDL */
    document.querySelectorAll('.staff-sidebar [data-scroll-target]').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = btn.getAttribute('data-scroll-target');
            if (targetId) scrollToStaffSection(targetId);
        });
    });

    function openPendingRequestsFilter(statusVal) {
        setActiveCustomerTab('requests');
        if (staffRequestStatusFilter) {
            staffRequestStatusFilter.value = statusVal || 'pending';
        }
        renderCustomerList();
        scrollToStaffSection('quan-ly-khach-hang');
    }

    document.querySelectorAll('[data-filter-req]').forEach(btn => {
        btn.addEventListener('click', function() {
            openPendingRequestsFilter(btn.getAttribute('data-filter-req') || 'all');
        });
    });

    document.querySelectorAll('[data-open-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveCustomerTab(btn.getAttribute('data-open-tab') || 'profiles');
            renderCustomerList();
            scrollToStaffSection('quan-ly-khach-hang');
        });
    });

    const btnHeaderRefresh = document.getElementById('btn-header-refresh');
    if (btnHeaderRefresh) {
        btnHeaderRefresh.addEventListener('click', function() {
            if (typeof AppData.refreshFromDatabase === 'function') {
                AppData.refreshFromDatabase();
            }
            updateStaffDatabasePill();
            loadStaffProfile();
            renderTimetable();
            if (!shiftForm.classList.contains('hidden')) {
                renderShiftPicker();
            }
            renderCustomerList();
        });
    }

    const btnHeroPendingReqs = document.getElementById('btn-hero-pending-reqs');
    if (btnHeroPendingReqs) {
        btnHeroPendingReqs.addEventListener('click', function() {
            openPendingRequestsFilter('pending');
        });
    }

    [document.getElementById('btn-hero-add-shift'), document.getElementById('btn-side-add-shift')].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', function() {
            scrollToStaffSection('ca-truc');
            if (btnAddShift) btnAddShift.click();
        });
    });

    const btnSideThisWeek = document.getElementById('btn-side-this-week');
    if (btnSideThisWeek) {
        btnSideThisWeek.addEventListener('click', function() {
            scrollToStaffSection('ca-truc');
            if (btnThisWeek) btnThisWeek.click();
        });
    }

    const btnHeroEditProfile = document.getElementById('btn-hero-edit-profile');
    if (btnHeroEditProfile) {
        btnHeroEditProfile.addEventListener('click', function() {
            scrollToStaffSection('thong-tin');
            if (staffForm && staffForm.classList.contains('hidden') && btnEditStaff) {
                btnEditStaff.click();
            }
        });
    }

    const recallModal = document.getElementById('recall-modal');
    const recallModalForm = document.getElementById('recall-modal-form');
    const btnCloseRecallModal = document.getElementById('btn-close-recall-modal');
    const recallMsgInput = document.getElementById('recall-message-input');

    document.querySelectorAll('.recall-preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!recallMsgInput) return;
            recallMsgInput.value = btn.getAttribute('data-text') || '';
            recallMsgInput.focus();
        });
    });

    if (btnCloseRecallModal && recallModal) {
        btnCloseRecallModal.addEventListener('click', function() {
            recallModal.classList.add('hidden');
        });
    }
    if (recallModal) {
        recallModal.addEventListener('click', function(e) {
            if (e.target === recallModal) {
                recallModal.classList.add('hidden');
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        if (document.querySelector('.app-modal-overlay')) return;
        if (recallModal && !recallModal.classList.contains('hidden')) {
            recallModal.classList.add('hidden');
            return;
        }
        if (shiftForm && !shiftForm.classList.contains('hidden')) {
            selectedSlots.clear();
            shiftForm.classList.add('hidden');
        }
    });

    if (recallModalForm) {
        recallModalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const kind = document.getElementById('recall-kind').value;
            const realIdx = parseInt(document.getElementById('recall-real-index').value, 10);
            const recallMessage = (recallMsgInput ? recallMsgInput.value : '').trim();
            if (!recallMessage) return;

            const isService = kind === 'service';
            const staffInfo = getStaffConfirmerInfo();
            const nowIso = new Date().toISOString();

            const updated = updateRequestRecord(kind, realIdx, function() {
                return {
                    status: 'recalled',
                    recalledBy: staffInfo.name,
                    recalledByEmail: staffInfo.email,
                    recalledByPhone: staffInfo.phone,
                    recalledAt: nowIso,
                    recallMessage: recallMessage,
                    recallSeenByCustomer: false
                };
            }, `Không thể lưu thông tin thu hồi ${isService ? 'dịch vụ' : 'đơn hàng'} vào cơ sở dữ liệu.`);

            if (!updated || updated.aborted) return;

            if (recallModal) recallModal.classList.add('hidden');
            renderCustomerList();

            AppUI.success({
                title: isService ? 'Đã thu hồi dịch vụ thành công!' : 'Đã thu hồi đơn hàng thành công!',
                message: 'Thông báo thu hồi kèm lời nhắn của bạn sẽ hiển thị ngay khi khách hàng mở trang.',
                details: isService
                    ? [
                        ['Dịch vụ', updated.name || 'Dịch vụ'],
                        ['Khách hàng', updated.customerName || updated.customerEmail || 'Khách hàng'],
                        ['Nhân viên thu hồi', staffInfo.name],
                        ['Lời nhắn gửi khách', recallMessage]
                    ]
                    : [
                        ['Mã đơn hàng', updated.code || '—'],
                        ['Khách hàng', `${updated.customerName || 'Khách hàng'} (${updated.customerPhone || 'Chưa có SĐT'})`],
                        ['Nhân viên thu hồi', staffInfo.name],
                        ['Lời nhắn gửi khách', recallMessage]
                    ]
            });
        });
    }

    renderCustomerList();

    window.addEventListener('storage', function(e) {
        updateStaffDatabasePill();
        if (
            e.key === 'myServices' ||
            e.key === AppData.PRODUCT_ORDERS_KEY ||
            e.key === 'users' ||
            e.key === 'khachHangProfile' ||
            e.key === AppData.SERVICES_KEY ||
            e.key === AppData.PRODUCTS_KEY
        ) {
            renderCustomerList();
        }
        if (e.key === AppData.SHIFTS_KEY || e.key === 'facilityStaffList') {
            loadStaffProfile();
            renderTimetable();
            if (!shiftForm.classList.contains('hidden')) {
                renderShiftPicker();
            }
        }
    });
});
