const { sql, connectDB } = require('../config/db');

const transferStock = async (TuChiNhanh, DenChiNhanh, MaNguyenLieu, SoLuongNhap) => {
    const pool = await connectDB();
    await pool.request()
        .input('TuCN', sql.Int, TuChiNhanh)
        .input('DenCN', sql.Int, DenChiNhanh)
        .input('MaNL', sql.Int, MaNguyenLieu)
        .input('SL', sql.Decimal(12,2), SoLuongNhap)
        .query(`
            UPDATE TonKhoChiNhanh SET SoLuongTon = SoLuongTon - @SL WHERE MaChiNhanh = @TuCN AND MaNguyenLieu = @MaNL;
            IF EXISTS (SELECT 1 FROM TonKhoChiNhanh WHERE MaChiNhanh = @DenCN AND MaNguyenLieu = @MaNL)
                UPDATE TonKhoChiNhanh SET SoLuongTon = SoLuongTon + @SL WHERE MaChiNhanh = @DenCN AND MaNguyenLieu = @MaNL;
            ELSE
                INSERT INTO TonKhoChiNhanh (MaChiNhanh, MaNguyenLieu, SoLuongTon, MucTonToiThieu) VALUES (@DenCN, @MaNL, @SL, 100);
        `);
};

const importStock = async (branchId, MaNguyenLieu, SoLuongNhap, DonGiaNhap) => {
    const pool = await connectDB();
    await pool.request()
        .input('MaCN', sql.Int, branchId)
        .input('MaNL', sql.Int, MaNguyenLieu)
        .input('SL', sql.Decimal(12,2), SoLuongNhap)
        .input('Gia', sql.Decimal(12,2), DonGiaNhap)
        .query(`
            IF EXISTS (SELECT 1 FROM TonKhoChiNhanh WHERE MaChiNhanh = @MaCN AND MaNguyenLieu = @MaNL)
                UPDATE TonKhoChiNhanh SET SoLuongTon = SoLuongTon + @SL WHERE MaChiNhanh = @MaCN AND MaNguyenLieu = @MaNL;
            ELSE
                INSERT INTO TonKhoChiNhanh (MaChiNhanh, MaNguyenLieu, SoLuongTon, MucTonToiThieu) VALUES (@MaCN, @MaNL, @SL, 100);
            UPDATE NguyenLieu SET GiaVonBinhQuan = (@Gia + GiaVonBinhQuan) / 2 WHERE MaNguyenLieu = @MaNL;
        `);
};

module.exports = { transferStock, importStock };