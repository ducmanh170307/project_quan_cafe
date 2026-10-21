const branchModel = require('../models/branchModel');

const getBranches = async (req, res) => {
    try {
        const branches = await branchModel.getAllBranches();
        res.json({ success: true, branches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const manageBranch = async (req, res) => {
    const { action, MaChiNhanh, TenChiNhanh, DiaChi, SoDienThoai, TrangThai } = req.body;
    try {
        if (action === 'create') {
            await branchModel.createBranch(TenChiNhanh, DiaChi, SoDienThoai);
            return res.json({ success: true, message: '🏢 Đã khai trương Chi nhánh mới và khởi tạo kho thành công!' });
        } else if (action === 'status') {
            await branchModel.updateBranchStatus(MaChiNhanh, TrangThai);
            return res.json({ success: true, message: `✅ Đã cập nhật trạng thái chi nhánh sang [${TrangThai}]!` });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getBranches, manageBranch };