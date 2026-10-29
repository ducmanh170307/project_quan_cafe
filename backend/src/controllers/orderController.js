const orderModel = require('../models/orderModel');

const getPOSInitData = async (req, res) => {
    const maChiNhanh = parseInt(req.query.branchId) || 1;
    try {
        const data = await orderModel.getInitDataByBranch(maChiNhanh);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createOrderPOS = async (req, res) => {
    const branchId = parseInt(req.body.MaChiNhanh) || 1;
    try {
        const result = await orderModel.createOrderTransaction({ ...req.body, branchId });
        if (result.error) {
            return res.status(400).json({ success: false, message: result.error });
        }
        res.json({ 
            success: true, 
            message: `🎉 Thanh toán thành công tại Chi nhánh #${branchId}! Mã đơn: ${result.maDonHienThi} - Số gọi món: #${result.soThuTu}`, 
            SoThuTu: result.soThuTu, 
            MaDonHienThi: result.maDonHienThi 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi giao dịch: ' + err.message });
    }
};

module.exports = { getPOSInitData, createOrderPOS };