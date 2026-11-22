document.addEventListener('DOMContentLoaded', function() {
    const currentUser = AppData.requireRole('nhanvien', '../html-dangki-dangnhap/login.html');
    if (!currentUser) return;

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

    /* ================= 0. POPUP THÔNG BÁO DÙNG APPUI ================= */
    function showCustomAlert(title, message, callback) {
        const isSuccess = title.toLowerCase().indexOf('thành công') !== -1;
        const isError = title.toLowerCase().indexOf('lỗi') !== -1;
        const fn = isSuccess ? AppUI.success : (isError ? AppUI.error : AppUI.warning);
        fn({
            title: title,
            message: message,
            onClose: callback
        });
    }

    function showCustomConfirm(title, message, onConfirm) {
        AppUI.confirm({
            title: title,
            message: message,
            danger: true,
            onConfirm: onConfirm
        });
    }


    /* ================= 1. XỬ LÝ THÔNG TIN NHÂN VIÊN & ẢNH ĐẠI DIỆN ================= */
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

        let staffList = [];
        try {
            staffList = JSON.parse(localStorage.getItem('facilityStaffList')) || [];
        } catch (err) {
            staffList = [];
        }

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

        // 2. Đồng bộ sang facilityStaffList
        let staffList = [];
        try {
            staffList = JSON.parse(localStorage.getItem('facilityStaffList')) || [];
        } catch (err) {
            staffList = [];
        }

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

        try {
            localStorage.setItem('facilityStaffList', JSON.stringify(staffList));
            localStorage.setItem('nhanVienProfile', JSON.stringify(staffEntry));
        } catch (err) {
            return false;
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
    }

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


    /* ================= 2. LỊCH CA TRỰC THEO TUẦN THẬT & BẢNG CHỌN NHIỀU CA ================= */
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

        timetableContainer.innerHTML = '';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.95rem';

        const weekLabel = getSelectedWeekText();

        table.innerHTML = `
            <thead>
                <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 20%;">Thứ</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 35%;">Ca Trực (${AppUI.escapeHtml(weekLabel)})</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 15%;">Nhân viên</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 15%;">Trạng thái</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 15%; text-align: center;">Hành động</th>
                </tr>
            </thead>
            <tbody id="timetable-rows"></tbody>
        `;

        timetableContainer.appendChild(table);
        const tbody = document.getElementById('timetable-rows');

        const shiftOrder = { sang: 1, chieu: 2, toi: 3 };

        AppData.DAY_NAMES.forEach((day, offset) => {
            const dayDateObj = weekMonday ? AppData.addDays(weekMonday, offset) : null;
            const dayDateISO = dayDateObj ? AppData.toISODate(dayDateObj) : '';
            const dayDateLabel = dayDateObj ? AppData.formatDate(dayDateObj) : '';
            const isToday = dayDateISO && dayDateISO === todayISO;

            const dayShifts = weekShifts
                .filter(item => item.date === dayDateISO || item.day === day)
                .slice()
                .sort((a, b) => (shiftOrder[a.shiftKey] || 9) - (shiftOrder[b.shiftKey] || 9));

            const tr = document.createElement('tr');
            if (isToday) {
                tr.style.backgroundColor = '#fff1f6';
            }

            let timeContent = '<span style="color: var(--text-muted); font-style: italic;">Trống (Nghỉ)</span>';
            let staffContent = '-';
            let statusContent = '-';
            let actionContent = '-';

            if (dayShifts.length > 0) {
                timeContent = dayShifts.map(s => `<div style="padding: 3px 0; font-weight: 500;">• ${AppUI.escapeHtml(s.time)}</div>`).join('');
                staffContent = dayShifts.map(s => `<div style="padding: 3px 0; font-weight: 600; color: #3b82f6;">${AppUI.escapeHtml(s.staff || 'Chưa rõ')}</div>`).join('');

                statusContent = dayShifts.map(s => {
                    const statusText = AppData.getShiftStatus(s, now);
                    let color = '#d97706';
                    if (statusText === 'Đã hoàn thành') color = '#10b981';
                    else if (statusText === 'Đang trực') color = 'var(--primary)';
                    return `<div style="padding: 3px 0; color: ${color}; font-weight: 600;">${statusText}</div>`;
                }).join('');

                actionContent = dayShifts.map(s => {
                    const statusText = AppData.getShiftStatus(s, now);
                    const canCancel = isMyShift(s, profile) && statusText === 'Sắp tới';
                    if (canCancel) {
                        return `<button type="button" class="btn-delete-shift" data-id="${AppUI.escapeHtml(s.id)}" style="padding: 3px 8px; background-color: #ef4444; color: #fff; border: none; border-radius: 4px; font-size: 0.8rem; cursor: pointer; display: block; margin: 3px auto;">Hủy</button>`;
                    }
                    return '<div style="padding: 3px 0; color: var(--text-muted);">-</div>';
                }).join('');
            }

            const dayBg = isToday ? '#fff1f6' : '#fafafa';
            tr.innerHTML = `
                <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 600; background-color: ${dayBg};">
                    <div>${day}${isToday ? ' <span style="font-size:0.75rem;color:var(--primary);">(Hôm nay)</span>' : ''}</div>
                    <div style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">${dayDateLabel}</div>
                </td>
                <td style="padding: 10px; border: 1px solid var(--border-color);">${timeContent}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color);">${staffContent}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color);">${statusContent}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color); text-align: center;">${actionContent}</td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete-shift').forEach(btn => {
            btn.addEventListener('click', function() {
                const shiftId = this.getAttribute('data-id');
                const currentShifts = AppData.loadShifts();
                const targetIndex = currentShifts.findIndex(item => item.id === shiftId);
                if (targetIndex === -1) return;

                const target = currentShifts[targetIndex];
                showCustomConfirm(
                    'Xác nhận hủy ca trực',
                    `Bạn có chắc chắn muốn hủy ${target.time} vào ${target.day} (${AppData.formatDate(target.date)}) không?`,
                    function() {
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
                );
            });
        });
    }

    function updateSelectedCountLabel() {
        if (shiftSelectedCount) {
            shiftSelectedCount.textContent = `Đã chọn: ${selectedSlots.size} ca`;
        }
    }

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

        shiftPickerTable.innerHTML = '';

        const thead = document.createElement('thead');
        const headTr = document.createElement('tr');

        const thCorner = document.createElement('th');
        thCorner.textContent = 'Buổi / Thứ';
        headTr.appendChild(thCorner);

        const weekDates = [];
        AppData.DAY_NAMES.forEach((dayName, offset) => {
            const dObj = weekMonday ? AppData.addDays(weekMonday, offset) : null;
            const dISO = dObj ? AppData.toISODate(dObj) : '';
            weekDates.push({ dayName: dayName, dateObj: dObj, dateISO: dISO });

            const th = document.createElement('th');
            if (dISO === todayISO) th.className = 'col-today';
            const daySpan = document.createElement('div');
            daySpan.textContent = dayName;
            const dateSpan = document.createElement('div');
            dateSpan.style.fontSize = '0.78rem';
            dateSpan.style.fontWeight = '400';
            dateSpan.textContent = dObj ? `${pad2(dObj.getDate())}/${pad2(dObj.getMonth() + 1)}` : '';
            th.appendChild(daySpan);
            th.appendChild(dateSpan);
            headTr.appendChild(th);
        });
        thead.appendChild(headTr);
        shiftPickerTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        AppData.SHIFT_TYPES.forEach(shiftType => {
            const tr = document.createElement('tr');

            const labelTd = document.createElement('td');
            labelTd.className = 'shift-picker-row-label';
            const titleDiv = document.createElement('div');
            titleDiv.textContent = shiftType.label;
            const timeSpan = document.createElement('span');
            timeSpan.className = 'shift-picker-row-time';
            timeSpan.textContent = `${shiftType.start} - ${shiftType.end}`;
            labelTd.appendChild(titleDiv);
            labelTd.appendChild(timeSpan);
            tr.appendChild(labelTd);

            weekDates.forEach(dayInfo => {
                const td = document.createElement('td');
                const slotKey = `${dayInfo.dateISO}|${shiftType.key}`;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'shift-slot';
                btn.setAttribute('data-date', dayInfo.dateISO);
                btn.setAttribute('data-shift', shiftType.key);

                const existing = shifts.find(s => s.date === dayInfo.dateISO && s.shiftKey === shiftType.key);
                const started = AppData.isShiftStarted(dayInfo.dateISO, shiftType.key, now);

                if (existing) {
                    if (isMyShift(existing, profile)) {
                        btn.classList.add('slot-mine');
                        btn.textContent = 'Ca của bạn';
                    } else {
                        btn.classList.add('slot-taken');
                        btn.textContent = `Đã có: ${existing.staff || 'Nhân viên'}`;
                    }
                    btn.disabled = true;
                    selectedSlots.delete(slotKey);
                } else if (started) {
                    btn.classList.add('slot-past');
                    btn.textContent = 'Đã qua';
                    btn.disabled = true;
                    selectedSlots.delete(slotKey);
                } else {
                    const isSelected = selectedSlots.has(slotKey);
                    btn.classList.add(isSelected ? 'slot-selected' : 'slot-available');
                    btn.textContent = isSelected ? '✓ Đã chọn' : '+ Chọn';

                    btn.addEventListener('click', function() {
                        if (selectedSlots.has(slotKey)) {
                            selectedSlots.delete(slotKey);
                            btn.classList.remove('slot-selected');
                            btn.classList.add('slot-available');
                            btn.textContent = '+ Chọn';
                        } else {
                            selectedSlots.set(slotKey, {
                                dateISO: dayInfo.dateISO,
                                shiftKey: shiftType.key
                            });
                            btn.classList.remove('slot-available');
                            btn.classList.add('slot-selected');
                            btn.textContent = '✓ Đã chọn';
                        }
                        updateSelectedCountLabel();
                    });
                }

                td.appendChild(btn);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        shiftPickerTable.appendChild(tbody);
        updateSelectedCountLabel();
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


    /* ================= 3. XỬ LÝ QUẢN LÝ KHÁCH HÀNG CỤ THỂ & XÁC NHẬN ĐƠN / DỊCH VỤ ================= */
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

    function getStaffConfirmerInfo() {
        const profile = getStaffProfile();
        return {
            name: (profile.name || '').trim() || currentUser.fullname || currentUser.email || 'Nhân viên',
            email: currentUser.email || '',
            phone: (profile.phone || '').trim()
        };
    }

    function loadCustomerManagementSnapshot() {
        let bookedServices = [];
        try {
            bookedServices = JSON.parse(localStorage.getItem('myServices')) || [];
        } catch (err) {
            bookedServices = [];
        }

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
            const isRecalled = bk.status === 'recalled' || Boolean(bk.recalledBy);
            const isConfirmed = !isRecalled && (bk.status === 'confirmed' || Boolean(bk.confirmedBy));
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
                isRecalled: isRecalled,
                isConfirmed: isConfirmed,
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
            const isRecalled = ord.status === 'recalled' || Boolean(ord.recalledBy);
            const isConfirmed = !isRecalled && (ord.status === 'confirmed' || Boolean(ord.confirmedBy));
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
                isRecalled: isRecalled,
                isConfirmed: isConfirmed,
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

        const customers = Array.from(customersMap.values()).sort((a, b) => {
            const aPending = a.services.filter(s => s.status !== 'confirmed' && s.status !== 'recalled' && !s.confirmedBy && !s.recalledBy).length +
                a.orders.filter(o => o.status !== 'confirmed' && o.status !== 'recalled' && !o.confirmedBy && !o.recalledBy).length;
            const bPending = b.services.filter(s => s.status !== 'confirmed' && s.status !== 'recalled' && !s.confirmedBy && !s.recalledBy).length +
                b.orders.filter(o => o.status !== 'confirmed' && o.status !== 'recalled' && !o.confirmedBy && !o.recalledBy).length;
            if (bPending !== aPending) return bPending - aPending;
            return (b.services.length + b.orders.length) - (a.services.length + a.orders.length);
        });

        return { requests: requests, customers: customers };
    }

    function confirmCustomerRequest(kind, realIdx) {
        const staffInfo = getStaffConfirmerInfo();
        const nowIso = new Date().toISOString();

        if (kind === 'service') {
            let bookings = [];
            try {
                bookings = JSON.parse(localStorage.getItem('myServices')) || [];
            } catch (err) {
                bookings = [];
            }
            const bk = bookings[realIdx];
            if (!bk) return;
            if (bk.status === 'confirmed' || bk.confirmedBy) {
                renderCustomerList();
                AppUI.warning({
                    title: 'Dịch vụ đã được xác nhận',
                    message: `Dịch vụ này đã được "${bk.confirmedBy || 'Nhân viên'}" xác nhận trước đó.`
                });
                return;
            }

            AppUI.confirm({
                title: 'Xác nhận đăng ký dịch vụ',
                message: `Xác nhận tiếp nhận dịch vụ "${bk.name || 'Dịch vụ'}" cho khách hàng "${bk.customerName || bk.customerEmail || 'Khách hàng'}"? Sau khi xác nhận, khách hàng sẽ thấy tên bạn và không thể tự thu hồi.`,
                confirmText: 'Xác nhận ngay',
                cancelText: 'Hủy',
                onConfirm: function() {
                    let latest = [];
                    try {
                        latest = JSON.parse(localStorage.getItem('myServices')) || [];
                    } catch (err) {
                        latest = [];
                    }
                    const target = latest[realIdx];
                    if (!target) return;
                    if (target.status === 'confirmed' || target.confirmedBy) {
                        renderCustomerList();
                        return;
                    }
                    latest[realIdx] = Object.assign({}, target, {
                        status: 'confirmed',
                        confirmedBy: staffInfo.name,
                        confirmedByEmail: staffInfo.email,
                        confirmedByPhone: staffInfo.phone,
                        confirmedAt: nowIso
                    });
                    localStorage.setItem('myServices', JSON.stringify(latest));
                    renderCustomerList();

                    AppUI.success({
                        title: 'Đã xác nhận dịch vụ!',
                        message: 'Trạng thái đã xác nhận và tên nhân viên phụ trách đã đồng bộ sang trang Khách Hàng.',
                        details: [
                            ['Dịch vụ', target.name || 'Dịch vụ'],
                            ['Khách hàng', target.customerName || target.customerEmail || 'Chưa cập nhật'],
                            ['Nhân viên xác nhận', staffInfo.name],
                            ['Thời gian xác nhận', new Date(nowIso).toLocaleString('vi-VN')]
                        ]
                    });
                }
            });
            return;
        }

        const orders = AppData.loadProductOrders();
        const ord = orders[realIdx];
        if (!ord) return;
        if (ord.status === 'confirmed' || ord.confirmedBy) {
            renderCustomerList();
            AppUI.warning({
                title: 'Đơn hàng đã được xác nhận',
                message: `Đơn hàng này đã được "${ord.confirmedBy || 'Nhân viên'}" xác nhận trước đó.`
            });
            return;
        }

        AppUI.confirm({
            title: `Xác nhận đơn hàng ${ord.code || ''}`,
            message: `Xác nhận đơn hàng ${ord.code || ''} (${formatVnd(ord.totalAmount)}) của khách hàng "${ord.customerName || ord.customerEmail || 'Khách hàng'}"? Sau khi xác nhận, khách hàng sẽ thấy tên bạn và không thể hủy đơn.`,
            confirmText: 'Xác nhận đơn hàng',
            cancelText: 'Hủy',
            onConfirm: function() {
                const latest = AppData.loadProductOrders();
                const target = latest[realIdx];
                if (!target) return;
                if (target.status === 'confirmed' || target.confirmedBy) {
                    renderCustomerList();
                    return;
                }
                latest[realIdx] = Object.assign({}, target, {
                    status: 'confirmed',
                    confirmedBy: staffInfo.name,
                    confirmedByEmail: staffInfo.email,
                    confirmedByPhone: staffInfo.phone,
                    confirmedAt: nowIso
                });
                AppData.saveProductOrders(latest);
                renderCustomerList();

                AppUI.success({
                    title: 'Đã xác nhận đơn hàng!',
                    message: 'Trạng thái đã xác nhận và tên nhân viên xử lý đã đồng bộ sang trang Khách Hàng.',
                    details: [
                        ['Mã đơn hàng', target.code || '—'],
                        ['Khách hàng', `${target.customerName || 'Khách hàng'} (${target.customerPhone || 'Chưa có SĐT'})`],
                        ['Tổng thanh toán', formatVnd(target.totalAmount)],
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
            .filter(o => o.status !== 'recalled' && !o.recalledBy)
            .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
        const getRecStatusLabel = r => {
            if (r.status === 'recalled' || r.recalledBy) return 'Đã thu hồi';
            if (r.status === 'confirmed' || r.confirmedBy) return 'Đã xác nhận';
            return 'Chờ xác nhận';
        };
        const getRecStaffLabel = r => {
            if (r.status === 'recalled' || r.recalledBy) return `Thu hồi: ${r.recalledBy || '—'}`;
            return r.confirmedBy || '—';
        };

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

    function renderCustomerList() {
        const snapshot = loadCustomerManagementSnapshot();
        const pendingCount = snapshot.requests.filter(r => !r.isConfirmed && !r.isRecalled).length;
        const confirmedCount = snapshot.requests.filter(r => r.isConfirmed).length;
        const recalledCount = snapshot.requests.filter(r => r.isRecalled).length;
        const ordersRevenue = snapshot.requests
            .filter(r => r.kind === 'order' && !r.isRecalled)
            .reduce((s, r) => s + r.price, 0);

        if (staffCustKpis) {
            staffCustKpis.innerHTML = `
                <div class="staff-cust-kpi">
                    <div class="staff-cust-kpi-label">Khách hàng</div>
                    <div class="staff-cust-kpi-val">${snapshot.customers.length}</div>
                </div>
                <div class="staff-cust-kpi">
                    <div class="staff-cust-kpi-label">Chờ xác nhận</div>
                    <div class="staff-cust-kpi-val" style="color: #d97706;">${pendingCount}</div>
                </div>
                <div class="staff-cust-kpi">
                    <div class="staff-cust-kpi-label">Đã xác nhận</div>
                    <div class="staff-cust-kpi-val" style="color: #059669;">${confirmedCount}</div>
                </div>
                <div class="staff-cust-kpi">
                    <div class="staff-cust-kpi-label">Đã thu hồi</div>
                    <div class="staff-cust-kpi-val" style="color: #dc2626;">${recalledCount}</div>
                </div>
                <div class="staff-cust-kpi">
                    <div class="staff-cust-kpi-label">Giá trị đơn SP</div>
                    <div class="staff-cust-kpi-val" style="color: var(--primary);">${formatVnd(ordersRevenue)}</div>
                </div>
            `;
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

            if (filteredReqs.length === 0) {
                customerListContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; padding: 12px 0;">${snapshot.requests.length === 0 ? 'Hiện chưa có đơn hàng hoặc đăng ký dịch vụ nào từ khách hàng.' : 'Không có bản ghi nào khớp với bộ lọc hiện tại.'}</p>`;
                return;
            }

            const listEl = document.createElement('div');
            listEl.className = 'staff-req-list';

            filteredReqs.forEach(req => {
                const card = document.createElement('div');
                const cardStateClass = req.isRecalled ? ' is-recalled' : (req.isConfirmed ? ' is-confirmed' : '');
                card.className = `staff-req-card${cardStateClass}`;

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
                        <button type="button" class="btn-recall-req">Thu hồi</button>
                    `;
                } else {
                    rightActionHtml = `<button type="button" class="btn-confirm-req">${req.kind === 'service' ? 'Xác nhận dịch vụ' : 'Xác nhận đơn hàng'}</button>`;
                }

                const priceText = req.kind === 'service'
                    ? (req.price > 0 ? `Giá gói: ${formatVnd(req.price)}` : 'Liên hệ tư vấn')
                    : `Tổng tiền: ${formatVnd(req.price)}`;

                card.innerHTML = `
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
                            <button type="button" class="btn-secondary btn-view-req" style="padding: 6px 12px; font-size: 0.84rem;">Xem chi tiết</button>
                            ${rightActionHtml}
                        </div>
                    </div>
                `;

                const btnView = card.querySelector('.btn-view-req');
                const btnConfirm = card.querySelector('.btn-confirm-req');
                const btnRecall = card.querySelector('.btn-recall-req');
                if (btnView) {
                    btnView.addEventListener('click', function() {
                        openRequestDetail(req);
                    });
                }
                if (btnConfirm) {
                    btnConfirm.addEventListener('click', function() {
                        confirmCustomerRequest(req.kind, req.realIdx);
                    });
                }
                if (btnRecall) {
                    btnRecall.addEventListener('click', function() {
                        openRecallModal(req);
                    });
                }

                listEl.appendChild(card);
            });

            customerListContainer.innerHTML = '';
            customerListContainer.appendChild(listEl);
            return;
        }

        const filteredCustomers = snapshot.customers.filter(cust => {
            if (!query) return true;
            const svcText = cust.services.map(s => s.name || '').join(' ');
            const ordText = cust.orders.map(o => `${o.code || ''} ${Array.isArray(o.items) ? o.items.map(it => it.name).join(' ') : ''}`).join(' ');
            const hay = `${cust.name} ${cust.email} ${cust.phone} ${cust.dob} ${cust.address} ${svcText} ${ordText}`.toLowerCase();
            return hay.indexOf(query) !== -1;
        });

        if (filteredCustomers.length === 0) {
            customerListContainer.innerHTML = `<p style="color: var(--text-muted); font-style: italic; padding: 12px 0;">${snapshot.customers.length === 0 ? 'Chưa có dữ liệu khách hàng trong hệ thống.' : 'Không tìm thấy khách hàng phù hợp.'}</p>`;
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.92rem';

        table.innerHTML = `
            <thead>
                <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Khách hàng</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Liên hệ &amp; Địa chỉ</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Dịch vụ đã đặt</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Đơn hàng SP</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); text-align: center;">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${filteredCustomers.map((cust, idx) => {
                    const svcConfirmed = cust.services.filter(s => s.status !== 'recalled' && !s.recalledBy && (s.status === 'confirmed' || s.confirmedBy)).length;
                    const ordConfirmed = cust.orders.filter(o => o.status !== 'recalled' && !o.recalledBy && (o.status === 'confirmed' || o.confirmedBy)).length;
                    const ordTotal = cust.orders.filter(o => o.status !== 'recalled' && !o.recalledBy).reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
                    return `
                        <tr>
                            <td style="padding: 10px; border: 1px solid var(--border-color);">
                                <div class="customer-name-cell">
                                    ${AppUI.avatarHtml(cust.avatar, cust.name, 34)}
                                    <div>
                                        <div style="font-weight: 700; color: var(--primary);">${AppUI.escapeHtml(cust.name)}</div>
                                        <div style="font-size: 0.78rem; color: var(--text-muted);">${AppUI.escapeHtml(cust.email || 'Hồ sơ cục bộ')}</div>
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                                <div><strong>SĐT:</strong> ${AppUI.escapeHtml(cust.phone)}</div>
                                <div><strong>Ngày sinh:</strong> ${AppUI.escapeHtml(cust.dob)}</div>
                                <div style="color: var(--text-muted);"><strong>ĐC:</strong> ${AppUI.escapeHtml(cust.address)}</div>
                            </td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                                <div><strong>${cust.services.length}</strong> gói dịch vụ</div>
                                <div style="color: #059669; font-size: 0.78rem;">Đã xác nhận: ${svcConfirmed}/${cust.services.length}</div>
                            </td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                                <div><strong>${cust.orders.length}</strong> đơn (${formatVnd(ordTotal)})</div>
                                <div style="color: #059669; font-size: 0.78rem;">Đã xác nhận: ${ordConfirmed}/${cust.orders.length}</div>
                            </td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); text-align: center; white-space: nowrap;">
                                <button type="button" class="btn-view-customer btn-primary" data-index="${idx}" style="padding: 5px 11px; font-size: 0.82rem;">Xem chi tiết</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;

        customerListContainer.innerHTML = '';
        customerListContainer.appendChild(table);

        customerListContainer.querySelectorAll('.btn-view-customer').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-index'), 10);
                openCustomerDetail(filteredCustomers[idx]);
            });
        });
    }

    if (staffCustTabs) {
        staffCustTabs.querySelectorAll('.staff-cust-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', function() {
                activeStaffCustTab = tabBtn.getAttribute('data-tab') || 'requests';
                staffCustTabs.querySelectorAll('.staff-cust-tab').forEach(b => {
                    b.classList.toggle('active', b === tabBtn);
                });
                renderCustomerList();
            });
        });
    }

    if (staffCustomerSearch) {
        staffCustomerSearch.addEventListener('input', renderCustomerList);
    }
    if (staffRequestTypeFilter) {
        staffRequestTypeFilter.addEventListener('change', renderCustomerList);
    }
    if (staffRequestStatusFilter) {
        staffRequestStatusFilter.addEventListener('change', renderCustomerList);
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

    if (recallModalForm) {
        recallModalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const kind = document.getElementById('recall-kind').value;
            const realIdx = parseInt(document.getElementById('recall-real-index').value, 10);
            const recallMessage = (recallMsgInput ? recallMsgInput.value : '').trim();
            if (!recallMessage) return;

            const staffInfo = getStaffConfirmerInfo();
            const nowIso = new Date().toISOString();

            if (kind === 'service') {
                let latest = [];
                try {
                    latest = JSON.parse(localStorage.getItem('myServices')) || [];
                } catch (err) {
                    latest = [];
                }
                const target = latest[realIdx];
                if (!target) return;
                latest[realIdx] = Object.assign({}, target, {
                    status: 'recalled',
                    recalledBy: staffInfo.name,
                    recalledByEmail: staffInfo.email,
                    recalledByPhone: staffInfo.phone,
                    recalledAt: nowIso,
                    recallMessage: recallMessage,
                    recallSeenByCustomer: false
                });
                localStorage.setItem('myServices', JSON.stringify(latest));
                if (recallModal) recallModal.classList.add('hidden');
                renderCustomerList();

                AppUI.success({
                    title: 'Đã thu hồi dịch vụ thành công!',
                    message: 'Thông báo thu hồi kèm lời nhắn của bạn sẽ hiển thị ngay khi khách hàng mở trang.',
                    details: [
                        ['Dịch vụ', target.name || 'Dịch vụ'],
                        ['Khách hàng', target.customerName || target.customerEmail || 'Khách hàng'],
                        ['Nhân viên thu hồi', staffInfo.name],
                        ['Lời nhắn gửi khách', recallMessage]
                    ]
                });
                return;
            }

            const latestOrders = AppData.loadProductOrders();
            const targetOrd = latestOrders[realIdx];
            if (!targetOrd) return;
            latestOrders[realIdx] = Object.assign({}, targetOrd, {
                status: 'recalled',
                recalledBy: staffInfo.name,
                recalledByEmail: staffInfo.email,
                recalledByPhone: staffInfo.phone,
                recalledAt: nowIso,
                recallMessage: recallMessage,
                recallSeenByCustomer: false
            });
            AppData.saveProductOrders(latestOrders);
            if (recallModal) recallModal.classList.add('hidden');
            renderCustomerList();

            AppUI.success({
                title: 'Đã thu hồi đơn hàng thành công!',
                message: 'Thông báo thu hồi kèm lời nhắn của bạn sẽ hiển thị ngay khi khách hàng mở trang.',
                details: [
                    ['Mã đơn hàng', targetOrd.code || '—'],
                    ['Khách hàng', `${targetOrd.customerName || 'Khách hàng'} (${targetOrd.customerPhone || 'Chưa có SĐT'})`],
                    ['Nhân viên thu hồi', staffInfo.name],
                    ['Lời nhắn gửi khách', recallMessage]
                ]
            });
        });
    }

    renderCustomerList();

    window.addEventListener('storage', function(e) {
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
