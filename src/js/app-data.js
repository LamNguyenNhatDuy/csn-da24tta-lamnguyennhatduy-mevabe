(function (global) {
    'use strict';

    const SHIFTS_KEY = 'nhanVienShifts_v10';
    const SERVICES_KEY = 'meVaBeServices_v1';
    const PRODUCTS_KEY = 'meVaBeProducts_v1';
    const CART_KEY = 'meVaBeCart_v1';
    const PRODUCT_ORDERS_KEY = 'meVaBeProductOrders_v1';
    const STAFF_KEY = 'facilityStaffList';
    const SERVICE_BOOKINGS_KEY = 'myServices';
    const CURRENT_USER_KEY = 'currentUser';
    const USERS_KEY = 'users';

    const currentScriptSrc = (document.currentScript && document.currentScript.src) || '';
    const API_BASE = currentScriptSrc
        ? currentScriptSrc.replace(/\/js\/app-data\.js(?:\?.*)?$/i, '/api/')
        : '../../api/';

    let apiEnabled = false;
    let apiBootstrapped = false;
    let apiSeeded = false;
    const memoryStore = Object.create(null);
    const quotaFallbackKeys = Object.create(null);

    function setLocalCache(key, value) {
        memoryStore[key] = value;
        try {
            localStorage.setItem(key, JSON.stringify(value));
            delete quotaFallbackKeys[key];
            return true;
        } catch (err) {
            quotaFallbackKeys[key] = true;
            return false;
        }
    }

    function getLocalCache(key) {
        if (quotaFallbackKeys[key] && Object.prototype.hasOwnProperty.call(memoryStore, key)) {
            return memoryStore[key];
        }
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) {
                return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
            }
            const parsed = JSON.parse(raw);
            memoryStore[key] = parsed;
            return parsed;
        } catch (err) {
            return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
        }
    }

    if (typeof global.addEventListener === 'function') {
        global.addEventListener('storage', function (e) {
            if (e && e.key) {
                delete quotaFallbackKeys[e.key];
                delete memoryStore[e.key];
            }
        });
    }

    function postEntityToServer(entity, data, email) {
        if (!apiEnabled) return true;
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_BASE + 'save.php', false);
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            xhr.send(JSON.stringify({
                entity: entity,
                data: data,
                email: email || ''
            }));
            if (xhr.status >= 200 && xhr.status < 300) {
                const res = JSON.parse(xhr.responseText || '{}');
                return Boolean(res && res.ok === true);
            }
            return false;
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('Lỗi lưu dữ liệu vào MySQL (' + entity + '):', err);
            }
            return false;
        }
    }

    function readArrayCache(key) {
        const parsed = getLocalCache(key);
        return Array.isArray(parsed) ? parsed : [];
    }

    function writeEntityArray(key, entity, list, email) {
        const clean = Array.isArray(list) ? list : [];
        const cacheOk = setLocalCache(key, clean);
        return apiEnabled ? postEntityToServer(entity, clean, email) : cacheOk;
    }

    const svgUriCache = Object.create(null);

    function wrapSvgDataUri(bg, shape) {
        const key = String(bg) + '|' + String(shape);
        if (svgUriCache[key]) return svgUriCache[key];
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220">' +
            '<rect width="240" height="220" rx="18" fill="' + bg + '"/>' +
            shape +
            '</svg>';
        const uri = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
        svgUriCache[key] = uri;
        return uri;
    }

    const LOGICAL_CODE_RE = /^[A-Z0-9]{2,}(?:_[A-Z0-9]+)*_\d{2,}$/;

    function stripVietnameseDiacritics(str) {
        return String(str || '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function buildInitialsPrefix(text, maxLen, fallback) {
        const cleanRaw = stripVietnameseDiacritics(text);
        const noParens = cleanRaw.replace(/\([^)]*\)/g, ' ').trim();
        const cleaned = (noParens || cleanRaw).replace(/[^A-Za-z0-9\s]/g, ' ').trim();
        if (!cleaned) return fallback || 'DV';

        const words = cleaned.split(/\s+/).filter(function (w) {
            if (!w) return false;
            if (/^\d+(g|kg|ml|l|mg|mcg|m)$/i.test(w)) return false;
            return /[A-Za-z0-9]/.test(w);
        });
        const source = words.length > 0 ? words : cleaned.split(/\s+/);
        let prefix = source.map(function (w) {
            return w.charAt(0).toUpperCase();
        }).join('');
        if (maxLen && prefix.length > maxLen) {
            prefix = prefix.slice(0, maxLen);
        }
        return prefix || fallback || 'DV';
    }

    function generateSequentialCode(prefix, existingCodes) {
        const cleanPrefix = String(prefix || 'CODE').replace(/[^A-Za-z0-9_]/g, '').toUpperCase() || 'CODE';
        const re = new RegExp('^' + cleanPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(\\d+)$', 'i');
        let maxSeq = 0;
        (Array.isArray(existingCodes) ? existingCodes : []).forEach(function (code) {
            const m = String(code || '').trim().match(re);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n > maxSeq) maxSeq = n;
            }
        });
        return cleanPrefix + '_' + String(maxSeq + 1).padStart(2, '0');
    }

    function generateServiceBookingCode(serviceName, existingBookings) {
        const prefix = buildInitialsPrefix(serviceName, 12, 'DV');
        const codes = (Array.isArray(existingBookings) ? existingBookings : []).map(function (b) {
            return typeof b === 'string' ? b : (b && b.id ? b.id : '');
        });
        return generateSequentialCode(prefix, codes);
    }

    function generateOrderCode(items, existingOrders) {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        let prefix = 'DH';
        if (list.length === 1) {
            prefix = buildInitialsPrefix(list[0].name || list[0].code || list[0].id, 8, 'DH');
        } else if (list.length === 2) {
            const p1 = buildInitialsPrefix(list[0].name || list[0].code || list[0].id, 4, 'SP1');
            const p2 = buildInitialsPrefix(list[1].name || list[1].code || list[1].id, 4, 'SP2');
            prefix = p1 + '_' + p2;
        } else if (list.length > 2) {
            const p1 = buildInitialsPrefix(list[0].name || list[0].code || list[0].id, 4, 'SP');
            prefix = p1 + '_CB' + list.length;
        }
        const codes = (Array.isArray(existingOrders) ? existingOrders : []).map(function (o) {
            return typeof o === 'string' ? o : (o && o.code ? o.code : '');
        });
        return generateSequentialCode(prefix, codes);
    }

    function fetchSnapshotFromServer() {
        const proto = (global.location && global.location.protocol) || '';
        if (proto !== 'http:' && proto !== 'https:') {
            apiBootstrapped = true;
            apiEnabled = false;
            return false;
        }
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', API_BASE + 'bootstrap.php?t=' + Date.now(), false);
            xhr.send(null);
            if (xhr.status !== 200 || !xhr.responseText) {
                apiBootstrapped = true;
                apiEnabled = false;
                return false;
            }
            const res = JSON.parse(xhr.responseText);
            if (!res || res.ok !== true || res.engine !== 'mysql' || !res.data) {
                apiBootstrapped = true;
                apiEnabled = false;
                return false;
            }

            apiEnabled = true;
            apiBootstrapped = true;
            apiSeeded = Boolean(res.seeded);

            const d = res.data;
            setLocalCache(USERS_KEY, Array.isArray(d.users) ? d.users : []);
            setLocalCache(STAFF_KEY, Array.isArray(d.staff) ? d.staff : []);
            if (Array.isArray(d.services) && (apiSeeded || d.services.length > 0)) {
                setLocalCache(SERVICES_KEY, d.services);
            } else if (!apiSeeded) {
                try {
                    localStorage.removeItem(SERVICES_KEY);
                } catch (err) { /* ignore */ }
                delete memoryStore[SERVICES_KEY];
            }
            if (Array.isArray(d.products) && (apiSeeded || d.products.length > 0)) {
                setLocalCache(PRODUCTS_KEY, d.products);
            } else if (!apiSeeded) {
                try {
                    localStorage.removeItem(PRODUCTS_KEY);
                } catch (err) { /* ignore */ }
                delete memoryStore[PRODUCTS_KEY];
            }
            setLocalCache(SHIFTS_KEY, Array.isArray(d.shifts) ? d.shifts : []);
            setLocalCache(SERVICE_BOOKINGS_KEY, Array.isArray(d.serviceBookings) ? d.serviceBookings : []);
            setLocalCache(PRODUCT_ORDERS_KEY, Array.isArray(d.productOrders) ? d.productOrders : []);

            const cartsMap = d.cartsByEmail && typeof d.cartsByEmail === 'object' ? d.cartsByEmail : {};
            Object.keys(cartsMap).forEach(function (emailKey) {
                setLocalCache(getCartStorageKey(emailKey), Array.isArray(cartsMap[emailKey]) ? cartsMap[emailKey] : []);
            });
            const cur = getCurrentUser();
            if (cur && cur.email) {
                const curCartKey = getCartStorageKey(cur.email);
                const normEmail = String(cur.email).trim().toLowerCase();
                if (!Object.prototype.hasOwnProperty.call(cartsMap, normEmail)) {
                    setLocalCache(curCartKey, []);
                }
            }
            return true;
        } catch (err) {
            apiBootstrapped = true;
            apiEnabled = false;
            return false;
        }
    }

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

    /* Tài khoản & phiên đăng nhập */
    function loadUsers() {
        return readArrayCache(USERS_KEY);
    }

    function saveUsers(users) {
        return writeEntityArray(USERS_KEY, 'users', users);
    }

    function loadStaff() {
        return readArrayCache(STAFF_KEY);
    }

    function saveStaff(staffList) {
        return writeEntityArray(STAFF_KEY, 'staff', staffList);
    }

    function loadServiceBookings() {
        const list = readArrayCache(SERVICE_BOOKINGS_KEY);
        if (list.length === 0) return list;

        const usedCodes = [];
        list.forEach(function (b) {
            if (b && LOGICAL_CODE_RE.test(String(b.id || '').trim())) {
                usedCodes.push(String(b.id).trim());
            }
        });

        let changed = false;
        const normalized = list.map(function (b) {
            if (!b || typeof b !== 'object') return b;
            const curId = String(b.id || '').trim();
            if (LOGICAL_CODE_RE.test(curId)) return b;
            changed = true;
            const nextCode = generateServiceBookingCode(b.name || b.serviceId || 'Dịch vụ', usedCodes);
            usedCodes.push(nextCode);
            return Object.assign({}, b, { id: nextCode });
        });

        if (changed) {
            saveServiceBookings(normalized);
        }
        return normalized;
    }

    function saveServiceBookings(bookings) {
        return writeEntityArray(SERVICE_BOOKINGS_KEY, 'serviceBookings', bookings);
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

    /* Dịch vụ mẫu */
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

        return wrapSvgDataUri(bg, shape);
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
        const parsed = getLocalCache(SERVICES_KEY);
        if (parsed === null) {
            const cloned = DEFAULT_SERVICES.map(function (s) {
                return normalizeServiceRecord(Object.assign({}, s, {
                    benefits: s.benefits.slice(),
                    image: ''
                }));
            });
            saveServices(cloned);
            return cloned;
        }
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeServiceRecord);
    }

    function saveServices(services) {
        const normalized = (Array.isArray(services) ? services : []).map(function (s) {
            const copy = Object.assign({}, s);
            if (!copy.image) {
                copy.image = buildServiceIllustrationSvg(copy);
            }
            return copy;
        });
        const cacheOk = setLocalCache(SERVICES_KEY, normalized);
        if (apiEnabled) {
            return postEntityToServer('services', normalized);
        }
        return cacheOk;
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

        return wrapSvgDataUri(bg, shape);
    }

    function loadProducts() {
        const parsed = getLocalCache(PRODUCTS_KEY);
        if (parsed === null) {
            const seeded = DEFAULT_PRODUCTS.map(function (p) {
                return Object.assign({}, p, { image: buildProductIllustrationSvg(p) });
            });
            saveProducts(seeded);
            return seeded;
        }
        if (!Array.isArray(parsed)) {
            return DEFAULT_PRODUCTS.map(function (p) {
                return Object.assign({}, p, { image: buildProductIllustrationSvg(p) });
            });
        }

        let changed = false;
        let idMigrated = false;
        let seq = 1;
        const migrated = parsed.map(function (p) {
            if (!p) return p;
            const copy = Object.assign({}, p);
            if (copy.id && LEGACY_PRODUCT_ID_MAP[copy.id]) {
                copy.id = LEGACY_PRODUCT_ID_MAP[copy.id];
                changed = true;
                idMigrated = true;
            }
            const targetCode = formatProductCode(copy.code) ||
                (copy.id && /^\d+$/.test(copy.id) ? formatProductCode(copy.id) : String(seq).padStart(3, '0'));
            if (!copy.code || copy.code !== targetCode) {
                copy.code = targetCode;
                changed = true;
                idMigrated = true;
            }
            if (copy.id && copy.id.indexOf('sp-') === 0) {
                copy.id = targetCode;
                changed = true;
                idMigrated = true;
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

        if (idMigrated) {
            saveProducts(migrated);
        } else if (changed) {
            setLocalCache(PRODUCTS_KEY, migrated);
        }
        return migrated;
    }

    function saveProducts(products) {
        const normalized = (Array.isArray(products) ? products : []).map(function (p, idx) {
            const copy = Object.assign({}, p);
            copy.code = formatProductCode(copy.code) || String(idx + 1).padStart(3, '0');
            if (!copy.id) copy.id = copy.code;
            if (!copy.image) {
                copy.image = buildProductIllustrationSvg(copy);
            }
            return copy;
        });
        const cacheOk = setLocalCache(PRODUCTS_KEY, normalized);
        if (apiEnabled) {
            return postEntityToServer('products', normalized);
        }
        return cacheOk;
    }

    function getCartStorageKey(userEmail) {
        const clean = (userEmail || 'guest').trim().toLowerCase();
        return CART_KEY + '_' + clean;
    }

    function loadCart(userEmail) {
        const parsed = getLocalCache(getCartStorageKey(userEmail));
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
    }

    function saveCart(userEmail, cart) {
        const cleanEmail = (userEmail || 'guest').trim().toLowerCase();
        return writeEntityArray(getCartStorageKey(cleanEmail), 'cart', cart, cleanEmail);
    }

    function loadProductOrders() {
        const parsed = getLocalCache(PRODUCT_ORDERS_KEY);
        if (!Array.isArray(parsed)) return [];

        const usedCodes = [];
        parsed.forEach(function (ord) {
            if (ord && LOGICAL_CODE_RE.test(String(ord.code || '').trim())) {
                usedCodes.push(String(ord.code).trim());
            }
        });

        let codeMigrated = false;
        const normalized = parsed.map(function (ord) {
            if (!ord || typeof ord !== 'object') return ord;
            const copy = Object.assign({}, ord);
            if (Array.isArray(ord.items)) {
                copy.items = ord.items.map(function (it) {
                    if (!it) return it;
                    const itemCopy = Object.assign({}, it);
                    if (itemCopy.id && LEGACY_PRODUCT_ID_MAP[itemCopy.id]) {
                        itemCopy.id = LEGACY_PRODUCT_ID_MAP[itemCopy.id];
                    }
                    itemCopy.code = formatProductCode(itemCopy.code) || formatProductCode(itemCopy.id);
                    return itemCopy;
                });
            }
            return copy;
        });

        // Sinh mã từ đơn cũ nhất (cuối mảng) đến đơn mới nhất (đầu mảng)
        for (let i = normalized.length - 1; i >= 0; i--) {
            const ord = normalized[i];
            if (!ord || typeof ord !== 'object') continue;
            const curCode = String(ord.code || '').trim();
            if (!LOGICAL_CODE_RE.test(curCode)) {
                const nextCode = generateOrderCode(ord.items, usedCodes);
                usedCodes.push(nextCode);
                ord.code = nextCode;
                codeMigrated = true;
            }
        }

        if (codeMigrated) {
            saveProductOrders(normalized);
        }
        return normalized;
    }

    function saveProductOrders(orders) {
        return writeEntityArray(PRODUCT_ORDERS_KEY, 'productOrders', orders);
    }

    function loadShifts() {
        return readArrayCache(SHIFTS_KEY);
    }

    function saveShifts(arr) {
        return writeEntityArray(SHIFTS_KEY, 'shifts', arr);
    }

    function refreshFromDatabase() {
        const ok = fetchSnapshotFromServer();
        if (ok && !apiSeeded) {
            ensureDefaultAdmin();
            loadServices();
            loadProducts();
            postEntityToServer('markSeeded', []);
            apiSeeded = true;
        }
        return ok;
    }

    function isDatabaseConnected() {
        return apiEnabled;
    }

    fetchSnapshotFromServer();
    if (apiEnabled) {
        ensureDefaultAdmin();
        if (!apiSeeded) {
            loadServices();
            loadProducts();
            postEntityToServer('markSeeded', []);
            apiSeeded = true;
        }
    }

    global.AppData = {
        SHIFTS_KEY: SHIFTS_KEY,
        SERVICES_KEY: SERVICES_KEY,
        PRODUCTS_KEY: PRODUCTS_KEY,
        CART_KEY: CART_KEY,
        PRODUCT_ORDERS_KEY: PRODUCT_ORDERS_KEY,
        STAFF_KEY: STAFF_KEY,
        SERVICE_BOOKINGS_KEY: SERVICE_BOOKINGS_KEY,
        CURRENT_USER_KEY: CURRENT_USER_KEY,
        SHIFT_TYPES: SHIFT_TYPES,
        DAY_NAMES: DAY_NAMES,
        loadUsers: loadUsers,
        saveUsers: saveUsers,
        loadStaff: loadStaff,
        saveStaff: saveStaff,
        loadServiceBookings: loadServiceBookings,
        saveServiceBookings: saveServiceBookings,
        generateServiceBookingCode: generateServiceBookingCode,
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
        generateOrderCode: generateOrderCode,
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
        saveShifts: saveShifts,
        refreshFromDatabase: refreshFromDatabase,
        isDatabaseConnected: isDatabaseConnected
    };
})(window);
