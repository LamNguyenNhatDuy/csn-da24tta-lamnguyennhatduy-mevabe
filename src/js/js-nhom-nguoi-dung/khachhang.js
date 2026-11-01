document.addEventListener('DOMContentLoaded', function() {
    
    /* =========================================================
       PHẦN 1: XỬ LÝ THÔNG TIN CÁ NHÂN & DỊCH VỤ ĐÃ ĐĂNG KÝ (CÓ THU HỒI)
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

    function loadProfileData() {
        const savedData = localStorage.getItem('khachHangProfile');
        if (savedData) {
            const data = JSON.parse(savedData);
            dispFullname.textContent = data.fullname || 'Chưa cập nhật';
            dispPhone.textContent = data.phone || 'Chưa cập nhật';
            dispDob.textContent = data.dob || 'Chưa cập nhật';
            dispAddress.textContent = data.address || 'Chưa cập nhật';
        }

        // Tải danh sách dịch vụ đã đăng ký kèm nút Thu hồi
        const bookedListContainer = document.getElementById('my-booked-services-list');
        const bookedServices = JSON.parse(localStorage.getItem('myServices')) || [];
        
        bookedListContainer.innerHTML = '';
        if (bookedServices.length === 0) {
            bookedListContainer.innerHTML = '<li>Chưa có dịch vụ nào được đăng ký.</li>';
        } else {
            bookedServices.forEach((item, index) => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                li.style.background = '#f8fafc';
                li.style.padding = '8px 12px';
                li.style.borderRadius = '6px';
                li.style.border = '1px solid var(--border-color)';

                const spanInfo = document.createElement('span');
                spanInfo.textContent = `${item.name} (Đăng ký ngày: ${item.date})`;
                
                const btnCancelService = document.createElement('button');
                btnCancelService.textContent = 'Thu hồi';
                btnCancelService.style.padding = '4px 10px';
                btnCancelService.style.backgroundColor = '#ef4444';
                btnCancelService.style.color = '#ffffff';
                btnCancelService.style.border = 'none';
                btnCancelService.style.borderRadius = '4px';
                btnCancelService.style.fontSize = '0.85rem';
                btnCancelService.style.cursor = 'pointer';

                btnCancelService.addEventListener('click', function() {
                    if (confirm(`Bạn có chắc chắn muốn thu hồi dịch vụ "${item.name}" không?`)) {
                        bookedServices.splice(index, 1);
                        localStorage.setItem('myServices', JSON.stringify(bookedServices));
                        loadProfileData();
                        alert("Đã thu hồi dịch vụ thành công!");
                    }
                });

                li.appendChild(spanInfo);
                li.appendChild(btnCancelService);
                bookedListContainer.appendChild(li);
            });
        }
    }

    loadProfileData();

    btnEdit.addEventListener('click', function() {
        inputFullname.value = dispFullname.textContent !== 'Chưa cập nhật' ? dispFullname.textContent : '';
        inputPhone.value = dispPhone.textContent !== 'Chưa cập nhật' ? dispPhone.textContent : '';
        inputDob.value = dispDob.textContent !== 'Chưa cập nhật' ? dispDob.textContent : '';
        inputAddress.value = dispAddress.textContent !== 'Chưa cập nhật' ? dispAddress.textContent : '';

        profileDisplay.classList.add('hidden');
        profileForm.classList.remove('hidden');
    });

    btnCancel.addEventListener('click', function() {
        profileForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');
    });

    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const newData = {
            fullname: inputFullname.value,
            phone: inputPhone.value,
            dob: inputDob.value,
            address: inputAddress.value
        };

        localStorage.setItem('khachHangProfile', JSON.stringify(newData));
        loadProfileData();

        profileForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');

        alert("✅ Cập nhật thông tin cá nhân thành công!");
    });


    /* =========================================================
       PHẦN 2: XỬ LÝ 9 DỊCH VỤ CHI TIẾT
       ========================================================= */
    const serviceData = {
        'tam-be': {
            name: "Tắm & Massage Bé Sơ Sinh",
            desc: "Dịch vụ chăm sóc toàn diện cho bé yêu trong những năm tháng đầu đời ngay tại nhà dưới sự hỗ trợ của điều dưỡng viên.",
            benefits: ["Kiểm tra sức khỏe tổng quát và vệ sinh rốn, mắt, mũi, tai.", "Massage kích thích tiêu hóa, giúp bé ngủ sâu giấc.", "Tắm nước ấm pha thảo dược an toàn."]
        },
        'me-sau-sinh': {
            name: "Chăm Sóc Phục Hồi Mẹ Sau Sinh",
            desc: "Liệu trình chăm sóc sức khỏe và sắc đẹp chuyên sâu giúp mẹ nhanh chóng lấy lại vóc dáng và làm dịu cơn đau nhức.",
            benefits: ["Massage body giảm đau mỏi lưng, cổ, vai, gáy.", "Xông hơi thảo dược giải độc cơ thể.", "Hỗ trợ quấn bụng định hình vóc dáng."]
        },
        'thong-sua': {
            name: "Thông Tắc Tia Sữa Chuyên Sâu",
            desc: "Giải pháp nhanh chóng và không đau giúp khơi thông nguồn sữa mẹ, phòng ngừa viêm tuyến vú.",
            benefits: ["Ứng dụng công nghệ sóng siêu âm hiện đại.", "Kỹ thuật day ấn huyệt chuyên nghiệp.", "Tư vấn dinh dưỡng và cách cho con bú đúng cách."]
        },
        'boi-thuy-lieu': {
            name: "Bơi Thủy Liệu (Hydrotherapy)",
            desc: "Phương pháp vận động dưới nước hiện đại giúp bé phát triển thể chất toàn diện từ giai đoạn sớm.",
            benefits: ["Tăng cường sự cứng cáp cho hệ cơ xương khớp.", "Kích thích tuần hoàn máu và hệ hô hấp.", "Giúp bé tự tin, mạnh dạn và ăn ngon miệng hơn."]
        },
        'massage-bau': {
            name: "Massage Bầu Thư Giãn",
            desc: "Liệu pháp chăm sóc đặc biệt dành riêng cho mẹ bầu nhằm xua tan mệt mỏi và phù nề thai kỳ.",
            benefits: ["Giảm đau nhức vùng thắt lưng và bắp chân.", "Cải thiện chất lượng giấc ngủ cho mẹ bầu.", "Tăng cường tuần hoàn máu nuôi dưỡng thai nhi tốt hơn."]
        },
        'kham-nhi': {
            name: "Khám Sức Khỏe Trẻ Sơ Sinh",
            desc: "Bác sĩ chuyên khoa nhi trực tiếp thăm khám định kỳ và tư vấn sức khỏe cho bé tại nhà.",
            benefits: ["Đánh giá biểu đồ tăng trưởng cân nặng và chiều cao.", "Tư vấn tiêm chủng và phác đồ chăm sóc khoa học.", "Phát hiện sớm các dấu hiệu bệnh lý thông thường."]
        },
        'dinh-duong': {
            name: "Tư Vấn Dinh Dưỡng Ăn Dặm",
            desc: "Xây dựng thực đơn ăn dặm khoa học, phù hợp với hệ tiêu hóa và sự phát triển từng tháng tuổi của bé.",
            benefits: ["Lên thực đơn chi tiết theo phương pháp hiện đại.", "Hướng dẫn chế biến đồ ăn dặm giàu dưỡng chất.", "Tư vấn xử lý tình trạng biếng ăn sinh lý ở trẻ."]
        },
        'xong-hoi': {
            name: "Xông Hơi Phục Hồi Sau Sinh",
            desc: "Liệu pháp xông hơi thảo mộc tự nhiên giúp mẹ thư giãn tinh thần và làm đẹp da.",
            benefits: ["Đào thải độc tố qua tuyến mồ hôi hiệu quả.", "Làm sạch lỗ chân lông và sáng hồng làn da.", "Giảm nhanh các triệu chứng cảm mạo sau sinh."]
        },
        'bao-mau': {
            name: "Thuê Bảo Mẫu Chăm Trẻ",
            desc: "Dịch vụ cung cấp người chăm trẻ tận tâm, giàu kinh nghiệm giúp bố mẹ thảnh thơi thời gian.",
            benefits: ["Hỗ trợ trông nom, cho bé ăn và chơi cùng bé an toàn.", "Nhân sự được kiểm tra lý lịch và đào tạo bài bản.", "Linh hoạt thời gian theo giờ hoặc theo ca."]
        }
    };

    let currentServiceKey = '';
    const servicesListView = document.getElementById('services-list-view');
    const serviceDetailView = document.getElementById('service-detail-view');
    const btnBack = document.getElementById('btn-back');
    const btnBookService = document.getElementById('btn-book-service');

    const detailButtons = document.querySelectorAll('.btn-detail-trigger');
    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const serviceKey = this.getAttribute('data-service');
            currentServiceKey = serviceKey;
            const data = serviceData[serviceKey];
            
            if (data) {
                document.getElementById('detail-title').textContent = data.name;
                document.getElementById('detail-description').textContent = data.desc;
                
                const benefitsList = document.getElementById('detail-benefits');
                benefitsList.innerHTML = '';
                data.benefits.forEach(benefit => {
                    const li = document.createElement('li');
                    li.textContent = benefit;
                    benefitsList.appendChild(li);
                });

                servicesListView.classList.add('hidden');
                serviceDetailView.classList.remove('hidden');
            }
        });
    });

    btnBack.addEventListener('click', function() {
        serviceDetailView.classList.add('hidden');
        servicesListView.classList.remove('hidden');
    });

    btnBookService.addEventListener('click', function() {
        const data = serviceData[currentServiceKey];
        if (data) {
            alert(" Chúc mừng bạn đã đăng ký thành công dịch vụ: " + data.name + "!");
            
            let booked = JSON.parse(localStorage.getItem('myServices')) || [];
            booked.push({ name: data.name, date: new Date().toLocaleDateString() });
            localStorage.setItem('myServices', JSON.stringify(booked));

            loadProfileData();

            serviceDetailView.classList.add('hidden');
            servicesListView.classList.remove('hidden');
        }
    });

});