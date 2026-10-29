/* ==========================================================================
   [PHẦN CỦA Ý - THÀNH VIÊN 2]
   LUỒNG 2 (MỞ CA POS & THU/CHI NỘI BỘ) & LUỒNG 5 (ĐÓNG CA ĐỐI SOÁT KÉT TIỀN)
   ========================================================================== */
const YModule = {
    theoreticalMoney: 1000000,

    async openShift() {
        const money = Number(document.getElementById('openShiftMoney').value);
        // Kiểm tra biên chặn số âm theo đúng TC15 của Ý
        if (money < 0 || isNaN(money)) {
            alert('Lỗi (TC15): Tiền đầu ca không được nhỏ hơn 0!');
            return;
        }

        await ApiClient.post('/shifts/open', {
            MaChiNhanh: ManhModule.currentBranchId,
            TienDauCa: money
        });

        this.theoreticalMoney = money;
        document.getElementById('theoreticalCash').value = this.theoreticalMoney;
        const badge = document.getElementById('globalShiftBadge');
        badge.className = 'shift-badge shift-open';
        badge.innerHTML = '<span>🟢 ĐANG MỞ CA POS</span>';
        alert(`Mở ca POS thành công với tiền mặt đầu ca: ${money.toLocaleString()} đ`);
    },

    async createCashflow() {
        const type = document.getElementById('cashflowType').value;
        const amount = Number(document.getElementById('cashflowAmount').value);
        const reason = document.getElementById('cashflowReason').value.trim();

        if (amount <= 0 || isNaN(amount)) {
            alert('Vui lòng nhập số tiền thu/chi lớn hơn 0!');
            return;
        }

        await ApiClient.post('/shifts/cashflow', {
            LoaiPhieu: type,
            SoTien: amount,
            LyDo: reason
        });

        this.theoreticalMoney += (type === 'THU' ? amount : -amount);
        document.getElementById('theoreticalCash').value = this.theoreticalMoney;
        alert(`Đã ghi nhận phiếu ${type} nội bộ (${amount.toLocaleString()} đ) - Lý do: ${reason || 'Chi vận hành ca'}`);
    },

    async closeShift() {
        const actual = Number(document.getElementById('actualCash').value);
        if (isNaN(actual) || actual < 0) {
            alert('Vui lòng nhập số tiền thực đếm hợp lệ!');
            return;
        }

        const diff = actual - this.theoreticalMoney;
        await ApiClient.post('/shifts/close', {
            TienLyThuyet: this.theoreticalMoney,
            TienThucDem: actual,
            ChenhLech: diff
        });

        const resultEl = document.getElementById('shiftReconcileResult');
        resultEl.style.color = diff < 0 ? '#ef4444' : '#22c55e';
        resultEl.innerText = `📊 Đối soát két (TC17): Tiền lý thuyết = ${this.theoreticalMoney.toLocaleString()}đ | Tiền thực đếm = ${actual.toLocaleString()}đ | Độ lệch két = ${diff.toLocaleString()}đ`;

        const badge = document.getElementById('globalShiftBadge');
        badge.className = 'shift-badge shift-closed';
        badge.innerHTML = '<span>🔴 ĐÃ ĐÓNG CA POS</span>';
    }
};