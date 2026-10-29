const { sql, connectDB } = require('../config/db');

const getInitDataByBranch = async (maChiNhanh) => {
    const pool = await connectDB();
    const products = await pool.request().query(`
        SELECT sp.MaSanPham, sp.MaDanhMuc, sp.TenSanPham, sp.GiaBanCoBan AS GiaBan, sp.TramPhaChe, sp.TrangThai, dm.TenDanhMuc 
        FROM SanPham sp JOIN DanhMuc dm ON sp.MaDanhMuc = dm.MaDanhMuc 
        WHERE sp.TrangThai != 'hidden'
    `);
    const promos = await pool.request().query(`SELECT * FROM KhuyenMai ORDER BY MaKhuyenMai DESC`);
    const inventory = await pool.request()
        .input('MaCN', sql.Int, maChiNhanh)
        .query(`
            SELECT nl.MaNguyenLieu, nl.TenNguyenLieu, nl.DonViTinh, nl.GiaVonBinhQuan, 
                   ISNULL(tk.SoLuongTon, 0) AS SoLuongTon, ISNULL(tk.MucTonToiThieu, 100) AS MucTonToiThieu
            FROM NguyenLieu nl
            LEFT JOIN TonKhoChiNhanh tk ON nl.MaNguyenLieu = tk.MaNguyenLieu AND tk.MaChiNhanh = @MaCN
        `);
    const customers = await pool.request().query(`SELECT * FROM KhachHang ORDER BY DiemTichLuy DESC`);
    return {
        products: products.recordset,
        promos: promos.recordset,
        inventory: inventory.recordset,
        customers: customers.recordset
    };
};

