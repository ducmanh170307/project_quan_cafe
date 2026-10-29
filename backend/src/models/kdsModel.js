const { sql, connectDB } = require('../config/db');

const getActiveKDSOrders = async (maChiNhanh) => {
    const pool = await connectDB();
    const orders = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT dh.MaDonHang, dh.MaDonHienThi, dh.SoThuTuGoiMon, dh.KenhBan, dh.HinhThucNhan, dh.ThoiGianDat, dh.TrangThaiDonHang, dh.TongPhaiTra,
                   ct.MaChiTietDon, ct.TenSanPhamLuuTru, ct.TenSize, ct.SoLuong, ct.MucDuong, ct.MucDa, ct.GhiChuMon, ct.TrangThaiPhaChe, ct.SoLanLamLai
            FROM DonHang dh
            JOIN ChiTietDonHang ct ON dh.MaDonHang = ct.MaDonHang
            WHERE dh.TrangThaiDonHang IN ('Confirmed', 'Preparing', 'Ready') AND dh.MaChiNhanh = @MaCN
            ORDER BY dh.ThoiGianDat ASC
        `);
    return orders.recordset;
};

const completeOrderKDS = async (MaDonHang) => {
    const pool = await connectDB();
    await pool.request().input('MaDonHang', sql.Int, MaDonHang).query(`
        UPDATE ChiTietDonHang SET TrangThaiPhaChe = 'Done' WHERE MaDonHang = @MaDonHang;
        UPDATE DonHang SET TrangThaiDonHang = 'Completed' WHERE MaDonHang = @MaDonHang;
    `);
};

const remakeItemKDS = async (MaDonHang) => {
    const pool = await connectDB();
    await pool.request().input('MaDonHang', sql.Int, MaDonHang).query(`
        UPDATE ChiTietDonHang SET SoLanLamLai = SoLanLamLai + 1, TrangThaiPhaChe = 'Remake' WHERE MaDonHang = @MaDonHang;
        UPDATE TonKhoChiNhanh SET SoLuongTon = SoLuongTon - 1 WHERE MaChiNhanh = (SELECT MaChiNhanh FROM DonHang WHERE MaDonHang = @MaDonHang) AND MaNguyenLieu = 7;
    `);
};

const cancelAndRefundOrder = async (MaDonHang, LyDo) => {
    const pool = await connectDB();
    const dh = await pool.request().input('MaDonHang', sql.Int, MaDonHang)
        .query(`SELECT MaPhienCa, TongPhaiTra FROM DonHang WHERE MaDonHang = @MaDonHang`);
    
    if (dh.recordset.length > 0 && dh.recordset[0].MaPhienCa) {
        await pool.request()
            .input('MaPhienCa', sql.Int, dh.recordset[0].MaPhienCa)
            .input('TienHoan', sql.Decimal(14,2), dh.recordset[0].TongPhaiTra)
            .query(`UPDATE PhienCaPOS SET TongHoanTienMat = TongHoanTienMat + @TienHoan WHERE MaPhienCa = @MaPhienCa`);
    }
    await pool.request()
        .input('MaDonHang', sql.Int, MaDonHang)
        .input('LyDo', sql.NVarChar, LyDo || 'Khách yêu cầu hủy')
        .query(`UPDATE DonHang SET TrangThaiDonHang = 'Cancelled', TrangThaiThanhToan = 'refunded', LyDoHuyHoan = @LyDo WHERE MaDonHang = @MaDonHang`);
};

module.exports = { getActiveKDSOrders, completeOrderKDS, remakeItemKDS, cancelAndRefundOrder };