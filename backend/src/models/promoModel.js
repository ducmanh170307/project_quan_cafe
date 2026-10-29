const { sql, connectDB } = require('../config/db');

const insertPromotion = async (MaCode, TenChuongTrinh, LoaiKhuyenMai, GiaTriGiam, DonToiThieu) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaCode', sql.VarChar, MaCode.toUpperCase())
        .input('Ten', sql.NVarChar, TenChuongTrinh)
        .input('Loai', sql.VarChar, LoaiKhuyenMai)
        .input('GiaTri', sql.Decimal(12,2), GiaTriGiam)
        .input('ToiThieu', sql.Decimal(12,2), DonToiThieu || 0)
        .query(`
            INSERT INTO KhuyenMai (MaCode, TenChuongTrinh, LoaiKhuyenMai, GiaTriGiam, DonToiThieu, NgayBatDau, NgayKetThuc, TrangThai)
            VALUES (@MaCode, @Ten, @Loai, @GiaTri, @ToiThieu, GETDATE(), DATEADD(month, 3, GETDATE()), 'active')
        `);
};

module.exports = { insertPromotion };