const createOrderTransaction = async (orderData) => {
    const { branchId, MaPhienCa, KenhBan, HinhThucNhan, SoDienThoaiKhach, DiaChiGiaoHang, TienGiamGia, TongTienHang, TongPhaiTra, PhuongThucThanhToan, TienKhachDua, Items } = orderData;
    const pool = await connectDB();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        if (KenhBan === 'APP') {
            const cnCheck = await new sql.Request(transaction).input('MaCN', sql.Int, branchId)
                .query(`SELECT TrangThai, TenChiNhanh FROM ChiNhanh WHERE MaChiNhanh = @MaCN`);
            if (cnCheck.recordset.length > 0 && cnCheck.recordset[0].TrangThai !== 'open') {
                await transaction.rollback();
                return { error: `⚠️ ${cnCheck.recordset[0].TenChiNhanh} hiện đang [${cnCheck.recordset[0].TrangThai}] (Đóng cửa hoặc Quá tải), tạm ngưng nhận đơn Online!` };
            }
        }

        let maKhachHang = null;
        if (SoDienThoaiKhach) {
            const kh = await new sql.Request(transaction).input('SDT', sql.VarChar, SoDienThoaiKhach)
                .query(`SELECT MaKhachHang FROM KhachHang WHERE SoDienThoai = @SDT`);
            if (kh.recordset.length > 0) {
                maKhachHang = kh.recordset[0].MaKhachHang;
                await new sql.Request(transaction)
                    .input('MaKH', sql.Int, maKhachHang)
                    .input('Diem', sql.Int, Math.floor(TongPhaiTra / 10000))
                    .input('ChiTieu', sql.Decimal(14,2), TongPhaiTra)
                    .query(`
                        UPDATE KhachHang 
                        SET DiemTichLuy = DiemTichLuy + @Diem, 
                            TongChiTieu = TongChiTieu + @ChiTieu,
                            HangThanhVien = CASE WHEN (TongChiTieu + @ChiTieu) >= 3000000 THEN 'Gold' WHEN (TongChiTieu + @ChiTieu) >= 1000000 THEN 'Silver' ELSE 'Member' END
                        WHERE MaKhachHang = @MaKH
                    `);
            } else {
                const newKh = await new sql.Request(transaction)
                    .input('SDT', sql.VarChar, SoDienThoaiKhach)
                    .input('Diem', sql.Int, Math.floor(TongPhaiTra / 10000))
                    .input('ChiTieu', sql.Decimal(14,2), TongPhaiTra)
                    .query(`INSERT INTO KhachHang (SoDienThoai, HoTen, DiemTichLuy, TongChiTieu) OUTPUT INSERTED.MaKhachHang VALUES (@SDT, N'Khách Hội Viên Mới', @Diem, @ChiTieu)`);
                maKhachHang = newKh.recordset[0].MaKhachHang;
            }
        }

        const countRes = await new sql.Request(transaction).query(`SELECT COUNT(*) AS Cnt FROM DonHang`);
        const soThuTu = 101 + countRes.recordset[0].Cnt;
        const maDonHienThi = (KenhBan === 'APP' ? 'ONL' : 'POS') + Date.now().toString().slice(-5);

        const orderRes = await new sql.Request(transaction)
            .input('MaDonHienThi', sql.VarChar, maDonHienThi)
            .input('SoThuTu', sql.Int, soThuTu)
            .input('MaCN', sql.Int, branchId)
            .input('MaPhienCa', sql.Int, MaPhienCa || null)
            .input('MaKH', sql.Int, maKhachHang)
            .input('KenhBan', sql.VarChar, KenhBan || 'POS')
            .input('HinhThuc', sql.VarChar, HinhThucNhan || 'Dine_In')
            .input('DiaChi', sql.NVarChar, DiaChiGiaoHang || '')
            .input('TongTienHang', sql.Decimal(14,2), TongTienHang)
            .input('TienGiamGia', sql.Decimal(14,2), TienGiamGia || 0)
            .input('TongPhaiTra', sql.Decimal(14,2), TongPhaiTra)
            .query(`
                INSERT INTO DonHang (MaDonHienThi, SoThuTuGoiMon, MaChiNhanh, MaPhienCa, MaKhachHang, KenhBan, HinhThucNhan, DiaChiGiaoHang, TongTienHang, TienGiamGia, TongPhaiTra, TrangThaiThanhToan, TrangThaiDonHang)
                OUTPUT INSERTED.MaDonHang
                VALUES (@MaDonHienThi, @SoThuTu, @MaCN, @MaPhienCa, @MaKH, @KenhBan, @HinhThuc, @DiaChi, @TongTienHang, @TienGiamGia, @TongPhaiTra, 'paid', 'Preparing')
            `);
        const maDonHang = orderRes.recordset[0].MaDonHang;

        for (const item of Items) {
            await new sql.Request(transaction)
                .input('MaDonHang', sql.Int, maDonHang)
                .input('MaSanPham', sql.Int, item.MaSanPham)
                .input('TenSP', sql.NVarChar, item.TenSanPham)
                .input('Size', sql.VarChar, item.TenSize || 'M')
                .input('SoLuong', sql.Int, item.SoLuong)
                .input('DonGia', sql.Decimal(12,2), item.DonGia)
                .input('Duong', sql.VarChar, item.MucDuong || '100%')
                .input('Da', sql.VarChar, item.MucDa || '100%')
                .input('GhiChu', sql.NVarChar, item.GhiChu || '')
                .query(`
                    INSERT INTO ChiTietDonHang (MaDonHang, MaSanPham, TenSanPhamLuuTru, TenSize, SoLuong, DonGiaBan, MucDuong, MucDa, GhiChuMon, TrangThaiPhaChe)
                    VALUES (@MaDonHang, @MaSanPham, @TenSP, @Size, @SoLuong, @DonGia, @Duong, @Da, @GhiChu, 'Waiting')
                `);

            await new sql.Request(transaction)
                .input('MaCN', sql.Int, branchId)
                .input('SL', sql.Decimal(12,2), item.SoLuong)
                .query(`
                    UPDATE TonKhoChiNhanh SET SoLuongTon = SoLuongTon - @SL WHERE MaChiNhanh = @MaCN AND MaNguyenLieu = 7;
                    UPDATE TonKhoChiNhanh SET SoLuongTon = SoLuongTon - (@SL * 20) WHERE MaChiNhanh = @MaCN AND MaNguyenLieu = 1;
                `);
        }

        const tienThua = (TienKhachDua || TongPhaiTra) - TongPhaiTra;
        await new sql.Request(transaction)
            .input('MaDonHang', sql.Int, maDonHang)
            .input('MaPhienCa', sql.Int, MaPhienCa || null)
            .input('PhuongThuc', sql.VarChar, PhuongThucThanhToan || 'CASH')
            .input('SoTien', sql.Decimal(14,2), TongPhaiTra)
            .input('KhachDua', sql.Decimal(14,2), TienKhachDua || TongPhaiTra)
            .input('TienThua', sql.Decimal(14,2), tienThua > 0 ? tienThua : 0)
            .query(`
                INSERT INTO GiaoDichThanhToan (MaDonHang, MaPhienCa, PhuongThuc, SoTienThanhToan, TienKhachDua, TienThuaTraKhach)
                VALUES (@MaDonHang, @MaPhienCa, @PhuongThuc, @SoTien, @KhachDua, @TienThua)
            `);

        if (MaPhienCa && (PhuongThucThanhToan === 'CASH' || !PhuongThucThanhToan)) {
            await new sql.Request(transaction)
                .input('MaPhienCa', sql.Int, MaPhienCa)
                .input('SoTien', sql.Decimal(14,2), TongPhaiTra)
                .query(`UPDATE PhienCaPOS SET TongThuTienMat = TongThuTienMat + @SoTien WHERE MaPhienCa = @MaPhienCa`);
        }

        await transaction.commit();
        return { soThuTu, maDonHienThi };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

module.exports = { getInitDataByBranch, createOrderTransaction };