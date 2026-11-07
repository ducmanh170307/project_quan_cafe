-- Phiên bản 4: lịch làm việc linh hoạt, menu hình ảnh, voucher.
-- Tạo database mẫu mới để giữ dữ liệu các bản trước cho việc đối chiếu.
IF DB_ID(N'CoffeeChainCafeV4') IS NULL EXEC(N'CREATE DATABASE CoffeeChainCafeV4');
GO
USE CoffeeChainCafeV4;
GO
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.DonHang',N'U') IS NOT NULL
 AND ISNULL((SELECT TRY_CONVERT(INT,value) FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSchemaVersion'),0)<>4
 THROW 50001,N'Không đúng schema phiên bản 4. Hãy dùng database CoffeeChainCafeV4 theo file .env mẫu.',1;

IF OBJECT_ID(N'dbo.VaiTro',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.VaiTro (
    MaVaiTro INT IDENTITY PRIMARY KEY,
    MaVaiTroCode VARCHAR(20) NOT NULL UNIQUE,
    TenVaiTro NVARCHAR(100) NOT NULL
);');

IF OBJECT_ID(N'dbo.ChiNhanh',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.ChiNhanh (
    MaChiNhanh INT IDENTITY PRIMARY KEY,
    TenChiNhanh NVARCHAR(150) NOT NULL,
    DiaChi NVARCHAR(255),
    SoDienThoai VARCHAR(20),
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''open'' CHECK(TrangThai IN (''open'',''busy'',''closed''))
);');

IF OBJECT_ID(N'dbo.NhanVien',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.NhanVien (
    MaNhanVien INT IDENTITY PRIMARY KEY,
    MaChiNhanh INT NULL REFERENCES ChiNhanh(MaChiNhanh),
    MaVaiTro INT NOT NULL REFERENCES VaiTro(MaVaiTro),
    HoTen NVARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(20),
    MaPINHash VARCHAR(180),
    LuongTheoGio DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(LuongTheoGio>=0),
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''inactive''))
);');

IF OBJECT_ID(N'dbo.CaLamViecMau',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.CaLamViecMau (MaCaMau INT IDENTITY PRIMARY KEY, TenCa NVARCHAR(80) NOT NULL UNIQUE, GioBatDau VARCHAR(5) NOT NULL, GioKetThuc VARCHAR(5) NOT NULL, QuaDem BIT NOT NULL DEFAULT 0);');

IF OBJECT_ID(N'dbo.LichPhanCa',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.LichPhanCa (MaPhanCa INT IDENTITY PRIMARY KEY, MaChiNhanh INT NOT NULL REFERENCES ChiNhanh(MaChiNhanh), MaCaMau INT NULL REFERENCES CaLamViecMau(MaCaMau), MaNhanVien INT NOT NULL REFERENCES NhanVien(MaNhanVien), NgayLamViec DATE NOT NULL, BatDauLam DATETIME2 NOT NULL, KetThucLam DATETIME2 NOT NULL, ViTriLamViec NVARCHAR(40) NOT NULL CHECK(ViTriLamViec IN (N''Thu ngân'',N''Pha chế'',N''Phục vụ'',N''Quản lý ca'',N''Bếp'')), TrangThai VARCHAR(30) NOT NULL DEFAULT ''scheduled'' CHECK(TrangThai IN (''scheduled'',''Leave_Requested'',''Absent'',''cancelled'')), GhiChu NVARCHAR(500), LyDoNghi NVARCHAR(500), LyDoHuy NVARCHAR(500), NguoiTao INT NULL REFERENCES NhanVien(MaNhanVien), NguoiCapNhat INT NULL REFERENCES NhanVien(MaNhanVien), NgayCapNhat DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CHECK(KetThucLam>BatDauLam AND DATEDIFF(minute,BatDauLam,KetThucLam)<=1440));');

IF OBJECT_ID(N'dbo.BangChamCong',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.BangChamCong (MaChamCong INT IDENTITY PRIMARY KEY, MaPhanCa INT NOT NULL UNIQUE REFERENCES LichPhanCa(MaPhanCa), MaNhanVien INT NOT NULL REFERENCES NhanVien(MaNhanVien), ThoiGianCheckIn DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), ThoiGianCheckOut DATETIME2, SoGioLamThucTe DECIMAL(10,3), SoPhutDiTre INT NOT NULL DEFAULT 0, SoPhutVeSom INT NOT NULL DEFAULT 0, CHECK(ThoiGianCheckOut IS NULL OR ThoiGianCheckOut>=ThoiGianCheckIn));');

IF OBJECT_ID(N'dbo.MayPOS',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.MayPOS (
    MaMayPOS INT IDENTITY PRIMARY KEY,
    MaChiNhanh INT NOT NULL REFERENCES ChiNhanh(MaChiNhanh),
    TenMay NVARCHAR(100) NOT NULL
);');

IF OBJECT_ID(N'dbo.PhienLamViecPOS',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.PhienLamViecPOS (
    MaPhienCa INT IDENTITY PRIMARY KEY,
    MaMayPOS INT NOT NULL REFERENCES MayPOS(MaMayPOS),
    MaChiNhanh INT NOT NULL REFERENCES ChiNhanh(MaChiNhanh),
    ThuNganMoCa INT NOT NULL REFERENCES NhanVien(MaNhanVien),
    ThuNganDongCa INT REFERENCES NhanVien(MaNhanVien),
    ThoiGianMo DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ThoiGianDong DATETIME2,
    TienMatDauCa DECIMAL(18,2) NOT NULL CHECK(TienMatDauCa>=0),
    TongThuTienMat DECIMAL(18,2) NOT NULL DEFAULT 0,
    TongHoanTienMat DECIMAL(18,2) NOT NULL DEFAULT 0,
    TongThuNoiBo DECIMAL(18,2) NOT NULL DEFAULT 0,
    TongChiNoiBo DECIMAL(18,2) NOT NULL DEFAULT 0,
    TienMatThucTeCuoiCa DECIMAL(18,2),
    TienChenhLech DECIMAL(18,2),
    LyDoLechDauCa NVARCHAR(500),
    LyDoChenhLechCuoiCa NVARCHAR(500),
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''open'' CHECK(TrangThai IN (''open'',''closed'')),
    CHECK(TienMatThucTeCuoiCa IS NULL OR TienMatThucTeCuoiCa>=0)
);');

IF OBJECT_ID(N'dbo.PhieuThuChiNoiBo',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.PhieuThuChiNoiBo (
    MaPhieu INT IDENTITY PRIMARY KEY,
    MaPhienCa INT NOT NULL REFERENCES PhienLamViecPOS(MaPhienCa),
    LoaiPhieu VARCHAR(3) NOT NULL CHECK(LoaiPhieu IN (''THU'',''CHI'')),
    SoTien DECIMAL(18,2) NOT NULL CHECK(SoTien>0),
    LyDo NVARCHAR(500) NOT NULL,
    NguoiTao INT NOT NULL REFERENCES NhanVien(MaNhanVien),
    NgayTao DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);');

IF OBJECT_ID(N'dbo.DanhMuc',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.DanhMuc (
    MaDanhMuc INT IDENTITY PRIMARY KEY,
    TenDanhMuc NVARCHAR(100) NOT NULL UNIQUE
);');

IF OBJECT_ID(N'dbo.SanPham',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.SanPham (
    MaSanPham INT IDENTITY PRIMARY KEY,
    MaDanhMuc INT NOT NULL REFERENCES DanhMuc(MaDanhMuc),
    TenSanPham NVARCHAR(150) NOT NULL, LoaiSanPham VARCHAR(10) NOT NULL DEFAULT ''DO_UONG'' CHECK(LoaiSanPham IN (''DO_UONG'',''MON_AN'')),
    GiaBanCoBan DECIMAL(18,2) NOT NULL CHECK(GiaBanCoBan>0),
    HinhAnh NVARCHAR(500),
    TramPhaChe VARCHAR(40) NOT NULL DEFAULT ''BAR'',
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''hidden''))
);');

IF OBJECT_ID(N'dbo.SanPham_Size',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.SanPham_Size (
    MaSanPham INT NOT NULL REFERENCES SanPham(MaSanPham),
    TenSize VARCHAR(10) NOT NULL CHECK(TenSize IN (''S'',''M'',''L'',''PHAN'')),
    GiaBan DECIMAL(18,2) NOT NULL CHECK(GiaBan>0),
    PRIMARY KEY(MaSanPham,TenSize)
);');

IF OBJECT_ID(N'dbo.KhachHang',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.KhachHang (
    MaKhachHang INT IDENTITY PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(20) NOT NULL UNIQUE,
    DiemTichLuy INT NOT NULL DEFAULT 0 CHECK(DiemTichLuy>=0),
    TongChiTieu DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(TongChiTieu>=0),
    HangThanhVien VARCHAR(20) NOT NULL DEFAULT ''Member''
);');

IF OBJECT_ID(N'dbo.ChuongTrinhKhuyenMai',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.ChuongTrinhKhuyenMai (
    MaKhuyenMai INT IDENTITY PRIMARY KEY,
    MaCode VARCHAR(40) NOT NULL UNIQUE, MaChiNhanh INT NULL REFERENCES ChiNhanh(MaChiNhanh), GioiHanLuotDung INT NULL CHECK(GioiHanLuotDung>0), SoLuotDaDung INT NOT NULL DEFAULT 0 CHECK(SoLuotDaDung>=0),
    TenChuongTrinh NVARCHAR(150) NOT NULL,
    LoaiKhuyenMai VARCHAR(10) NOT NULL CHECK(LoaiKhuyenMai IN (''PERCENT'',''FIXED'')),
    GiaTriGiam DECIMAL(18,2) NOT NULL CHECK(GiaTriGiam>0),
    DonToiThieu DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(DonToiThieu>=0),
    GiamToiDa DECIMAL(18,2),
    NgayBatDau DATETIME2 NOT NULL,
    NgayKetThuc DATETIME2 NOT NULL,
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''inactive'')),
    CHECK(NgayKetThuc>NgayBatDau),
    CHECK(LoaiKhuyenMai<>''PERCENT'' OR GiaTriGiam<=100),
    CHECK(GiamToiDa IS NULL OR GiamToiDa>0)
);');

IF OBJECT_ID(N'dbo.DonHang',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.DonHang (
    MaDonHang INT IDENTITY PRIMARY KEY,
    MaDonHienThi VARCHAR(40) NOT NULL UNIQUE,
    SoThuTuGoiMon INT NOT NULL,
    MaChiNhanh INT NOT NULL REFERENCES ChiNhanh(MaChiNhanh),
    MaPhienCa INT REFERENCES PhienLamViecPOS(MaPhienCa),
    MaNhanVienTao INT REFERENCES NhanVien(MaNhanVien),
    MaKhachHang INT REFERENCES KhachHang(MaKhachHang),
    MaKhuyenMai INT REFERENCES ChuongTrinhKhuyenMai(MaKhuyenMai),
    IdempotencyKey VARCHAR(36) NOT NULL UNIQUE,
    YeuCauHash VARCHAR(64) NOT NULL,
    KenhBan VARCHAR(3) NOT NULL CHECK(KenhBan IN (''POS'',''APP'')),
    HinhThucNhan VARCHAR(12) NOT NULL CHECK(HinhThucNhan IN (''Dine_In'',''Take_Away'',''Delivery'')),
    DiaChiGiaoHang NVARCHAR(300),
    TongTienHang DECIMAL(18,2) NOT NULL CHECK(TongTienHang>=0),
    TienGiamGia DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(TienGiamGia>=0),
    TongPhaiTra DECIMAL(18,2) NOT NULL CHECK(TongPhaiTra>=0),
    DiemDaCong INT NOT NULL DEFAULT 0,
    TrangThaiThanhToan VARCHAR(10) NOT NULL CHECK(TrangThaiThanhToan IN (''unpaid'',''paid'',''refunded'')),
    TrangThaiDonHang VARCHAR(20) NOT NULL CHECK(TrangThaiDonHang IN (''Pending_Payment'',''Confirmed'',''Preparing'',''Ready'',''Completed'',''Cancelled'')),
    LyDoHuyHoan NVARCHAR(500),
    ThoiGianDat DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CHECK(TongPhaiTra=TongTienHang-TienGiamGia)
);');

IF OBJECT_ID(N'dbo.ChiTietDonHang',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.ChiTietDonHang (
    MaChiTietDon INT IDENTITY PRIMARY KEY,
    MaDonHang INT NOT NULL REFERENCES DonHang(MaDonHang),
    MaSanPham INT NOT NULL REFERENCES SanPham(MaSanPham),
    TenSanPhamLuuTru NVARCHAR(150) NOT NULL,
    TenSize VARCHAR(10) NOT NULL,
    SoLuong INT NOT NULL CHECK(SoLuong>0),
    DonGiaBan DECIMAL(18,2) NOT NULL CHECK(DonGiaBan>0),
    MucDuong VARCHAR(5) NOT NULL,
    MucDa VARCHAR(5) NOT NULL,
    GhiChuMon NVARCHAR(300),
    TrangThaiPhaChe VARCHAR(10) NOT NULL DEFAULT ''Waiting'' CHECK(TrangThaiPhaChe IN (''Waiting'',''Done'',''Remake'',''Cancelled'')),
    SoLanLamLai INT NOT NULL DEFAULT 0
);');

IF OBJECT_ID(N'dbo.GiaoDichThanhToan',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.GiaoDichThanhToan (
    MaGiaoDich INT IDENTITY PRIMARY KEY,
    MaDonHang INT NOT NULL REFERENCES DonHang(MaDonHang),
    MaPhienCa INT NOT NULL REFERENCES PhienLamViecPOS(MaPhienCa),
    PhuongThuc VARCHAR(10) NOT NULL CHECK(PhuongThuc IN (''CASH'',''CARD'',''TRANSFER'')),
    LoaiGiaoDich VARCHAR(10) NOT NULL DEFAULT ''PAYMENT'' CHECK(LoaiGiaoDich IN (''PAYMENT'',''REFUND'')),
    SoTienThanhToan DECIMAL(18,2) NOT NULL CHECK(SoTienThanhToan>=0),
    TienKhachDua DECIMAL(18,2) NOT NULL DEFAULT 0,
    TienThuaTraKhach DECIMAL(18,2) NOT NULL DEFAULT 0,
    NguoiTao INT NOT NULL REFERENCES NhanVien(MaNhanVien),
    ThoiGian DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UNIQUE(MaDonHang,LoaiGiaoDich)
);');

IF OBJECT_ID(N'dbo.PhienDangNhap',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.PhienDangNhap (
    TokenHash VARCHAR(64) PRIMARY KEY,
    MaNhanVien INT NOT NULL REFERENCES NhanVien(MaNhanVien),
    HetHan DATETIME2 NOT NULL
);');

IF OBJECT_ID(N'dbo.Topping',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.Topping (MaTopping INT IDENTITY PRIMARY KEY, TenTopping NVARCHAR(100) NOT NULL, GiaBan DECIMAL(18,2) NOT NULL CHECK(GiaBan>=0), TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''hidden'')));');

IF OBJECT_ID(N'dbo.ChiTietDon_Topping',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.ChiTietDon_Topping (
    MaChiTietDon INT NOT NULL REFERENCES ChiTietDonHang(MaChiTietDon),
    MaTopping INT NOT NULL REFERENCES Topping(MaTopping),
    TenToppingLuuTru NVARCHAR(100) NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL CHECK(DonGia>=0),
    SoLuong INT NOT NULL CHECK(SoLuong BETWEEN 1 AND 5),
    PRIMARY KEY(MaChiTietDon,MaTopping)
);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_Shift_Open' AND object_id=OBJECT_ID(N'dbo.PhienLamViecPOS')) EXEC(N'CREATE UNIQUE INDEX UX_Shift_Open ON dbo.PhienLamViecPOS(MaChiNhanh) WHERE TrangThai=''open'';');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_Attendance_Open' AND object_id=OBJECT_ID(N'dbo.BangChamCong')) EXEC(N'CREATE UNIQUE INDEX UX_Attendance_Open ON dbo.BangChamCong(MaNhanVien) WHERE ThoiGianCheckOut IS NULL;');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'UX_Staff_Phone' AND object_id=OBJECT_ID(N'dbo.NhanVien')) EXEC(N'CREATE UNIQUE INDEX UX_Staff_Phone ON dbo.NhanVien(SoDienThoai) WHERE SoDienThoai IS NOT NULL;');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Schedule' AND object_id=OBJECT_ID(N'dbo.LichPhanCa')) EXEC(N'CREATE INDEX IX_Schedule ON dbo.LichPhanCa(MaNhanVien,BatDauLam,KetThucLam) INCLUDE(MaChiNhanh,TrangThai);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Order_Branch' AND object_id=OBJECT_ID(N'dbo.DonHang')) EXEC(N'CREATE INDEX IX_Order_Branch ON dbo.DonHang(MaChiNhanh,ThoiGianDat) INCLUDE(MaPhienCa,TrangThaiDonHang,TrangThaiThanhToan,TongPhaiTra);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Order_Shift' AND object_id=OBJECT_ID(N'dbo.DonHang')) EXEC(N'CREATE INDEX IX_Order_Shift ON dbo.DonHang(MaPhienCa,TrangThaiDonHang);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Line_Order' AND object_id=OBJECT_ID(N'dbo.ChiTietDonHang')) EXEC(N'CREATE INDEX IX_Line_Order ON dbo.ChiTietDonHang(MaDonHang);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name=N'IX_Session' AND object_id=OBJECT_ID(N'dbo.PhienDangNhap')) EXEC(N'CREATE INDEX IX_Session ON dbo.PhienDangNhap(HetHan);');
EXEC(N'CREATE OR ALTER VIEW dbo.HangDoiPhaChe_KDS AS
SELECT dh.MaDonHang,dh.MaChiNhanh,dh.MaDonHienThi,dh.SoThuTuGoiMon,dh.KenhBan,dh.HinhThucNhan,dh.ThoiGianDat,dh.TrangThaiDonHang,dh.TrangThaiThanhToan,
ct.MaChiTietDon,ct.MaSanPham,ct.TenSanPhamLuuTru,ct.TenSize,ct.SoLuong,ct.DonGiaBan,ct.MucDuong,ct.MucDa,ct.GhiChuMon,ct.TrangThaiPhaChe,ct.SoLanLamLai,
ISNULL(STUFF((SELECT N'', ''+t.TenToppingLuuTru+N'' x''+CONVERT(NVARCHAR(10),t.SoLuong) FROM dbo.ChiTietDon_Topping t WHERE t.MaChiTietDon=ct.MaChiTietDon ORDER BY t.MaTopping FOR XML PATH(''''),TYPE).value(''.'',''NVARCHAR(MAX)''),1,2,N''''),N'''') AS ToppingMoTa
FROM dbo.DonHang dh JOIN dbo.ChiTietDonHang ct ON dh.MaDonHang=ct.MaDonHang;');
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSchemaVersion') EXEC sys.sp_updateextendedproperty @name=N'KiotCafeSchemaVersion',@value=4;
ELSE EXEC sys.sp_addextendedproperty @name=N'KiotCafeSchemaVersion',@value=4;
COMMIT TRANSACTION;
END TRY
BEGIN CATCH
IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
THROW;
END CATCH;
GO
