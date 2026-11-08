document.addEventListener('DOMContentLoaded', function() {
    
    /* ================= 0. HỆ THỐNG MODAL POPUP THÔNG BÁO CHUNG ================= */
    const modalOverlay = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalActions = document.getElementById('modal-actions');

    function showCustomAlert(title, message, callback) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalActions.innerHTML = '';

        const btnOk = document.createElement('button');
        btnOk.textContent = 'Đồng ý';
        btnOk.className = 'btn-primary';
        btnOk.style.padding = '6px 16px';

        btnOk.addEventListener('click', function() {
            modalOverlay.classList.add('hidden');
            if (callback) callback();
        });

        modalActions.appendChild(btnOk);
        modalOverlay.classList.remove('hidden');
    }

    function showCustomConfirm(title, message, onConfirm) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalActions.innerHTML = '';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = 'Hủy';
        btnCancel.className = 'btn-secondary';
        btnCancel.style.padding = '6px 16px';

        const btnConfirm = document.createElement('button');
        btnConfirm.textContent = 'Xác nhận';
        btnConfirm.className = 'btn-primary';
        btnConfirm.style.padding = '6px 16px';

        btnCancel.addEventListener('click', function() {
            modalOverlay.classList.add('hidden');
        });

        btnConfirm.addEventListener('click', function() {
            modalOverlay.classList.add('hidden');
            if (onConfirm) onConfirm();
        });

        modalActions.appendChild(btnCancel);
        modalActions.appendChild(btnConfirm);
        modalOverlay.classList.remove('hidden');
    }


    /* ================= 1. XỬ LÝ THÔNG TIN NHÂN VIÊN ================= */
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

    function loadStaffProfile() {
        const savedData = localStorage.getItem('nhanVienProfile');
        if (savedData) {
            const data = JSON.parse(savedData);
            dispName.textContent = data.name || 'Chưa cập nhật';
            dispPhone.textContent = data.phone || 'Chưa cập nhật';
            dispRole.textContent = data.role || 'Chưa cập nhật';
            dispArea.textContent = data.area || 'Chưa cập nhật';
        }
    }

    loadStaffProfile();

    btnEditStaff.addEventListener('click', function() {
        inputName.value = dispName.textContent !== 'Chưa cập nhật' ? dispName.textContent : '';
        inputPhone.value = dispPhone.textContent !== 'Chưa cập nhật' ? dispPhone.textContent : '';
        inputRole.value = dispRole.textContent !== 'Chưa cập nhật' ? dispRole.textContent : '';
        inputArea.value = dispArea.textContent !== 'Chưa cập nhật' ? dispArea.textContent : '';

        staffDisplay.classList.add('hidden');
        staffForm.classList.remove('hidden');
    });

    btnCancelStaff.addEventListener('click', function() {
        staffForm.classList.add('hidden');
        staffDisplay.classList.remove('hidden');
    });

    staffForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newData = {
            name: inputName.value,
            phone: inputPhone.value,
            role: inputRole.value,
            area: inputArea.value
        };

        localStorage.setItem('nhanVienProfile', JSON.stringify(newData));
        loadStaffProfile();

        staffForm.classList.add('hidden');
        staffDisplay.classList.remove('hidden');

        showCustomAlert("Thành công", "✅ Cập nhật thông tin nhân viên thành công!");
    });


    /* ================= 2. XỬ LÝ LỊCH CA TRỰC ĐA NĂM & TỰ ĐỘNG TÍNH NGÀY THÁNG (T2 - CN) ================= */
    const timetableContainer = document.getElementById('weekly-timetable-container');
    const filterYear = document.getElementById('filter-year');
    const filterWeek = document.getElementById('filter-week');
    const shiftWeekSelect = document.getElementById('shift-week');
    
    const btnAddShift = document.getElementById('btn-add-shift');
    const shiftForm = document.getElementById('shift-form');
    const btnCancelShift = document.getElementById('btn-cancel-shift');
    
    const inputShiftDay = document.getElementById('shift-day');
    const inputShiftTimeSelect = document.getElementById('shift-time-select');

    function formatDate(date) {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function generateWeeksWithDates(year) {
        filterWeek.innerHTML = '';
        shiftWeekSelect.innerHTML = '';

        const months = [
            "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", 
            "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
        ];

        months.forEach((monthName, mIndex) => {
            const optgroupFilter = document.createElement('optgroup');
            optgroupFilter.label = `${monthName} - Năm ${year}`;

            const optgroupForm = document.createElement('optgroup');
            optgroupForm.label = `${monthName} - Năm ${year}`;

            for (let w = 1; w <= 4; w++) {
                let startDay = (w - 1) * 7 + 1;
                let endDay = w * 7;
                
                let startDate = new Date(year, mIndex, startDay);
                let lastDayOfMonth = new Date(year, mIndex + 1, 0).getDate();
                if (endDay > lastDayOfMonth) endDay = lastDayOfMonth;
                let endDate = new Date(year, mIndex, endDay);

                let weekString = `${monthName} - Tuần ${w} (${formatDate(startDate)} đến ${formatDate(endDate)})`;

                const opt1 = document.createElement('option');
                opt1.value = weekString;
                opt1.textContent = `Tuần ${w} (${formatDate(startDate)} - ${formatDate(endDate)})`;
                optgroupFilter.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = weekString;
                opt2.textContent = `Tuần ${w} (${formatDate(startDate)} - ${formatDate(endDate)})`;
                optgroupForm.appendChild(opt2);
            }

            filterWeek.appendChild(optgroupFilter);
            shiftWeekSelect.appendChild(optgroupForm);
        });

        renderTimetable();
    }

    const defaultShifts = [
        { week: "Tháng 11 - Tuần 2 (08/11/2026 đến 14/11/2026)", day: "Thứ Hai", time: "Ca Sáng (08:00 - 12:00)", status: "Đang trực", staff: "Nguyễn Văn A" },
        { week: "Tháng 11 - Tuần 2 (08/11/2026 đến 14/11/2026)", day: "Thứ Ba", time: "Ca Chiều (13:30 - 17:30)", status: "Sắp tới", staff: "Nguyễn Văn A" },
        { week: "Tháng 11 - Tuần 1 (01/11/2026 đến 07/11/2026)", day: "Thứ Tư", time: "Ca Tối (18:00 - 21:30)", status: "Đã hoàn thành", staff: "Trần Thị B" }
    ];

    function renderTimetable() {
        let shifts = JSON.parse(localStorage.getItem('nhanVienShifts_v8')) || [];
        if (shifts.length === 0 && !localStorage.getItem('nhanVienShifts_v8_init')) {
            shifts = defaultShifts;
            localStorage.setItem('nhanVienShifts_v8', JSON.stringify(shifts));
            localStorage.setItem('nhanVienShifts_v8_init', 'true');
        }

        const selectedWeek = filterWeek.value;
        const filteredShifts = shifts.filter(item => item.week === selectedWeek);
        timetableContainer.innerHTML = '';

        const daysOfWeek = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.95rem';

        table.innerHTML = `
            <thead>
                <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 20%;">Thứ</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 35%;">Ca Trực (${selectedWeek})</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 15%;">Nhân viên</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 15%;">Trạng thái</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); width: 15%; text-align: center;">Hành động</th>
                </tr>
            </thead>
            <tbody id="timetable-rows"></tbody>
        `;

        timetableContainer.appendChild(table);
        const tbody = document.getElementById('timetable-rows');

        daysOfWeek.forEach(day => {
            const dayShifts = filteredShifts.filter(item => item.day === day);
            const tr = document.createElement('tr');
            
            let timeContent = '<span style="color: var(--text-muted); font-style: italic;">Trống (Nghỉ)</span>';
            let staffContent = '-';
            let statusContent = '-';
            let actionContent = '-';

            if (dayShifts.length > 0) {
                timeContent = dayShifts.map(s => `<div style="padding: 2px 0; font-weight: 500;">• ${s.time}</div>`).join('');
                staffContent = dayShifts.map(s => `<div style="padding: 2px 0; font-weight: 600; color: #3b82f6;">${s.staff || 'Chưa rõ'}</div>`).join('');
                
                statusContent = dayShifts.map(s => {
                    let color = '#d97706';
                    if (s.status === 'Đã hoàn thành') color = '#10b981';
                    else if (s.status === 'Đang trực') color = 'var(--primary)';
                    return `<div style="padding: 2px 0; color: ${color}; font-weight: 600;">${s.status}</div>`;
                }).join('');

                actionContent = dayShifts.map(s => {
                    const realIndex = shifts.findIndex(item => item.week === s.week && item.day === s.day && item.time === s.time && item.staff === s.staff);
                    return `<button class="btn-delete-shift" data-index="${realIndex}" style="padding: 3px 8px; background-color: #ef4444; color: #fff; border: none; border-radius: 4px; font-size: 0.8rem; cursor: pointer; display: block; margin: 2px auto;">Hủy</button>`;
                }).join('');
            }

            tr.innerHTML = `
                <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 600; background-color: #fafafa;">${day}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color);">${timeContent}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color);">${staffContent}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color);">${statusContent}</td>
                <td style="padding: 10px; border: 1px solid var(--border-color); text-align: center;">${actionContent}</td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete-shift').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = this.getAttribute('data-index');
                showCustomConfirm("Xác nhận hủy", "Bạn có chắc chắn muốn hủy ca trực này không?", function() {
                    shifts.splice(idx, 1);
                    localStorage.setItem('nhanVienShifts_v8', JSON.stringify(shifts));
                    renderTimetable();
                });
            });
        });
    }

    filterYear.addEventListener('change', function() {
        generateWeeksWithDates(filterYear.value);
    });

    filterWeek.addEventListener('change', renderTimetable);
    generateWeeksWithDates(filterYear.value);

    btnAddShift.addEventListener('click', function() {
        shiftWeekSelect.value = filterWeek.value;
        shiftForm.classList.remove('hidden');
    });

    btnCancelShift.addEventListener('click', function() {
        shiftForm.classList.add('hidden');
    });

    // XỬ LÝ KHI ĐĂNG KÝ CA TRỰC (CÓ KIỂM TRA TRÙNG LỊCH VÀ CHẶN NGÀY QUÁ KHỨ)
    shiftForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const currentProfile = JSON.parse(localStorage.getItem('nhanVienProfile'));
        const currentStaffName = currentProfile && currentProfile.name ? currentProfile.name : "Nhân viên hệ thống";

        const targetWeekStr = shiftWeekSelect.value;
        const targetDay = inputShiftDay.value;
        const targetTime = inputShiftTimeSelect.value;

        // KIỂM TRA NGÀY TRONG QUÁ KHỨ
        const dateMatch = targetWeekStr.match(/\((\d{2}\/\d{2}\/\d{4})\s+đến\s+(\d{2}\/\d{2}\/\d{4})\)/);
        
        if (dateMatch) {
            const startDateStr = dateMatch[1];
            const [d, m, y] = startDateStr.split('/');
            
            const dayMap = { "Thứ Hai": 0, "Thứ Ba": 1, "Thứ Tư": 2, "Thứ Năm": 3, "Thứ Sáu": 4, "Thứ Bảy": 5, "Chủ Nhật": 6 };
            const dayOffset = dayMap[targetDay] || 0;

            const shiftDate = new Date(y, m - 1, parseInt(d) + dayOffset);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (shiftDate < today) {
                showCustomAlert("Lỗi đăng ký lịch", `⚠️ Bạn không thể đăng ký ca trực cho ngày trong quá khứ (${targetDay}, ngày ${formatDate(shiftDate)}) đã xảy ra!`);
                return;
            }
        }

        let shifts = JSON.parse(localStorage.getItem('nhanVienShifts_v8')) || [];

        // KIỂM TRA TRÙNG LỊCH VỚI CHÍNH MÌNH HOẶC NHÂN VIÊN KHÁC
        const conflictOtherStaff = shifts.find(s => s.week === targetWeekStr && s.day === targetDay && s.time === targetTime);
        
        if (conflictOtherStaff) {
            if (conflictOtherStaff.staff === currentStaffName) {
                showCustomAlert("Trùng ca cá nhân", `⚠️ Bạn đã đăng ký ca trực này (${targetTime} vào ${targetDay}) rồi! Không thể đăng ký trùng.`);
            } else {
                showCustomAlert("Ca đã có người nhận", `⚠️ Ca trực này (${targetTime} vào ${targetDay}) đã được nhân viên **${conflictOtherStaff.staff}** đăng ký trước đó. Vui lòng chọn khung giờ hoặc ngày khác!`);
            }
            return; 
        }

        const newShift = {
            week: targetWeekStr,
            day: targetDay,
            time: targetTime,
            status: "Sắp tới",
            staff: currentStaffName
        };

        shifts.push(newShift);
        localStorage.setItem('nhanVienShifts_v8', JSON.stringify(shifts));

        filterWeek.value = targetWeekStr;
        renderTimetable();

        shiftForm.classList.add('hidden');
        showCustomAlert("Thành công", "✅ Đăng ký lịch trực thành công!");
    });


    /* ================= 3. XỬ LÝ QUẢN LÝ KHÁCH HÀNG ================= */
    const customerListContainer = document.getElementById('customer-list-container');
    const customerDetailModal = document.getElementById('customer-detail-modal');
    const customerDetailContent = document.getElementById('customer-detail-content');
    const btnCloseCustomerModal = document.getElementById('btn-close-customer-modal');

    function renderCustomerList() {
        const bookedServices = JSON.parse(localStorage.getItem('myServices')) || [];
        const customerProfile = JSON.parse(localStorage.getItem('khachHangProfile')) || {
            fullname: "Nguyễn Văn A",
            phone: "0987654321",
            dob: "1995-05-15",
            address: "Đường D5, Hòa Thuận, Trà Vinh"
        };

        let customerDataList = [];
        if (bookedServices.length > 0) {
            customerDataList.push({
                name: customerProfile.fullname || "Chưa cập nhật",
                phone: customerProfile.phone || "Chưa có SĐT",
                dob: customerProfile.dob || "Chưa cập nhật",
                address: customerProfile.address || "Đường D5, Hòa Thuận, Trà Vinh",
                services: bookedServices
            });
        }

        if (customerDataList.length === 0) {
            customerListContainer.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Hiện chưa có dữ liệu khách hàng đăng ký dịch vụ.</p>';
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '0.95rem';

        table.innerHTML = `
            <thead>
                <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Họ và tên</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Số điện thoại</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color);">Số dịch vụ đã đặt</th>
                    <th style="padding: 10px; border: 1px solid var(--border-color); text-align: center;">Thao tác</th>
                </tr>
            </thead>
            <tbody>
                ${customerDataList.map((cust, idx) => `
                    <tr>
                        <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 600; color: var(--primary);">${cust.name}</td>
                        <td style="padding: 10px; border: 1px solid var(--border-color);">${cust.phone}</td>
                        <td style="padding: 10px; border: 1px solid var(--border-color);">${cust.services.length} gói dịch vụ</td>
                        <td style="padding: 10px; border: 1px solid var(--border-color); text-align: center;">
                            <button class="btn-view-customer btn-primary" data-index="${idx}" style="padding: 4px 10px; font-size: 0.8rem;">Xem chi tiết</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        customerListContainer.innerHTML = '';
        customerListContainer.appendChild(table);

        document.querySelectorAll('.btn-view-customer').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = this.getAttribute('data-index');
                openCustomerDetail(customerDataList[idx]);
            });
        });
    }

    function openCustomerDetail(cust) {
        customerDetailContent.innerHTML = `
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="margin-bottom: 6px;"><strong>Họ và tên:</strong> ${cust.name}</div>
                <div style="margin-bottom: 6px;"><strong>Số điện thoại:</strong> ${cust.phone}</div>
                <div style="margin-bottom: 6px;"><strong>Ngày sinh:</strong> ${cust.dob}</div>
                <div><strong>Địa chỉ:</strong> ${cust.address}</div>
            </div>

            <h4 style="color: var(--text-main); margin-top: 10px; font-size: 1rem;">Danh sách dịch vụ đã đặt (${cust.services.length}):</h4>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f1f5f9; border-bottom: 1px solid var(--border-color);">
                            <th style="padding: 8px;">Dịch vụ</th>
                            <th style="padding: 8px;">Ngày đặt</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cust.services.map(s => `
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid var(--border-color); font-weight: 500; color: var(--primary);">${s.name}</td>
                                <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${s.date}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        customerDetailModal.classList.remove('hidden');
    }

    btnCloseCustomerModal.addEventListener('click', function() {
        customerDetailModal.classList.add('hidden');
    });

    renderCustomerList();

});