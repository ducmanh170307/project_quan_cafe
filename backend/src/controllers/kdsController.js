const kdsModel = require('../models/kdsModel');

const getKDSOrders = async (req, res) => {
    const maChiNhanh = parseInt(req.query.branchId) || 1;
    try {
        const data = await kdsModel.getActiveKDSOrders(maChiNhanh);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateKDSStatus = async (req, res) => {
    const { MaDonHang, Action, MaPINQuanLy, LyDo } = req.body;
    try {
        if (Action === 'complete_order') {
            await kdsModel.completeOrderKDS(MaDonHang);
            return res.json({ success: true, message: '🔔 Đã hoàn tất pha chế và phát loa gọi số khách hàng!' });
        } else if (Action === 'remake_item') {
            await kdsModel.remakeItemKDS(MaDonHang);
            return res.json({ success: true, message: '🔄 Đã ghi nhận Làm lại món và trừ hao hụt nguyên liệu kho!' });
        } else if (Action === 'cancel_refund') {
            if (MaPINQuanLy !== '9999' && MaPINQuanLy !== '8888') {
                return res.status(403).json({ success: false, message: '❌ Sai Mã PIN Quản lý (Gợi ý: 9999 hoặc 8888)!' });
            }
            await kdsModel.cancelAndRefundOrder(MaDonHang, LyDo);
            return res.json({ success: true, message: '💸 Đã duyệt Hủy đơn và Hoàn tiền từ két ca hiện tại!' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getKDSOrders, updateKDSStatus };