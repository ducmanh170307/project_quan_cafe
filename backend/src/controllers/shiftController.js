const shiftModel = require('../models/shiftModel');

const getShiftStatus = async (req, res) => {
    const maChiNhanh = parseInt(req.query.branchId) || 1;
    try {
        const data = await shiftModel.getShiftByBranch(maChiNhanh);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const openShift = async (req, res) => {
    const { MaChiNhanh, MaPIN, TienMatDauCa, LyDoLechDauCa } = req.body;
    const branchId = parseInt(MaChiNhanh) || 1;
    try {
        const current = await shiftModel.getShiftByBranch(branchId);
        if (current.activeShift) {
            return res.status(400).json({ success: false, message: '⚠️ Chi nhánh này đang có một phiên ca mở rồi!' });
        }
        const nv = await shiftModel.verifyStaffPin(MaPIN);
        if (!nv) return res.status(400).json({ success: false, message: '❌ Mã PIN nhân viên không hợp lệ!' });

        await shiftModel.createOpenShift(branchId, nv.MaNhanVien, TienMatDauCa, LyDoLechDauCa);
        res.json({ success: true, message: `🎉 Mở ca thành công tại Chi nhánh #${branchId}! Thu ngân: ${nv.HoTen}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createInternalCashFlow = async (req, res) => {
    const { MaPhienCa, LoaiPhieu, SoTien, LyDo } = req.body;
    try {
        await shiftModel.addCashFlow(MaPhienCa, LoaiPhieu, SoTien, LyDo);
        res.json({ success: true, message: `✅ Đã ghi nhận phiếu ${LoaiPhieu} nội bộ thành công!` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const closeShift = async (req, res) => {
    const { MaPhienCa, TienMatThucTeCuoiCa, LyDoChenhLechCuoiCa } = req.body;
    try {
        const pendingCount = await shiftModel.countPendingOrdersInShift(MaPhienCa);
        if (pendingCount > 0) {
            return res.status(400).json({ success: false, message: `⚠️ Còn ${pendingCount} đơn đang pha chế chưa hoàn tất! Hãy xử lý hết ở màn hình KDS trước khi đóng ca.` });
        }
        await shiftModel.closeShiftRecord(MaPhienCa, TienMatThucTeCuoiCa, LyDoChenhLechCuoiCa);
        res.json({ success: true, message: '🔒 Đã chốt ca và khóa sổ két thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getShiftStatus, openShift, createInternalCashFlow, closeShift };