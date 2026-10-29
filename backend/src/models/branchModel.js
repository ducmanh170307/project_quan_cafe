const { sql, connectDB } = require('../config/db');

const getAllBranches = async () => {
    const pool = await connectDB();
    const result = await pool.request().query(`
        SELECT cn.*, 
               ISNULL((SELECT SUM(TongPhaiTra) FROM DonHang dh WHERE dh.MaChiNhanh = cn.MaChiNhanh AND dh.TrangThaiThanhToan = 'paid'), 0) AS DoanhThuChiNhanh,
               (SELECT COUNT(*) FROM NhanVien nv WHERE nv.MaChiNhanh = cn.MaChiNhanh AND nv.TrangThai = 'active') AS SoNhanVien
        FROM ChiNhanh cn
        ORDER BY cn.MaChiNhanh ASC
    `);
    return result.recordset;
};

const createBranch = async (TenChiNhanh, DiaChi, SoDienThoai) => {
    const pool = await connectDB();
    await pool.request()
        .input('Ten', sql.NVarChar, TenChiNhanh)
        .input('DiaChi', sql.NVarChar, DiaChi)
        .input('SDT', sql.VarChar, SoDienThoai)
        .query(`
            DECLARE @NewOut TABLE (ID INT);
            INSERT INTO ChiNhanh (TenChiNhanh, DiaChi, SoDienThoai, TrangThai)
            OUTPUT INSERTED.MaChiNhanh INTO @NewOut
            VALUES (@Ten, @DiaChi, @SDT, 'open');
            
            DECLARE @NewBranchID INT = (SELECT ID FROM @NewOut);
            INSERT INTO TonKhoChiNhanh (MaChiNhanh, MaNguyenLieu, SoLuongTon, MucTonToiThieu)
            SELECT @NewBranchID, MaNguyenLieu, 2000, 200 FROM NguyenLieu;
        `);
};

const updateBranchStatus = async (MaChiNhanh, TrangThai) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaCN', sql.Int, MaChiNhanh)
        .input('TrangThai', sql.VarChar, TrangThai)
        .query(`UPDATE ChiNhanh SET TrangThai = @TrangThai WHERE MaChiNhanh = @MaCN`);
};

module.exports = { getAllBranches, createBranch, updateBranchStatus };