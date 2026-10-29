const { sql, connectDB } = require('../config/db');

const getHRByBranch = async (maChiNhanh) => {
    const pool = await connectDB();
    const nhanVien = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT nv.MaNhanVien, nv.MaChiNhanh, nv.HoTen, nv.SoDienThoai, nv.MaPIN, nv.LuongTheoGio, vt.TenVaiTro, cn.TenChiNhanh
            FROM NhanVien nv
            JOIN VaiTro vt ON nv.MaVaiTro = vt.MaVaiTro
            JOIN ChiNhanh cn ON nv.MaChiNhanh = cn.MaChiNhanh
            WHERE nv.MaChiNhanh = @MaCN OR @MaCN = 0
        `);
    const phanCa = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT pc.MaPhanCa, pc.MaChiNhanh, nv.HoTen, cm.TenCa, 
                   CONVERT(VARCHAR(5), cm.GioBatDau, 108) AS GioBatDau, 
                   CONVERT(VARCHAR(5), cm.GioKetThuc, 108) AS GioKetThuc, 
                   pc.NgayLamViec, pc.ViTriLamViec, pc.TrangThai, pc.GhiChu
            FROM PhanCa pc
            JOIN NhanVien nv ON pc.MaNhanVien = nv.MaNhanVien
            JOIN CaLamViecMau cm ON pc.MaCaMau = cm.MaCaMau
            WHERE pc.MaChiNhanh = @MaCN
            ORDER BY pc.MaPhanCa DESC
        `);
    const chamCong = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT cc.MaChamCong, nv.HoTen, cc.ThoiGianCheckIn, cc.ThoiGianCheckOut, cc.PhuongThuc, cc.SoPhutDiTre, cc.TrangThaiDuyet
            FROM ChamCong cc
            JOIN NhanVien nv ON cc.MaNhanVien = nv.MaNhanVien
            WHERE nv.MaChiNhanh = @MaCN
            ORDER BY cc.MaChamCong DESC
        `);
    return { nhanVien: nhanVien.recordset, phanCa: phanCa.recordset, chamCong: chamCong.recordset };
};

const assignShift = async (branchId, MaNhanVien, MaCaMau, ViTriLamViec) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaCN', sql.Int, branchId)
        .input('MaNhanVien', sql.Int, MaNhanVien)
        .input('MaCaMau', sql.Int, MaCaMau)
        .input('ViTri', sql.NVarChar, ViTriLamViec)
        .query(`INSERT INTO PhanCa (MaChiNhanh, MaCaMau, MaNhanVien, NgayLamViec, ViTriLamViec, TrangThai) VALUES (@MaCN, @MaCaMau, @MaNhanVien, CAST(GETDATE() AS DATE), @ViTri, 'scheduled')`);
};

const requestLeave = async (MaPhanCa, LyDoXinNghi) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaPhanCa', sql.Int, MaPhanCa)
        .input('GhiChu', sql.NVarChar, LyDoXinNghi || 'Xin đổi ca / nghỉ phép')
        .query(`UPDATE PhanCa SET TrangThai = 'Leave_Requested', GhiChu = @GhiChu WHERE MaPhanCa = @MaPhanCa`);
};

const approveLeave = async (MaPhanCa) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaPhanCa', sql.Int, MaPhanCa)
        .query(`UPDATE PhanCa SET TrangThai = 'Absent', GhiChu = ISNULL(GhiChu, N'') + N' (Quản lý đã duyệt)' WHERE MaPhanCa = @MaPhanCa`);
};

const checkIn = async (MaNhanVien, PhuongThuc) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaNhanVien', sql.Int, MaNhanVien)
        .input('PhuongThuc', sql.VarChar, PhuongThuc || 'App_GPS')
        .query(`INSERT INTO ChamCong (MaNhanVien, ThoiGianCheckIn, PhuongThuc) VALUES (@MaNhanVien, GETDATE(), @PhuongThuc)`);
};

const checkOut = async (MaNhanVien) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaNhanVien', sql.Int, MaNhanVien)
        .query(`UPDATE ChamCong SET ThoiGianCheckOut = GETDATE(), SoGioLamThucTe = 8 WHERE MaNhanVien = @MaNhanVien AND ThoiGianCheckOut IS NULL`);
};

module.exports = { getHRByBranch, assignShift, requestLeave, approveLeave, checkIn, checkOut };