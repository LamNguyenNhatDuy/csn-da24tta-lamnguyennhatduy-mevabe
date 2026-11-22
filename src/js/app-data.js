(function (global) {
    'use strict';

    const SHIFTS_KEY = 'nhanVienShifts_v10';
    const SERVICES_KEY = 'meVaBeServices_v1';
    const PRODUCTS_KEY = 'meVaBeProducts_v1';
    const CART_KEY = 'meVaBeCart_v1';
    const PRODUCT_ORDERS_KEY = 'meVaBeProductOrders_v1';
    const CURRENT_USER_KEY = 'currentUser';
    const USERS_KEY = 'users';

    const SHIFT_TYPES = [
        { key: 'sang', label: 'Ca Sáng', start: '08:00', end: '12:00', hours: 4 },
        { key: 'chieu', label: 'Ca Chiều', start: '13:30', end: '17:30', hours: 4 },
        { key: 'toi', label: 'Ca Tối', start: '18:00', end: '21:30', hours: 3.5 }
    ];

    const DAY_NAMES = [
        'Thứ Hai',
        'Thứ Ba',
        'Thứ Tư',
        'Thứ Năm',
        'Thứ Sáu',
        'Thứ Bảy',
        'Chủ Nhật'
    ];

    const DEFAULT_SERVICES = [
        {
            id: 'tam-be',
            name: 'Tắm & Massage Bé Sơ Sinh',
            category: 'Chăm sóc Bé',
            target: 'Bé sơ sinh',
            location: 'Tại nhà',
            duration: '60 phút',
            price: 280000,
            originalPrice: 350000,
            discount: 20,
            rating: 5.0,
            specBadge: '60p · Tại nhà',
            saleTag: 'GIẢM -20%',
            artType: 'baby-bath',
            artBg: '#eff6ff',
            artAccent: '#0284c7',
            shortDesc: 'Giúp bé thư giãn, ngủ ngon, kích thích tiêu hóa và phát triển cơ xương an toàn tại nhà.',
            desc: 'Dịch vụ chăm sóc toàn diện cho bé yêu trong những năm tháng đầu đời ngay tại nhà dưới sự hỗ trợ của điều dưỡng viên.',
            benefits: [
                'Kiểm tra sức khỏe tổng quát và vệ sinh rốn, mắt, mũi, tai.',
                'Massage kích thích tiêu hóa, giúp bé ngủ sâu giấc.',
                'Tắm nước ấm pha thảo dược an toàn.'
            ],
            image: ''
        },
        {
            id: 'me-sau-sinh',
            name: 'Chăm Sóc Phục Hồi Mẹ Sau Sinh',
            category: 'Chăm sóc Mẹ',
            target: 'Mẹ sau sinh',
            location: 'Tại nhà',
            duration: '90 phút',
            price: 590000,
            originalPrice: 720000,
            discount: 18,
            rating: 4.9,
            specBadge: '90p · Chuyên sâu',
            saleTag: 'BÁN CHẠY',
            artType: 'mom-spa',
            artBg: '#fff1f6',
            artAccent: '#ff4d8d',
            shortDesc: 'Phục hồi sức khỏe, massage body giảm nhức mỏi, xông hơi và chăm sóc da chuyên sâu.',
            desc: 'Liệu trình chăm sóc sức khỏe và sắc đẹp chuyên sâu giúp mẹ nhanh chóng lấy lại vóc dáng và làm dịu cơn đau nhức.',
            benefits: [
                'Massage body giảm đau mỏi lưng, cổ, vai, gáy.',
                'Xông hơi thảo dược giải độc cơ thể.',
                'Hỗ trợ quấn bụng định hình vóc dáng.'
            ],
            image: ''
        },
        {
            id: 'thong-sua',
            name: 'Thông Tắc Tia Sữa Chuyên Sâu',
            category: 'Chăm sóc Mẹ',
            target: 'Mẹ sau sinh',
            location: 'Tại nhà',
            duration: '60 phút',
            price: 450000,
            originalPrice: 520000,
            discount: 13,
            rating: 5.0,
            specBadge: 'Siêu âm · Không đau',
            saleTag: 'CẤP TỐC 1H',
            artType: 'milk-care',
            artBg: '#fdf2f8',
            artAccent: '#db2777',
            shortDesc: 'Xử lý nhanh chóng, triệt để tình trạng căng tức sữa, tắc tia sữa giúp mẹ cho con bú thuận lợi.',
            desc: 'Giải pháp nhanh chóng và không đau giúp khơi thông nguồn sữa mẹ, phòng ngừa viêm tuyến vú.',
            benefits: [
                'Ứng dụng công nghệ sóng siêu âm hiện đại.',
                'Kỹ thuật day ấn huyệt chuyên nghiệp.',
                'Tư vấn dinh dưỡng và cách cho con bú đúng cách.'
            ],
            image: ''
        },
        {
            id: 'boi-thuy-lieu',
            name: 'Bơi Thủy Liệu (Hydrotherapy)',
            category: 'Chăm sóc Bé',
            target: 'Bé sơ sinh',
            location: 'Tại cơ sở',
            duration: '45 phút',
            price: 320000,
            originalPrice: 380000,
            discount: 16,
            rating: 4.9,
            specBadge: '45p · Hồ riêng',
            saleTag: 'YÊU THÍCH',
            artType: 'hydro',
            artBg: '#ecfeff',
            artAccent: '#0891b2',
            shortDesc: 'Giúp bé vận động từ sớm, phát triển chiều cao, tăng cường hệ miễn dịch và sự cứng cáp.',
            desc: 'Phương pháp vận động dưới nước hiện đại giúp bé phát triển thể chất toàn diện từ giai đoạn sớm.',
            benefits: [
                'Tăng cường sự cứng cáp cho hệ cơ xương khớp.',
                'Kích thích tuần hoàn máu và hệ hô hấp.',
                'Giúp bé tự tin, mạnh dạn và ăn ngon miệng hơn.'
            ],
            image: ''
        },
        {
            id: 'massage-bau',
            name: 'Massage Bầu Thư Giãn',
            category: 'Chăm sóc Mẹ',
            target: 'Mẹ bầu',
            location: 'Tại nhà',
            duration: '75 phút',
            price: 420000,
            originalPrice: 490000,
            discount: 14,
            rating: 4.9,
            specBadge: '75p · Thảo dược',
            saleTag: 'GIẢM -14%',
            artType: 'prenatal',
            artBg: '#fdf4ff',
            artAccent: '#a21caf',
            shortDesc: 'Giảm đau lưng, phù nề chân tay, giải tỏa căng thẳng cho mẹ trong suốt thai kỳ.',
            desc: 'Liệu pháp chăm sóc đặc biệt dành riêng cho mẹ bầu nhằm xua tan mệt mỏi và phù nề thai kỳ.',
            benefits: [
                'Giảm đau nhức vùng thắt lưng và bắp chân.',
                'Cải thiện chất lượng giấc ngủ cho mẹ bầu.',
                'Tăng cường tuần hoàn máu nuôi dưỡng thai nhi tốt hơn.'
            ],
            image: ''
        },
        {
            id: 'kham-nhi',
            name: 'Khám Sức Khỏe Trẻ Sơ Sinh',
            category: 'Y tế & Dinh dưỡng',
            target: 'Bé sơ sinh',
            location: 'Tại nhà',
            duration: '45 phút',
            price: 390000,
            originalPrice: 450000,
            discount: 13,
            rating: 5.0,
            specBadge: 'Bác sĩ nhi',
            saleTag: 'CHUYÊN KHOA',
            artType: 'pediatric',
            artBg: '#ecfdf5',
            artAccent: '#059669',
            shortDesc: 'Bác sĩ nhi khoa thăm khám tổng quát tận nhà, theo dõi sát sao biểu đồ phát triển của bé.',
            desc: 'Bác sĩ chuyên khoa nhi trực tiếp thăm khám định kỳ và tư vấn sức khỏe cho bé tại nhà.',
            benefits: [
                'Đánh giá biểu đồ tăng trưởng cân nặng và chiều cao.',
                'Tư vấn tiêm chủng và phác đồ chăm sóc khoa học.',
                'Phát hiện sớm các dấu hiệu bệnh lý thông thường.'
            ],
            image: ''
        },
        {
            id: 'dinh-duong',
            name: 'Tư Vấn Dinh Dưỡng Ăn Dặm',
            category: 'Y tế & Dinh dưỡng',
            target: 'Trẻ nhỏ',
            location: 'Tại cơ sở',
            duration: '60 phút',
            price: 250000,
            originalPrice: 300000,
            discount: 17,
            rating: 4.8,
            specBadge: 'Thực đơn 1:1',
            saleTag: 'ĂN DẶM',
            artType: 'nutrition',
            artBg: '#fefce8',
            artAccent: '#ca8a04',
            shortDesc: 'Lên thực đơn khoa học, phù hợp theo từng giai đoạn phát triển hệ tiêu hóa của trẻ.',
            desc: 'Xây dựng thực đơn ăn dặm khoa học, phù hợp với hệ tiêu hóa và sự phát triển từng tháng tuổi của bé.',
            benefits: [
                'Lên thực đơn chi tiết theo phương pháp hiện đại.',
                'Hướng dẫn chế biến đồ ăn dặm giàu dưỡng chất.',
                'Tư vấn xử lý tình trạng biếng ăn sinh lý ở trẻ.'
            ],
            image: ''
        },
        {
            id: 'xong-hoi',
            name: 'Xông Hơi Phục Hồi Sau Sinh',
            category: 'Chăm sóc Mẹ',
            target: 'Mẹ sau sinh',
            location: 'Tại cơ sở',
            duration: '60 phút',
            price: 340000,
            originalPrice: 400000,
            discount: 15,
            rating: 4.9,
            specBadge: 'Thảo mộc 100%',
            saleTag: 'ƯU ĐÃI',
            artType: 'herbal',
            artBg: '#fff7ed',
            artAccent: '#ea580c',
            shortDesc: 'Liệu pháp thảo dược cổ truyền giúp mẹ đào thải độc tố, làm sạch và sáng hồng làn da.',
            desc: 'Liệu pháp xông hơi thảo mộc tự nhiên giúp mẹ thư giãn tinh thần và làm đẹp da.',
            benefits: [
                'Đào thải độc tố qua tuyến mồ hôi hiệu quả.',
                'Làm sạch lỗ chân lông và sáng hồng làn da.',
                'Giảm nhanh các triệu chứng cảm mạo sau sinh.'
            ],
            image: ''
        },
        {
            id: 'bao-mau',
            name: 'Thuê Bảo Mẫu Chăm Trẻ',
            category: 'Chăm sóc Bé',
            target: 'Trẻ nhỏ',
            location: 'Tại nhà',
            duration: '4 giờ / ca',
            price: 480000,
            originalPrice: 550000,
            discount: 13,
            rating: 4.9,
            specBadge: 'Theo ca · Uy tín',
            saleTag: 'TẬN TÂM',
            artType: 'nanny',
            artBg: '#eef2ff',
            artAccent: '#4f46e5',
            shortDesc: 'Cung cấp nhân sự uy tín, tận tâm hỗ trợ gia đình chăm sóc và trông nom bé theo giờ.',
            desc: 'Dịch vụ cung cấp người chăm trẻ tận tâm, giàu kinh nghiệm giúp bố mẹ thảnh thơi thời gian.',
            benefits: [
                'Hỗ trợ trông nom, cho bé ăn và chơi cùng bé an toàn.',
                'Nhân sự được kiểm tra lý lịch và đào tạo bài bản.',
                'Linh hoạt thời gian theo giờ hoặc theo ca.'
            ],
            image: ''
        }
    ];

    /* ================= TÀI KHOẢN & PHIÊN ĐĂNG NHẬP ================= */
    function loadUsers() {
        try {
            const parsed = JSON.parse(localStorage.getItem(USERS_KEY));
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function saveUsers(users) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            return true;
        } catch (err) {
            return false;
        }
    }

    function ensureDefaultAdmin() {
        const users = loadUsers();
        let changed = false;

        const oldDefaultIdx = users.findIndex(function (u) {
            return u && u.role === 'chucoso' && u.email === 'admin@mevabe.vn' && u.password === 'admin123';
        });
        if (oldDefaultIdx !== -1) {
            users.splice(oldDefaultIdx, 1);
            changed = true;
        }

        const hasOwner = users.some(function (u) {
            return u && u.role === 'chucoso';
        });
        if (!hasOwner) {
            users.push({
                fullname: 'Chủ Cơ Sở',
                email: 'admin',
                password: 'admin',
                role: 'chucoso'
            });
            changed = true;
        }

        if (changed) {
            saveUsers(users);
        }
    }

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
        } catch (err) {
            return null;
        }
    }

    function setCurrentUser(user) {
        try {
            if (user) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
                    fullname: user.fullname || '',
                    email: user.email || '',
                    role: user.role || ''
                }));
            } else {
                localStorage.removeItem(CURRENT_USER_KEY);
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    function logout(loginUrl) {
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.href = loginUrl || '../html-dangki-dangnhap/login.html';
    }

    function requireRole(expectedRole, loginUrl) {
        const user = getCurrentUser();
        if (!user || (expectedRole && user.role !== expectedRole)) {
            window.location.href = loginUrl || '../html-dangki-dangnhap/login.html';
            return null;
        }
        return user;
    }

    /* ================= DỊCH VỤ DÙNG CHUNG (CHỦ CƠ SỞ <-> KHÁCH HÀNG) ================= */
    function buildServiceIllustrationSvg(service) {
        const bg = (service && service.artBg) || '#fff1f6';
        const accent = (service && service.artAccent) || '#ff4d8d';
        const kind = (service && service.artType) || 'mom-spa';
        let shape = '';

        if (kind === 'baby-bath' || kind === 'hydro') {
            shape =
                '<path d="M52 122 C52 158, 188 158, 188 122 L182 114 L58 114 Z" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="46" y="106" width="148" height="14" rx="7" fill="' + accent + '"/>' +
                '<circle cx="96" cy="84" r="14" fill="#ffffff" stroke="' + accent + '" stroke-width="3"/>' +
                '<circle cx="132" cy="70" r="10" fill="' + accent + '" fill-opacity="0.25" stroke="' + accent + '" stroke-width="2.5"/>' +
                '<circle cx="156" cy="88" r="7" fill="' + accent + '" fill-opacity="0.45"/>' +
                '<path d="M72 138 Q96 128 120 138 T168 138" fill="none" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/>';
        } else if (kind === 'pediatric') {
            shape =
                '<rect x="66" y="54" width="108" height="120" rx="16" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="108" y="84" width="24" height="60" rx="5" fill="' + accent + '"/>' +
                '<rect x="90" y="102" width="60" height="24" rx="5" fill="' + accent + '"/>' +
                '<circle cx="164" cy="64" r="18" fill="' + accent + '" fill-opacity="0.18" stroke="' + accent + '" stroke-width="3"/>';
        } else if (kind === 'nutrition') {
            shape =
                '<path d="M56 116 C56 164, 184 164, 184 116 Z" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="50" y="104" width="140" height="14" rx="7" fill="' + accent + '"/>' +
                '<circle cx="100" cy="84" r="14" fill="' + accent + '" fill-opacity="0.75"/>' +
                '<circle cx="132" cy="86" r="12" fill="#10b981" fill-opacity="0.75"/>' +
                '<path d="M150 62 L176 92" stroke="' + accent + '" stroke-width="5" stroke-linecap="round"/>';
        } else if (kind === 'herbal') {
            shape =
                '<ellipse cx="120" cy="144" rx="56" ry="26" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<path d="M120 120 C120 82, 160 66, 160 98 C160 120, 128 124, 120 120 Z" fill="' + accent + '" fill-opacity="0.85"/>' +
                '<path d="M116 122 C116 86, 78 72, 78 102 C78 122, 108 126, 116 122 Z" fill="#10b981" fill-opacity="0.75"/>' +
                '<path d="M104 62 Q112 46 104 36" fill="none" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/>' +
                '<path d="M134 58 Q142 42 134 32" fill="none" stroke="' + accent + '" stroke-width="3" stroke-linecap="round"/>';
        } else if (kind === 'milk-care') {
            shape =
                '<path d="M120 50 C148 86, 162 110, 162 132 A42 42 0 1 1 78 132 C78 110, 92 86, 120 50 Z" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<path d="M120 82 C136 106, 144 120, 144 134 A24 24 0 1 1 96 134 C96 120, 104 106, 120 82 Z" fill="' + accent + '" fill-opacity="0.22"/>' +
                '<rect x="114" y="114" width="12" height="32" rx="4" fill="' + accent + '"/>' +
                '<rect x="104" y="124" width="32" height="12" rx="4" fill="' + accent + '"/>';
        } else if (kind === 'nanny') {
            shape =
                '<circle cx="96" cy="84" r="22" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<circle cx="148" cy="100" r="16" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<path d="M64 162 C64 126, 128 126, 128 162 Z" fill="' + accent + '" fill-opacity="0.88"/>' +
                '<path d="M124 162 C124 136, 172 136, 172 162 Z" fill="' + accent + '" fill-opacity="0.55"/>';
        } else {
            shape =
                '<path d="M120 166 C120 166, 62 126, 62 88 C62 66, 80 52, 98 52 C110 52, 117 59, 120 66 C123 59, 130 52, 142 52 C160 52, 178 66, 178 88 C178 126, 120 166, 120 166 Z" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<path d="M120 144 C120 144, 82 118, 82 92 C82 78, 92 70, 104 70 C112 70, 118 75, 120 80 C122 75, 128 70, 136 70 C148 70, 158 78, 158 92 C158 118, 120 144, 120 144 Z" fill="' + accent + '" fill-opacity="0.24"/>';
        }

        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220">' +
            '<rect width="240" height="220" rx="14" fill="' + bg + '"/>' +
            '<circle cx="120" cy="112" r="76" fill="#ffffff" fill-opacity="0.65"/>' +
            shape +
            '</svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    function normalizeServiceRecord(rawItem) {
        const defMap = {};
        DEFAULT_SERVICES.forEach(function (d) {
            defMap[d.id] = d;
        });
        const def = rawItem && rawItem.id && defMap[rawItem.id] ? defMap[rawItem.id] : {};
        const merged = Object.assign({
            category: 'Chăm sóc Mẹ',
            target: 'Mẹ sau sinh',
            location: 'Tại nhà',
            duration: '60 phút',
            price: 0,
            originalPrice: 0,
            discount: 0,
            rating: 5.0,
            specBadge: '',
            saleTag: '',
            artType: 'mom-spa',
            artBg: '#fff1f6',
            artAccent: '#ff4d8d',
            benefits: []
        }, def, rawItem || {});

        if (!merged.image) {
            merged.image = buildServiceIllustrationSvg(merged);
        }
        return merged;
    }

    function loadServices() {
        try {
            const raw = localStorage.getItem(SERVICES_KEY);
            if (raw === null) {
                const cloned = DEFAULT_SERVICES.map(function (s) {
                    return normalizeServiceRecord(Object.assign({}, s, {
                        benefits: s.benefits.slice(),
                        image: ''
                    }));
                });
                saveServices(cloned);
                return cloned;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizeServiceRecord);
        } catch (err) {
            return [];
        }
    }

    function saveServices(services) {
        try {
            const normalized = (Array.isArray(services) ? services : []).map(function (s) {
                const copy = Object.assign({}, s);
                if (!copy.image) {
                    copy.image = buildServiceIllustrationSvg(copy);
                }
                return copy;
            });
            localStorage.setItem(SERVICES_KEY, JSON.stringify(normalized));
            return true;
        } catch (err) {
            return false;
        }
    }

    /* ================= TIỆN ÍCH NGÀY & CA TRỰC ================= */
    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function toISODate(d) {
        const date = d instanceof Date ? d : parseISODate(d);
        if (!date || isNaN(date.getTime())) return '';
        return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function parseISODate(s) {
        if (s instanceof Date) {
            return new Date(s.getFullYear(), s.getMonth(), s.getDate());
        }
        if (typeof s !== 'string') return null;
        const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const year = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const day = parseInt(m[3], 10);
        const d = new Date(year, month - 1, day);
        if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
            return null;
        }
        return d;
    }

    function formatDate(d) {
        const date = d instanceof Date ? d : parseISODate(d);
        if (!date || isNaN(date.getTime())) return '';
        return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + '/' + date.getFullYear();
    }

    function getMonday(d) {
        const base = d instanceof Date
            ? new Date(d.getFullYear(), d.getMonth(), d.getDate())
            : (parseISODate(d) || new Date());
        const clean = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        const day = clean.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        clean.setDate(clean.getDate() + diff);
        return clean;
    }

    function addDays(d, n) {
        const base = d instanceof Date
            ? new Date(d.getFullYear(), d.getMonth(), d.getDate())
            : parseISODate(d);
        if (!base) return null;
        const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        next.setDate(next.getDate() + n);
        return next;
    }

    function getShiftType(key) {
        return SHIFT_TYPES.find(function (item) { return item.key === key; }) || null;
    }

    function shiftLabel(key) {
        const t = getShiftType(key);
        return t ? (t.label + ' (' + t.start + ' - ' + t.end + ')') : '';
    }

    function shiftHours(key) {
        const t = getShiftType(key);
        return t ? t.hours : 0;
    }

    function buildDateTime(dateISO, hhmm) {
        const d = parseISODate(dateISO);
        if (!d || typeof hhmm !== 'string') return null;
        const parts = hhmm.split(':');
        if (parts.length !== 2) return null;
        return new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate(),
            parseInt(parts[0], 10),
            parseInt(parts[1], 10),
            0,
            0
        );
    }

    function getShiftStatus(shift, now) {
        const current = now instanceof Date ? now : new Date();
        if (!shift) return 'Sắp tới';
        let type = getShiftType(shift.shiftKey);
        if (!type && shift.time) {
            type = SHIFT_TYPES.find(function (t) {
                return shift.time.indexOf(t.label) !== -1;
            }) || null;
        }
        if (!type || !shift.date) return 'Sắp tới';

        const startDt = buildDateTime(shift.date, type.start);
        const endDt = buildDateTime(shift.date, type.end);
        if (!startDt || !endDt) return 'Sắp tới';

        if (current < startDt) return 'Sắp tới';
        if (current <= endDt) return 'Đang trực';
        return 'Đã hoàn thành';
    }

    function isShiftStarted(dateISO, key, now) {
        const current = now instanceof Date ? now : new Date();
        const type = getShiftType(key);
        if (!type) return false;
        const startDt = buildDateTime(dateISO, type.start);
        if (!startDt) return false;
        return current >= startDt;
    }

    function createShiftRecord(dateISO, key, staffName, staffPhone, staffEmail) {
        const dateObj = parseISODate(dateISO);
        if (!dateObj) return null;
        const monday = getMonday(dateObj);
        const dayIndex = (dateObj.getDay() + 6) % 7;
        return {
            id: 'shift_' + dateISO + '_' + key + '_' + Math.random().toString(36).slice(2, 8),
            date: dateISO,
            weekStart: toISODate(monday),
            day: DAY_NAMES[dayIndex],
            shiftKey: key,
            time: shiftLabel(key),
            staff: staffName || 'Chưa cập nhật',
            staffPhone: staffPhone || '',
            staffEmail: staffEmail || '',
            createdAt: new Date().toISOString()
        };
    }

    const LEGACY_PRODUCT_ID_MAP = {
        'sp-sua-aptamil-800': '001',
        'sp-sua-pha-san-growplus': '002',
        'sp-sua-pha-san-loc4': '003',
        'sp-ta-dan-huggies-nb': '004',
        'sp-ta-quan-bobby-l': '005',
        'sp-binh-sua-pigeon': '006',
        'sp-may-ham-sua': '007',
        'sp-bot-an-dam-hipp': '008',
        'sp-sua-tam-cetaphil': '009',
        'sp-khan-uot-mamamy': '010',
        'sp-sua-bau-morinaga': '011',
        'sp-may-hut-sua-doi': '012'
    };

    function formatProductCode(val) {
        const clean = String(val === null || val === undefined ? '' : val).trim();
        if (!clean) return '';
        if (/^\d+$/.test(clean)) {
            const num = parseInt(clean, 10);
            return String(num).padStart(3, '0');
        }
        return clean;
    }

    function getNextProductCode(products) {
        const list = Array.isArray(products) ? products : [];
        let maxNum = 0;
        list.forEach(function (p) {
            if (!p) return;
            const rawCode = String(p.code || p.id || '').trim();
            if (/^\d+$/.test(rawCode)) {
                const n = parseInt(rawCode, 10);
                if (n > maxNum) maxNum = n;
            }
        });
        return String(maxNum + 1).padStart(3, '0');
    }

    const DEFAULT_PRODUCTS = [
        {
            id: '001',
            code: '001',
            name: 'Sữa bột Aptamil Profutura KID Cesarbiotik 800g',
            category: 'Sữa & Dinh dưỡng',
            age: '1 - 3 tuổi',
            type: 'Hộp / Lon',
            shipping: 'Siêu tốc 1H',
            freeship: true,
            rating: 4.9,
            price: 695000,
            originalPrice: 820000,
            discount: 15,
            specBadge: '800g · Từ 2 tuổi',
            saleTag: 'GIÁ TỐT',
            gift: 'Tặng bình nước bé',
            artType: 'milk-can',
            artBg: '#eff6ff',
            artAccent: '#0284c7',
            desc: 'Sữa công thức giàu dưỡng chất hỗ trợ hệ miễn dịch và tiêu hóa khỏe mạnh cho trẻ từ 1 đến 3 tuổi.'
        },
        {
            id: '002',
            code: '002',
            name: 'Thùng Sữa pha sẵn GrowPLUS+ Đỏ 180ml (48 hộp)',
            category: 'Sữa & Dinh dưỡng',
            age: '1 - 3 tuổi',
            type: 'Combo / Thùng',
            shipping: 'Giao nhanh trong ngày',
            freeship: true,
            rating: 4.8,
            price: 589000,
            originalPrice: 690000,
            discount: 15,
            specBadge: '180ml · 48 hộp',
            saleTag: 'SALE -15%',
            gift: 'Tặng balo mầm non',
            artType: 'milk-pack',
            artBg: '#fef2f2',
            artAccent: '#dc2626',
            desc: 'Sữa dinh dưỡng pha sẵn tiện lợi giúp bé tăng cân khỏe mạnh, hỗ trợ phát triển chiều cao và trí não.'
        },
        {
            id: '003',
            code: '003',
            name: 'Combo 2 lốc Sữa dinh dưỡng pha sẵn cho bé 110ml',
            category: 'Sữa & Dinh dưỡng',
            age: '1 - 3 tuổi',
            type: 'Combo / Thùng',
            shipping: 'Siêu tốc 1H',
            freeship: true,
            rating: 4.8,
            price: 96000,
            originalPrice: 120000,
            discount: 20,
            specBadge: '110ml · 8 hộp',
            saleTag: 'GIẢM SỐC',
            gift: '',
            artType: 'milk-pack',
            artBg: '#f0fdf4',
            artAccent: '#16a34a',
            desc: 'Hương vị thơm ngon dễ uống, bổ sung vitamin D3, Canxi và DHA cần thiết mỗi ngày cho trẻ nhỏ.'
        },
        {
            id: '004',
            code: '004',
            name: 'Tã dán sơ sinh Huggies Skin Perfect NB 70 miếng',
            category: 'Tã & Bỉm',
            age: '0 - 6 tháng',
            type: 'Gói / Bịch',
            shipping: 'Siêu tốc 1H',
            freeship: true,
            rating: 4.9,
            price: 265000,
            originalPrice: 315000,
            discount: 16,
            specBadge: 'NB · 70 miếng',
            saleTag: 'BÁN CHẠY',
            gift: '',
            artType: 'diaper',
            artBg: '#fdf2f8',
            artAccent: '#db2777',
            desc: 'Bề mặt mềm mịn chuẩn da bé sơ sinh, thấm hút vượt trội và thoáng khí giúp hạn chế hăm tã tối đa.'
        },
        {
            id: '005',
            code: '005',
            name: 'Combo 2 bịch Tã quần Bobby Extra Soft-Dry size L',
            category: 'Tã & Bỉm',
            age: '6 - 12 tháng',
            type: 'Combo / Thùng',
            shipping: 'Siêu tốc 1H',
            freeship: true,
            rating: 4.7,
            price: 478000,
            originalPrice: 590000,
            discount: 19,
            specBadge: 'Size L · 108M',
            saleTag: 'COMBO',
            gift: 'Tặng khăn ướt 80 tờ',
            artType: 'diaper',
            artBg: '#ecfeff',
            artAccent: '#0891b2',
            desc: 'Lõi nén siêu mỏng 3mm thoáng mát, đai chun co giãn êm ái giúp bé thoải mái vận động cả ngày dài.'
        },
        {
            id: '006',
            code: '006',
            name: 'Bình sữa Pigeon PP Plus cổ rộng 240ml (Kèm núm ty)',
            category: 'Bình sữa & Ăn dặm',
            age: '0 - 6 tháng',
            type: 'Dụng cụ',
            shipping: 'Siêu tốc 1H',
            freeship: false,
            rating: 4.9,
            price: 249000,
            originalPrice: 295000,
            discount: 16,
            specBadge: '240ml · BPA Free',
            saleTag: 'CHÍNH HÃNG',
            gift: '',
            artType: 'bottle',
            artBg: '#fffbeb',
            artAccent: '#d97706',
            desc: 'Chất liệu nhựa PP an toàn không chứa BPA, núm ty silicone siêu mềm mô phỏng bầu ngực mẹ.'
        },
        {
            id: '007',
            code: '007',
            name: 'Máy hâm sữa & tiệt trùng đa năng Moaz BéBé',
            category: 'Bình sữa & Ăn dặm',
            age: '0 - 6 tháng',
            type: 'Dụng cụ',
            shipping: 'Giao nhanh trong ngày',
            freeship: true,
            rating: 4.8,
            price: 890000,
            originalPrice: 1120000,
            discount: 21,
            specBadge: 'Đa năng · BH 12T',
            saleTag: 'SALE -21%',
            gift: 'Tặng cọ rửa bình',
            artType: 'warmer',
            artBg: '#f5f3ff',
            artAccent: '#7c3aed',
            desc: 'Giữ nhiệt sữa ổn định, rã đông sữa mẹ nhẹ nhàng và tiệt trùng hơi nước nhanh chóng cho bình sữa bé.'
        },
        {
            id: '008',
            code: '008',
            name: 'Bột ăn dặm hữu cơ HiPP vị Gạo Sữa Chuối Đào 250g',
            category: 'Bình sữa & Ăn dặm',
            age: '6 - 12 tháng',
            type: 'Hộp / Lon',
            shipping: 'Siêu tốc 1H',
            freeship: false,
            rating: 4.8,
            price: 135000,
            originalPrice: 155000,
            discount: 13,
            specBadge: '250g · Từ 6 tháng',
            saleTag: 'HỮU CƠ',
            gift: '',
            artType: 'cereal',
            artBg: '#fefce8',
            artAccent: '#ca8a04',
            desc: 'Nguyên liệu hữu cơ tự nhiên, mịn mượt dễ tiêu hóa giúp bé tập ăn dặm hào hứng trong giai đoạn đầu.'
        },
        {
            id: '009',
            code: '009',
            name: 'Sữa tắm gội dịu nhẹ toàn thân Cetaphil Baby 400ml',
            category: 'Chăm sóc da & Tắm gội',
            age: '0 - 6 tháng',
            type: 'Chai / Tuýp',
            shipping: 'Siêu tốc 1H',
            freeship: true,
            rating: 4.9,
            price: 225000,
            originalPrice: 270000,
            discount: 17,
            specBadge: '400ml · Không cay',
            saleTag: 'YÊU THÍCH',
            gift: '',
            artType: 'wash',
            artBg: '#eff6ff',
            artAccent: '#2563eb',
            desc: 'Chiết xuất hoa cúc Calendula hữu cơ làm sạch nhẹ nhàng, dưỡng ẩm và bảo vệ làn da nhạy cảm của trẻ sơ sinh.'
        },
        {
            id: '010',
            code: '010',
            name: 'Combo 3 gói Khăn ướt em bé Mamamy không mùi (300 tờ)',
            category: 'Chăm sóc da & Tắm gội',
            age: '0 - 6 tháng',
            type: 'Combo / Thùng',
            shipping: 'Siêu tốc 1H',
            freeship: true,
            rating: 4.8,
            price: 119000,
            originalPrice: 148000,
            discount: 20,
            specBadge: '300 tờ · Tinh khiết',
            saleTag: 'GIẢM 20%',
            gift: 'Tặng gói nhỏ 20 tờ',
            artType: 'wipes',
            artBg: '#fdf2f8',
            artAccent: '#e11d48',
            desc: 'Vải không dệt dày mịn không xơ bông, sử dụng nước tinh khiết EDI an toàn lau mặt và da cho trẻ nhỏ.'
        },
        {
            id: '011',
            code: '011',
            name: 'Sữa bầu Morinaga Nhật Bản vị Trà Sữa (Hộp 12 gói)',
            category: 'Mẹ bầu & Sau sinh',
            age: 'Mẹ bầu & Sau sinh',
            type: 'Hộp / Lon',
            shipping: 'Giao nhanh trong ngày',
            freeship: true,
            rating: 4.9,
            price: 245000,
            originalPrice: 285000,
            discount: 14,
            specBadge: '12 gói · Ít đường',
            saleTag: 'MẸ BẦU',
            gift: '',
            artType: 'milk-can',
            artBg: '#fff1f2',
            artAccent: '#be185d',
            desc: 'Giàu Axit Folic, Sắt, Canxi và DHA giúp mẹ bầu khỏe khoắn, hạn chế tăng cân quá mức và hỗ trợ thai nhi.'
        },
        {
            id: '012',
            code: '012',
            name: 'Máy hút sữa điện đôi rảnh tay êm ái cho mẹ sau sinh',
            category: 'Mẹ bầu & Sau sinh',
            age: 'Mẹ bầu & Sau sinh',
            type: 'Dụng cụ',
            shipping: 'Giao nhanh trong ngày',
            freeship: true,
            rating: 4.9,
            price: 1290000,
            originalPrice: 1650000,
            discount: 22,
            specBadge: 'Điện đôi · Không dây',
            saleTag: 'SALE -22%',
            gift: 'Tặng 20 túi trữ sữa',
            artType: 'breast-pump',
            artBg: '#fdf4ff',
            artAccent: '#a21caf',
            desc: 'Lực hút êm nhẹ mô phỏng nhịp bú tự nhiên của bé, hỗ trợ kích sữa và dự trữ sữa mẹ tiện lợi.'
        }
    ];

    function buildProductIllustrationSvg(product) {
        const bg = product.artBg || '#fff1f6';
        const accent = product.artAccent || '#ff4d8d';
        const kind = product.artType || 'milk-can';
        let shape = '';

        if (kind === 'milk-can') {
            shape =
                '<rect x="70" y="48" width="100" height="132" rx="14" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="66" y="42" width="108" height="18" rx="7" fill="' + accent + '"/>' +
                '<rect x="72" y="92" width="96" height="54" fill="' + accent + '" fill-opacity="0.14"/>' +
                '<circle cx="120" cy="118" r="20" fill="' + accent + '"/>' +
                '<text x="120" y="124" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#ffffff">MILK</text>';
        } else if (kind === 'milk-pack') {
            shape =
                '<rect x="50" y="72" width="140" height="94" rx="10" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<polygon points="50,72 78,50 188,50 190,72" fill="' + accent + '" fill-opacity="0.22" stroke="' + accent + '" stroke-width="3"/>' +
                '<rect x="66" y="92" width="32" height="58" rx="5" fill="' + accent + '"/>' +
                '<rect x="104" y="92" width="32" height="58" rx="5" fill="' + accent + '" fill-opacity="0.75"/>' +
                '<rect x="142" y="92" width="32" height="58" rx="5" fill="' + accent + '" fill-opacity="0.5"/>';
        } else if (kind === 'diaper') {
            shape =
                '<rect x="54" y="54" width="132" height="122" rx="16" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<path d="M84 54 C92 38, 148 38, 156 54" fill="none" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="66" y="80" width="108" height="62" rx="10" fill="' + accent + '" fill-opacity="0.14"/>' +
                '<path d="M88 106 Q120 132 152 106 L146 130 Q120 144 94 130 Z" fill="' + accent + '"/>';
        } else if (kind === 'bottle') {
            shape =
                '<path d="M104 42 C104 30, 136 30, 136 42 L140 58 L100 58 Z" fill="#f59e0b"/>' +
                '<rect x="92" y="58" width="56" height="16" rx="6" fill="' + accent + '"/>' +
                '<rect x="86" y="74" width="68" height="106" rx="18" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="92" y="122" width="56" height="50" rx="10" fill="#fef3c7"/>' +
                '<line x1="100" y1="94" x2="114" y2="94" stroke="' + accent + '" stroke-width="3"/>' +
                '<line x1="100" y1="110" x2="118" y2="110" stroke="' + accent + '" stroke-width="3"/>' +
                '<line x1="100" y1="126" x2="114" y2="126" stroke="' + accent + '" stroke-width="3"/>';
        } else if (kind === 'warmer') {
            shape =
                '<rect x="68" y="64" width="104" height="114" rx="18" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="84" y="42" width="72" height="24" rx="10" fill="' + accent + '" fill-opacity="0.22" stroke="' + accent + '" stroke-width="3"/>' +
                '<rect x="90" y="102" width="60" height="32" rx="8" fill="#1e293b"/>' +
                '<text x="120" y="123" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="#38bdf8">40°C</text>' +
                '<circle cx="120" cy="156" r="9" fill="' + accent + '"/>';
        } else if (kind === 'cereal') {
            shape =
                '<rect x="68" y="48" width="104" height="132" rx="12" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="70" y="50" width="100" height="24" rx="8" fill="' + accent + '"/>' +
                '<path d="M84 134 C84 156, 156 156, 156 134 Z" fill="' + accent + '" fill-opacity="0.85"/>' +
                '<circle cx="120" cy="116" r="14" fill="#fef08a" stroke="' + accent + '" stroke-width="3"/>';
        } else if (kind === 'wash') {
            shape =
                '<path d="M114 34 L144 34 L144 44 L126 44 L126 58 L114 58 Z" fill="' + accent + '"/>' +
                '<rect x="84" y="58" width="72" height="122" rx="20" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="94" y="92" width="52" height="58" rx="10" fill="' + accent + '" fill-opacity="0.16"/>' +
                '<circle cx="120" cy="120" r="14" fill="' + accent + '"/>';
        } else if (kind === 'wipes') {
            shape =
                '<rect x="50" y="76" width="140" height="84" rx="16" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="90" y="64" width="60" height="24" rx="8" fill="' + accent + '"/>' +
                '<circle cx="120" cy="126" r="18" fill="' + accent + '" fill-opacity="0.18"/>' +
                '<path d="M110 126 L120 116 L130 126 L120 136 Z" fill="' + accent + '"/>';
        } else {
            shape =
                '<circle cx="90" cy="118" r="32" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<circle cx="150" cy="118" r="32" fill="#ffffff" stroke="' + accent + '" stroke-width="4"/>' +
                '<rect x="106" y="72" width="28" height="92" rx="12" fill="' + accent + '"/>' +
                '<circle cx="120" cy="118" r="10" fill="#ffffff"/>';
        }

        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220">' +
            '<rect width="240" height="220" rx="14" fill="' + bg + '"/>' +
            '<circle cx="120" cy="112" r="76" fill="#ffffff" fill-opacity="0.65"/>' +
            shape +
            '</svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    function loadProducts() {
        try {
            const raw = localStorage.getItem(PRODUCTS_KEY);
            if (raw === null) {
                const seeded = DEFAULT_PRODUCTS.map(function (p) {
                    return Object.assign({}, p, { image: buildProductIllustrationSvg(p) });
                });
                localStorage.setItem(PRODUCTS_KEY, JSON.stringify(seeded));
                return seeded;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return DEFAULT_PRODUCTS.map(function (p) {
                    return Object.assign({}, p, { image: buildProductIllustrationSvg(p) });
                });
            }

            let changed = false;
            let seq = 1;
            const migrated = parsed.map(function (p) {
                if (!p) return p;
                const copy = Object.assign({}, p);
                if (copy.id && LEGACY_PRODUCT_ID_MAP[copy.id]) {
                    copy.id = LEGACY_PRODUCT_ID_MAP[copy.id];
                    changed = true;
                }
                const targetCode = formatProductCode(copy.code) ||
                    (copy.id && /^\d+$/.test(copy.id) ? formatProductCode(copy.id) : String(seq).padStart(3, '0'));
                if (!copy.code || copy.code !== targetCode) {
                    copy.code = targetCode;
                    changed = true;
                }
                if (copy.id && copy.id.indexOf('sp-') === 0) {
                    copy.id = targetCode;
                    changed = true;
                }
                if (/^\d+$/.test(targetCode)) {
                    const n = parseInt(targetCode, 10);
                    if (n >= seq) seq = n + 1;
                } else {
                    seq++;
                }
                if (!copy.image) {
                    copy.image = buildProductIllustrationSvg(copy);
                    changed = true;
                }
                return copy;
            });

            if (changed) {
                localStorage.setItem(PRODUCTS_KEY, JSON.stringify(migrated));
            }
            return migrated;
        } catch (err) {
            return DEFAULT_PRODUCTS.map(function (p) {
                return Object.assign({}, p, { image: buildProductIllustrationSvg(p) });
            });
        }
    }

    function saveProducts(products) {
        try {
            const normalized = (Array.isArray(products) ? products : []).map(function (p, idx) {
                const copy = Object.assign({}, p);
                copy.code = formatProductCode(copy.code) || String(idx + 1).padStart(3, '0');
                if (!copy.id) copy.id = copy.code;
                if (!copy.image) {
                    copy.image = buildProductIllustrationSvg(copy);
                }
                return copy;
            });
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized));
            return true;
        } catch (err) {
            return false;
        }
    }

    function getCartStorageKey(userEmail) {
        const clean = (userEmail || 'guest').trim().toLowerCase();
        return CART_KEY + '_' + clean;
    }

    function loadCart(userEmail) {
        try {
            const raw = localStorage.getItem(getCartStorageKey(userEmail));
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (it) {
                if (!it) return it;
                const copy = Object.assign({}, it);
                if (copy.id && LEGACY_PRODUCT_ID_MAP[copy.id]) {
                    copy.id = LEGACY_PRODUCT_ID_MAP[copy.id];
                }
                copy.code = formatProductCode(copy.code) || formatProductCode(copy.id);
                return copy;
            });
        } catch (err) {
            return [];
        }
    }

    function saveCart(userEmail, cart) {
        try {
            localStorage.setItem(getCartStorageKey(userEmail), JSON.stringify(cart));
            return true;
        } catch (err) {
            return false;
        }
    }

    function loadProductOrders() {
        try {
            const raw = localStorage.getItem(PRODUCT_ORDERS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed.map(function (ord) {
                if (!ord || !Array.isArray(ord.items)) return ord;
                const copy = Object.assign({}, ord);
                copy.items = ord.items.map(function (it) {
                    if (!it) return it;
                    const itemCopy = Object.assign({}, it);
                    if (itemCopy.id && LEGACY_PRODUCT_ID_MAP[itemCopy.id]) {
                        itemCopy.id = LEGACY_PRODUCT_ID_MAP[itemCopy.id];
                    }
                    itemCopy.code = formatProductCode(itemCopy.code) || formatProductCode(itemCopy.id);
                    return itemCopy;
                });
                return copy;
            });
        } catch (err) {
            return [];
        }
    }

    function saveProductOrders(orders) {
        try {
            localStorage.setItem(PRODUCT_ORDERS_KEY, JSON.stringify(orders));
            return true;
        } catch (err) {
            return false;
        }
    }
    // KHÔNG tạo dữ liệu giả - chỉ trả về dữ liệu thật đã đăng ký
    function loadShifts() {
        try {
            const raw = localStorage.getItem(SHIFTS_KEY);
            if (raw === null) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function saveShifts(arr) {
        try {
            localStorage.setItem(SHIFTS_KEY, JSON.stringify(arr));
            return true;
        } catch (err) {
            return false;
        }
    }

    global.AppData = {
        SHIFTS_KEY: SHIFTS_KEY,
        SERVICES_KEY: SERVICES_KEY,
        PRODUCTS_KEY: PRODUCTS_KEY,
        CART_KEY: CART_KEY,
        PRODUCT_ORDERS_KEY: PRODUCT_ORDERS_KEY,
        CURRENT_USER_KEY: CURRENT_USER_KEY,
        SHIFT_TYPES: SHIFT_TYPES,
        DAY_NAMES: DAY_NAMES,
        loadUsers: loadUsers,
        saveUsers: saveUsers,
        ensureDefaultAdmin: ensureDefaultAdmin,
        getCurrentUser: getCurrentUser,
        setCurrentUser: setCurrentUser,
        logout: logout,
        requireRole: requireRole,
        loadServices: loadServices,
        saveServices: saveServices,
        buildServiceIllustrationSvg: buildServiceIllustrationSvg,
        loadProducts: loadProducts,
        saveProducts: saveProducts,
        formatProductCode: formatProductCode,
        getNextProductCode: getNextProductCode,
        buildProductIllustrationSvg: buildProductIllustrationSvg,
        loadCart: loadCart,
        saveCart: saveCart,
        loadProductOrders: loadProductOrders,
        saveProductOrders: saveProductOrders,
        toISODate: toISODate,
        parseISODate: parseISODate,
        formatDate: formatDate,
        getMonday: getMonday,
        addDays: addDays,
        shiftLabel: shiftLabel,
        shiftHours: shiftHours,
        getShiftStatus: getShiftStatus,
        isShiftStarted: isShiftStarted,
        createShiftRecord: createShiftRecord,
        loadShifts: loadShifts,
        saveShifts: saveShifts
    };
})(window);
