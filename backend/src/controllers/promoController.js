const promoModel = require('../models/promoModel');

const createPromotion = async (req, res) => {
    const { MaCode, TenChuongTrinh, LoaiKhuyenMai, GiaTriGiam, DonToiThieu } = req.body;
    try {
        await promoModel.insertPromotion(MaCode, TenChuongTrinh, LoaiKhuyenMai, GiaTriGiam, DonToiThieu);
        res.json({ success: true, message: '🎁 Đã kích hoạt chương trình khuyến mãi mới và đồng bộ toàn chuỗi!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { createPromotion };