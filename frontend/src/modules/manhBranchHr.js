/* ==========================================================================
   [PHẦN CỦA TRẦN ĐỨC MẠNH - NHÓM TRƯỞNG]
   LUỒNG 0 (QUẢN TRỊ CHUỖI CHI NHÁNH) & LUỒNG 1 (NHÂN SỰ, PHÂN CA & CHẤM CÔNG)
   ========================================================================== */
const ManhModule = {
    currentBranchId: 1,
    currentRole: 'ADMIN',
    branches: [
        { id: 1, name: 'Chi nhánh Cầu Giấy - Hà Nội', address: '122 Cầu Giấy, Hà Nội', phone: '0988111222', status: 'open' },
        { id: 2, name: 'Chi nhánh Hà Đông - Hà Nội', address: '45 Nguyễn Trãi, Hà Đông', phone: '0988333444', status: 'open' },
        { id: 3, name: 'Chi nhánh Quận 1 - TP.HCM', address: '10 Nguyễn Huệ, Quận 1', phone: '0988555666', status: 'open' }
    ],
    staffByBranch: {
        1: ['Nguyễn Quản Lý (Cầu Giấy)', 'Trần Thu Ngân (Cầu Giấy)', 'Lê Barista (Cầu Giấy)'],
        2: ['Phạm Quản Lý (Hà Đông)', 'Hoàng Thu Ngân (Hà Đông)', 'Vũ Barista (Hà Đông)'],
        3: ['Đặng Quản Lý (Quận 1)', 'Bùi Thu Ngân (Quận 1)', 'Đỗ Barista (Quận 1)']
    },
    schedules: [],
    attendances: [],

    async init() {
        const apiBranches = await ApiClient.get('/branches');
        if (apiBranches && Array.isArray(apiBranches) && apiBranches.length > 0) {
            this.branches = apiBranches.map(b => ({
                id: b.MaChiNhanh,
                name: b.TenChiNhanh,
                address: b.DiaChi,
                phone: b.SoDienThoai,
                status: b.TrangThai || 'open'
            }));
        }
        this.renderBranches();
        this.loadStaffDropdowns();
    },

    switchTab(tabId, btnEl) {
        document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        btnEl.classList.add('active');
    },

    onBranchChange() {
        const select = document.getElementById('globalBranchSelect');
        this.currentBranchId = Number(select.value);
        const branchName = select.options[select.selectedIndex].text;
        document.getElementById('headerBranchInfo').innerText = `Đang quản lý: ${branchName} • Trạng thái: OPEN`;
        document.querySelectorAll('.current-branch-name').forEach(el => el.innerText = branchName);
        this.loadStaffDropdowns();
    },

    onRoleChange() {
        this.currentRole = document.getElementById('globalRoleSelect').value;
        const btnAssign = document.getElementById('btnAssignShift');
        btnAssign.disabled = (this.currentRole !== 'ADMIN');
        btnAssign.style.opacity = (this.currentRole === 'ADMIN') ? '1' : '0.4';
    },

    renderBranches() {
        const tbody = document.getElementById('branchTableBody');
        tbody.innerHTML = this.branches.map(b => `
            <tr>
                <td>#${b.id}</td>
                <td><b>${b.name}</b></td>
                <td>${b.address}</td>
                <td>${b.phone}</td>
                <td><span class="badge-open">${b.status.toUpperCase()}</span></td>
            </tr>
        `).join('');
    },

    async createBranch() {
        const name = document.getElementById('branchName').value.trim();
        const phone = document.getElementById('branchPhone').value.trim();
        const address = document.getElementById('branchAddress').value.trim();

        if (!name || !address) {
            alert('Vui lòng nhập đầy đủ Tên và Địa chỉ chi nhánh!');
            return;
        }
        // Kiểm tra Regex SĐT theo đúng TC08 của Mạnh
        if (!/^0[0-9]{9,10}$/.test(phone)) {
            alert('Lỗi (TC08): Số điện thoại không hợp lệ (chỉ gồm 10-11 chữ số)!');
            return;
        }

        await ApiClient.post('/branches', { TenChiNhanh: name, DiaChi: address, SoDienThoai: phone });

        const newId = this.branches.length + 1;
        this.branches.push({ id: newId, name, address, phone, status: 'open' });
        this.staffByBranch[newId] = [
            `Nguyễn Quản Lý (${name})`,
            `Trần Thu Ngân (${name})`,
            `Lê Barista (${name})`
        ];
        document.getElementById('globalBranchSelect').innerHTML += `<option value="${newId}">${name}</option>`;
        this.renderBranches();
        alert(`Đã mở "${name}" thành công!\nTự động khởi tạo 2000 đơn vị tồn kho (tối thiểu 200) và nhân sự mẫu.`);
    },

    loadStaffDropdowns() {
        const list = this.staffByBranch[this.currentBranchId] || [
            'Nguyễn Quản Lý (Mặc định)',
            'Trần Thu Ngân (Mặc định)',
            'Lê Barista (Mặc định)'
        ];
        const options = list.map(name => `<option value="${name}">${name}</option>`).join('');
        document.getElementById('scheduleStaffSelect').innerHTML = options;
        document.getElementById('attendanceStaffSelect').innerHTML = options;
    },

    async assignShift() {
        const staff = document.getElementById('scheduleStaffSelect').value;
        const shift = document.getElementById('scheduleShiftName').value;
        const pos = document.getElementById('schedulePosition').value;

        // Chặn xếp trùng ca trong ngày theo đúng TC11 của Mạnh
        const isDup = this.schedules.some(s => s.staff === staff && s.shift === shift && s.branchId === this.currentBranchId);
        if (isDup) {
            alert('Lỗi (TC11): Nhân viên này đã được phân vào ca làm việc này trong ngày!');
            return;
        }

        await ApiClient.post('/hr/schedules', { branchId: this.currentBranchId, staff, shift, pos });

        this.schedules.push({ branchId: this.currentBranchId, staff, shift, pos, status: 'Đã phân ca' });
        document.getElementById('scheduleTableBody').innerHTML = this.schedules
            .filter(s => s.branchId === this.currentBranchId)
            .map(s => `
                <tr>
                    <td>${s.staff}</td>
                    <td>${s.shift}</td>
                    <td>${s.pos}</td>
                    <td><span class="badge-open">${s.status}</span></td>
                </tr>
            `).join('');
    },

    async checkIn() {
        const staff = document.getElementById('attendanceStaffSelect').value;
        const method = document.getElementById('attendanceMethod').value;
        const now = new Date().toLocaleTimeString('vi-VN');

        await ApiClient.post('/hr/attendance', { staff, action: 'CHECK_IN', method });

        this.attendances.push({ staff, checkIn: now, checkOut: '--:--', method, status: 'Đang làm việc (Đúng giờ)' });
        this.renderAttendance();
    },

    async checkOut() {
        const staff = document.getElementById('attendanceStaffSelect').value;
        const record = this.attendances.find(a => a.staff === staff && a.checkOut === '--:--');
        if (!record) {
            alert('Nhân viên này chưa thực hiện Check-in vào ca!');
            return;
        }

        await ApiClient.post('/hr/attendance', { staff, action: 'CHECK_OUT' });

        record.checkOut = new Date().toLocaleTimeString('vi-VN');
        record.status = 'Hoàn thành ca (5.0 giờ)';
        this.renderAttendance();
    },

    renderAttendance() {
        document.getElementById('attendanceTableBody').innerHTML = this.attendances.map(a => `
            <tr>
                <td>${a.staff}</td>
                <td>${a.checkIn}</td>
                <td>${a.checkOut}</td>
                <td>${a.method}</td>
                <td><span class="badge-open">${a.status}</span></td>
            </tr>
        `).join('');
    }
};