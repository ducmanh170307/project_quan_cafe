const hrModel = require('../models/hrModel');

const getHRData = async (req, res) => {
    const maChiNhanh = parseInt(req.query.branchId) || 1;
    try {
        const data = await hrModel.getHRByBranch(maChiNhanh);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const handleHRAction = async (req, res) => {
    const { action, MaChiNhanh, MaNhanVien, MaCaMau, ViTriLamViec, PhuongThuc, MaPhanCa, LyDoXinNghi, Role } = req.body;
    const branchId = parseInt(MaChiNhanh) || 1;
    try {
        if (action === 'assign_shift') {
            if (Role && !['ADMIN', 'MANAGER'].includes(Role)) {
                return res.status(403).json({ success: false, message: '⛔ Nhân viên không có quyền tự xếp ca! Chỉ Quản lý chi nhánh hoặc Chủ chuỗi mới được xếp ca.' });
            }
            await hrModel.assignShift(branchId, MaNhanVien, MaCaMau, ViTriLamViec);
            return res.json({ success: true, message: '✅ Quản lý đã xếp ca làm việc thành công!' });
        } else if (action === 'request_leave') {
            await hrModel.requestLeave(MaPhanCa, LyDoXinNghi);
            return res.json({ success: true, message: '📨 Đã gửi đơn xin đổi ca / nghỉ phép lên Quản lý chi nhánh!' });
        } else if (action === 'approve_leave') {
            await hrModel.approveLeave(MaPhanCa);
            return res.json({ success: true, message: '✅ Quản lý đã duyệt đơn xin nghỉ / đổi ca!' });
        } else if (action === 'checkin') {
            await hrModel.checkIn(MaNhanVien, PhuongThuc);
            return res.json({ success: true, message: '✅ Check-in chấm công vào ca thành công!' });
        } else if (action === 'checkout') {
            await hrModel.checkOut(MaNhanVien);
            return res.json({ success: true, message: '✅ Check-out kết thúc ca thành công!' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getHRData, handleHRAction };