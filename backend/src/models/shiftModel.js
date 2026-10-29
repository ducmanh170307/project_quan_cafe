const { sql, connectDB } = require('../config/db');

const getShiftByBranch = async (maChiNhanh) => {
    const pool = await connectDB();
    const activeShift = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT pc.*, nv.HoTen AS TenThuNgan, cn.TenChiNhanh
            FROM PhienCaPOS pc
            JOIN NhanVien nv ON pc.ThuNganMoCa = nv.MaNhanVien
            JOIN ChiNhanh cn ON pc.MaChiNhanh = cn.MaChiNhanh
            WHERE pc.TrangThai = 'open' AND pc.MaChiNhanh = @MaCN
        `);
    const historyShifts = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT TOP 6 pc.*, nv.HoTen AS TenThuNgan
            FROM PhienCaPOS pc
            JOIN NhanVien nv ON pc.ThuNganMoCa = nv.MaNhanVien
            WHERE pc.MaChiNhanh = @MaCN
            ORDER BY pc.MaPhienCa DESC
        `);
    return { activeShift: activeShift.recordset[0] || null, historyShifts: historyShifts.recordset };
};

const verifyStaffPin = async (MaPIN) => {
    const pool = await connectDB();
    const nv = await pool.request()
        .input('MaPIN', sql.VarChar, MaPIN)
        .query(`SELECT MaNhanVien, HoTen FROM NhanVien WHERE MaPIN = @MaPIN AND TrangThai = 'active'`);
    return nv.recordset[0] || null;
};

const createOpenShift = async (branchId, maNhanVien, TienMatDauCa, LyDoLechDauCa) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaCN', sql.Int, branchId)
        .input('ThuNgan', sql.Int, maNhanVien)
        .input('TienDauCa', sql.Decimal(14,2), TienMatDauCa)
        .input('LyDo', sql.NVarChar, LyDoLechDauCa || 'Khớp ca trước')
        .query(`
            INSERT INTO PhienCaPOS (MaMayPOS, MaChiNhanh, ThuNganMoCa, TienMatDauCa, LyDoLechDauCa, TrangThai)
            VALUES (1, @MaCN, @ThuNgan, @TienDauCa, @LyDo, 'open');
            UPDATE ChiNhanh SET TrangThai = 'open' WHERE MaChiNhanh = @MaCN;
        `);
};

const addCashFlow = async (MaPhienCa, LoaiPhieu, SoTien, LyDo) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaPhienCa', sql.Int, MaPhienCa)
        .input('Loai', sql.VarChar, LoaiPhieu)
        .input('SoTien', sql.Decimal(14,2), SoTien)
        .input('LyDo', sql.NVarChar, LyDo)
        .query(`
            INSERT INTO PhieuThuChiNoiBo (MaPhienCa, LoaiPhieu, SoTien, LyDo, NguoiTao)
            VALUES (@MaPhienCa, @Loai, @SoTien, @LyDo, 3);
            IF @Loai = 'THU'
                UPDATE PhienCaPOS SET TongThuNoiBo = TongThuNoiBo + @SoTien WHERE MaPhienCa = @MaPhienCa;
            ELSE
                UPDATE PhienCaPOS SET TongChiNoiBo = TongChiNoiBo + @SoTien WHERE MaPhienCa = @MaPhienCa;
        `);
};

const countPendingOrdersInShift = async (MaPhienCa) => {
    const pool = await connectDB();
    const res = await pool.request()
        .input('MaPhienCa', sql.Int, MaPhienCa)
        .query(`SELECT COUNT(*) AS Total FROM DonHang WHERE MaPhienCa = @MaPhienCa AND TrangThaiDonHang IN ('Pending_Payment', 'Confirmed', 'Preparing')`);
    return res.recordset[0].Total;
};

const closeShiftRecord = async (MaPhienCa, TienMatThucTeCuoiCa, LyDoChenhLechCuoiCa) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaPhienCa', sql.Int, MaPhienCa)
        .input('TienThucTe', sql.Decimal(14,2), TienMatThucTeCuoiCa)
        .input('LyDo', sql.NVarChar, LyDoChenhLechCuoiCa || 'Khớp két')
        .query(`
            UPDATE PhienCaPOS 
            SET ThoiGianDong = GETDATE(),
                ThuNganDongCa = ThuNganMoCa,
                TienMatThucTeCuoiCa = @TienThucTe,
                TienChenhLech = @TienThucTe - (TienMatDauCa + TongThuTienMat - TongHoanTienMat + TongThuNoiBo - TongChiNoiBo),
                LyDoChenhLechCuoiCa = @LyDo,
                TrangThai = 'closed'
            WHERE MaPhienCa = @MaPhienCa
        `);
};

module.exports = { getShiftByBranch, verifyStaffPin, createOpenShift, addCashFlow, countPendingOrdersInShift, closeShiftRecord };