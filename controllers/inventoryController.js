const inventoryModel = require('../models/inventoryModel');

const importInventory = async (req, res) => {
    const { MaChiNhanh, MaNguyenLieu, SoLuongNhap, DonGiaNhap, Action, TuChiNhanh, DenChiNhanh } = req.body;
    const branchId = parseInt(MaChiNhanh) || 1;
    try {
        if (Action === 'transfer') {
            await inventoryModel.transferStock(TuChiNhanh, DenChiNhanh, MaNguyenLieu, SoLuongNhap);
            return res.json({ success: true, message: `🚚 Đã chuyển ${SoLuongNhap} đơn vị nguyên liệu từ Chi nhánh #${TuChiNhanh} sang Chi nhánh #${DenChiNhanh}!` });
        }
        await inventoryModel.importStock(branchId, MaNguyenLieu, SoLuongNhap, DonGiaNhap);
        res.json({ success: true, message: `📦 Nhập kho Chi nhánh #${branchId} thành công! Đã cộng tồn kho & cập nhật giá vốn bình quân.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { importInventory };