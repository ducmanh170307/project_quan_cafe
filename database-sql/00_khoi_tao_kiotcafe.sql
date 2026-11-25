
USE [master];
GO
EXEC sys.sp_set_session_context @key=N'KiotCafeV4SetupStage', @value=NULL;
IF DB_ID(N'CoffeeChainCafeV4_KiotCafe') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [CoffeeChainCafeV4_KiotCafe]');
    EXEC sys.sp_set_session_context @key=N'KiotCafeV4SetupStage', @value=N'created';
END;
GO
USE [CoffeeChainCafeV4_KiotCafe];
GO
-- Cố định cấu hình phiên cho các filtered index và cột có thể NULL.
SET ANSI_NULLS ON;
SET ANSI_NULL_DFLT_ON ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
IF DB_NAME() <> N'CoffeeChainCafeV4_KiotCafe'
    THROW 50002, N'Không vào được database CoffeeChainCafeV4_KiotCafe. Kiểm tra quyền và lỗi của lệnh USE.', 1;

-- Chỉ khởi tạo database do file này tạo, kể cả khi phải chạy lại.
IF CONVERT(NVARCHAR(20),SESSION_CONTEXT(N'KiotCafeV4SetupStage')) = N'created'
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeV4SetupInstall')
        EXEC sys.sp_addextendedproperty @name=N'KiotCafeV4SetupInstall', @value=1;
END;
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeV4SetupInstall'
               AND TRY_CONVERT(INT,value)=1)
    THROW 50001,N'Database demo đã tồn tại và không thuộc bộ cài này. Hãy giữ nguyên database đó.',1;

BEGIN TRY
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeV4SetupSchemaReady'
               AND TRY_CONVERT(INT,value)=1)
BEGIN
    -- Giữ các đối tượng trùng tên được sao chép từ model trong schema riêng của database demo.
    IF SCHEMA_ID(N'KiotCafe_ModelCopy') IS NULL
        EXEC(N'CREATE SCHEMA KiotCafe_ModelCopy AUTHORIZATION dbo;');
    DECLARE @Move NVARCHAR(MAX) = N'';
    SELECT @Move = STRING_AGG(
        CONVERT(NVARCHAR(MAX),N'ALTER SCHEMA [KiotCafe_ModelCopy] TRANSFER OBJECT::[dbo].'
                + QUOTENAME(o.name) + N';'), NCHAR(10))
    FROM sys.objects AS o
    WHERE o.schema_id=SCHEMA_ID(N'dbo') AND o.parent_object_id=0 AND o.is_ms_shipped=0
      AND o.name IN (
        N'VaiTro', N'ChiNhanh', N'NhanVien', N'CaLamViecMau',
        N'LichPhanCa', N'BangChamCong', N'MayPOS', N'PhienLamViecPOS',
        N'PhieuThuChiNoiBo', N'DanhMuc', N'SanPham', N'SanPham_Size',
        N'KhachHang', N'ChuongTrinhKhuyenMai', N'DonHang', N'ChiTietDonHang',
        N'GiaoDichThanhToan', N'PhienDangNhap', N'Topping', N'ChiTietDon_Topping',
        N'HangDoiPhaChe_KDS'
      );
    IF @Move IS NOT NULL AND LEN(@Move)>0
        EXEC sys.sp_executesql @Move;
END;

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
    MaChiNhanh INT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh),
    MaVaiTro INT NOT NULL REFERENCES dbo.VaiTro(MaVaiTro),
    HoTen NVARCHAR(100) NOT NULL,
    SoDienThoai VARCHAR(20),
    MaPINHash VARCHAR(180),
    LuongTheoGio DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(LuongTheoGio>=0),
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''inactive''))
);');

IF OBJECT_ID(N'dbo.CaLamViecMau',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.CaLamViecMau (MaCaMau INT IDENTITY PRIMARY KEY, TenCa NVARCHAR(80) NOT NULL UNIQUE, GioBatDau VARCHAR(5) NOT NULL, GioKetThuc VARCHAR(5) NOT NULL, QuaDem BIT NOT NULL DEFAULT 0);');

IF OBJECT_ID(N'dbo.LichPhanCa',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.LichPhanCa (MaPhanCa INT IDENTITY PRIMARY KEY, MaChiNhanh INT NOT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh), MaCaMau INT NULL REFERENCES dbo.CaLamViecMau(MaCaMau), MaNhanVien INT NOT NULL REFERENCES dbo.NhanVien(MaNhanVien), NgayLamViec DATE NOT NULL, BatDauLam DATETIME2 NOT NULL, KetThucLam DATETIME2 NOT NULL, ViTriLamViec NVARCHAR(40) NOT NULL CHECK(ViTriLamViec IN (N''Thu ngân'',N''Pha chế'',N''Phục vụ'',N''Quản lý ca'',N''Bếp'')), TrangThai VARCHAR(30) NOT NULL DEFAULT ''scheduled'' CHECK(TrangThai IN (''scheduled'',''Leave_Requested'',''Absent'',''cancelled'')), GhiChu NVARCHAR(500), LyDoNghi NVARCHAR(500), LyDoHuy NVARCHAR(500), NguoiTao INT NULL REFERENCES dbo.NhanVien(MaNhanVien), NguoiCapNhat INT NULL REFERENCES dbo.NhanVien(MaNhanVien), NgayCapNhat DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CHECK(KetThucLam>BatDauLam AND DATEDIFF(minute,BatDauLam,KetThucLam)<=1440));');

IF OBJECT_ID(N'dbo.BangChamCong',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.BangChamCong (MaChamCong INT IDENTITY PRIMARY KEY, MaPhanCa INT NOT NULL UNIQUE REFERENCES dbo.LichPhanCa(MaPhanCa), MaNhanVien INT NOT NULL REFERENCES dbo.NhanVien(MaNhanVien), ThoiGianCheckIn DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), ThoiGianCheckOut DATETIME2, SoGioLamThucTe DECIMAL(10,3), SoPhutDiTre INT NOT NULL DEFAULT 0, SoPhutVeSom INT NOT NULL DEFAULT 0, CHECK(ThoiGianCheckOut IS NULL OR ThoiGianCheckOut>=ThoiGianCheckIn));');

IF OBJECT_ID(N'dbo.MayPOS',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.MayPOS (
    MaMayPOS INT IDENTITY PRIMARY KEY,
    MaChiNhanh INT NOT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh),
    TenMay NVARCHAR(100) NOT NULL
);');

IF OBJECT_ID(N'dbo.PhienLamViecPOS',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.PhienLamViecPOS (
    MaPhienCa INT IDENTITY PRIMARY KEY,
    MaMayPOS INT NOT NULL REFERENCES dbo.MayPOS(MaMayPOS),
    MaChiNhanh INT NOT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh),
    ThuNganMoCa INT NOT NULL REFERENCES dbo.NhanVien(MaNhanVien),
    ThuNganDongCa INT REFERENCES dbo.NhanVien(MaNhanVien),
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
    MaPhienCa INT NOT NULL REFERENCES dbo.PhienLamViecPOS(MaPhienCa),
    LoaiPhieu VARCHAR(3) NOT NULL CHECK(LoaiPhieu IN (''THU'',''CHI'')),
    SoTien DECIMAL(18,2) NOT NULL CHECK(SoTien>0),
    LyDo NVARCHAR(500) NOT NULL,
    NguoiTao INT NOT NULL REFERENCES dbo.NhanVien(MaNhanVien),
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
    MaDanhMuc INT NOT NULL REFERENCES dbo.DanhMuc(MaDanhMuc),
    TenSanPham NVARCHAR(150) NOT NULL, LoaiSanPham VARCHAR(10) NOT NULL DEFAULT ''DO_UONG'' CHECK(LoaiSanPham IN (''DO_UONG'',''MON_AN'')),
    GiaBanCoBan DECIMAL(18,2) NOT NULL CHECK(GiaBanCoBan>0),
    HinhAnh NVARCHAR(500),
    TramPhaChe VARCHAR(40) NOT NULL DEFAULT ''BAR'',
    TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''hidden''))
);');

IF OBJECT_ID(N'dbo.SanPham_Size',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.SanPham_Size (
    MaSanPham INT NOT NULL REFERENCES dbo.SanPham(MaSanPham),
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
    MaCode VARCHAR(40) NOT NULL UNIQUE, DoiTuongApDung VARCHAR(10) NOT NULL DEFAULT ''ALL'' CHECK(DoiTuongApDung IN (''ALL'',''MEMBER'')), MaChiNhanh INT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh), GioiHanLuotDung INT NULL CHECK(GioiHanLuotDung>0), SoLuotDaDung INT NOT NULL DEFAULT 0 CHECK(SoLuotDaDung>=0),
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
    MaChiNhanh INT NOT NULL REFERENCES dbo.ChiNhanh(MaChiNhanh),
    MaPhienCa INT REFERENCES dbo.PhienLamViecPOS(MaPhienCa),
    MaNhanVienTao INT REFERENCES dbo.NhanVien(MaNhanVien),
    MaKhachHang INT REFERENCES dbo.KhachHang(MaKhachHang),
    MaKhuyenMai INT REFERENCES dbo.ChuongTrinhKhuyenMai(MaKhuyenMai),
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
    MaDonHang INT NOT NULL REFERENCES dbo.DonHang(MaDonHang),
    MaSanPham INT NOT NULL REFERENCES dbo.SanPham(MaSanPham),
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
    MaDonHang INT NOT NULL REFERENCES dbo.DonHang(MaDonHang),
    MaPhienCa INT NOT NULL REFERENCES dbo.PhienLamViecPOS(MaPhienCa),
    PhuongThuc VARCHAR(10) NOT NULL CHECK(PhuongThuc IN (''CASH'',''CARD'',''TRANSFER'')),
    LoaiGiaoDich VARCHAR(10) NOT NULL DEFAULT ''PAYMENT'' CHECK(LoaiGiaoDich IN (''PAYMENT'',''REFUND'')),
    SoTienThanhToan DECIMAL(18,2) NOT NULL CHECK(SoTienThanhToan>=0),
    TienKhachDua DECIMAL(18,2) NOT NULL DEFAULT 0,
    TienThuaTraKhach DECIMAL(18,2) NOT NULL DEFAULT 0,
    NguoiTao INT NOT NULL REFERENCES dbo.NhanVien(MaNhanVien),
    ThoiGian DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UNIQUE(MaDonHang,LoaiGiaoDich)
);');

IF OBJECT_ID(N'dbo.PhienDangNhap',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.PhienDangNhap (
    TokenHash VARCHAR(64) PRIMARY KEY,
    MaNhanVien INT NOT NULL REFERENCES dbo.NhanVien(MaNhanVien),
    HetHan DATETIME2 NOT NULL
);');

IF OBJECT_ID(N'dbo.Topping',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.Topping (MaTopping INT IDENTITY PRIMARY KEY, TenTopping NVARCHAR(100) NOT NULL, GiaBan DECIMAL(18,2) NOT NULL CHECK(GiaBan>=0), TrangThai VARCHAR(20) NOT NULL DEFAULT ''active'' CHECK(TrangThai IN (''active'',''hidden'')));');

IF OBJECT_ID(N'dbo.ChiTietDon_Topping',N'U') IS NULL
EXEC(N'CREATE TABLE dbo.ChiTietDon_Topping (
    MaChiTietDon INT NOT NULL REFERENCES dbo.ChiTietDonHang(MaChiTietDon),
    MaTopping INT NOT NULL REFERENCES dbo.Topping(MaTopping),
    TenToppingLuuTru NVARCHAR(100) NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL CHECK(DonGia>=0),
    SoLuong INT NOT NULL CHECK(SoLuong BETWEEN 1 AND 5),
    PRIMARY KEY(MaChiTietDon,MaTopping)
);');
-- Bổ sung đối tượng áp dụng voucher cho database v4 đã tạo trước đó (chạy lại an toàn).
IF COL_LENGTH(N'dbo.ChuongTrinhKhuyenMai',N'DoiTuongApDung') IS NULL EXEC(N'ALTER TABLE dbo.ChuongTrinhKhuyenMai ADD DoiTuongApDung VARCHAR(10) NOT NULL CONSTRAINT DF_KM_DoiTuong DEFAULT ''ALL'' CONSTRAINT CK_KM_DoiTuong CHECK(DoiTuongApDung IN (''ALL'',''MEMBER''))');
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
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeV4SetupSchemaReady')
    EXEC sys.sp_addextendedproperty @name=N'KiotCafeV4SetupSchemaReady', @value=1;
COMMIT TRANSACTION;
EXEC sys.sp_set_session_context @key=N'KiotCafeV4SetupStage', @value=N'schema';
END TRY
BEGIN CATCH
IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
THROW;
END CATCH;
GO

-- 2 chi nhánh × 8 nhân viên. Lịch mẫu thứ Hai–thứ Bảy tuần hiện tại (giờ Việt Nam).
USE CoffeeChainCafeV4_KiotCafe;
GO
-- Cố định cấu hình phiên cho các filtered index và cột có thể NULL.
SET ANSI_NULLS ON;
SET ANSI_NULL_DFLT_ON ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
IF DB_NAME() <> N'CoffeeChainCafeV4_KiotCafe'
    THROW 50002, N'Không vào được database CoffeeChainCafeV4_KiotCafe. Kiểm tra quyền và lỗi của lệnh USE.', 1;
IF ISNULL(CONVERT(NVARCHAR(20),SESSION_CONTEXT(N'KiotCafeV4SetupStage')),N'') <> N'schema'
    THROW 50005,N'Phần tạo bảng chưa hoàn tất. Xem lỗi đầu tiên trong Messages.',1;
IF ISNULL((SELECT TRY_CONVERT(INT,value) FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSchemaVersion'),0) <> 4
    OR COL_LENGTH(N'dbo.ChuongTrinhKhuyenMai',N'DoiTuongApDung') IS NULL
    THROW 50003, N'Phần tạo bảng phía trên chưa hoàn tất. Xem lỗi đầu tiên trong Messages.', 1;

BEGIN TRY
BEGIN TRANSACTION;
IF NOT EXISTS(SELECT 1 FROM dbo.VaiTro WHERE MaVaiTroCode='ADMIN') INSERT INTO dbo.VaiTro(MaVaiTroCode,TenVaiTro) VALUES('ADMIN',N'Chủ chuỗi');
IF NOT EXISTS(SELECT 1 FROM dbo.VaiTro WHERE MaVaiTroCode='MANAGER') INSERT INTO dbo.VaiTro(MaVaiTroCode,TenVaiTro) VALUES('MANAGER',N'Quản lý chi nhánh');
IF NOT EXISTS(SELECT 1 FROM dbo.VaiTro WHERE MaVaiTroCode='CASHIER') INSERT INTO dbo.VaiTro(MaVaiTroCode,TenVaiTro) VALUES('CASHIER',N'Thu ngân');
IF NOT EXISTS(SELECT 1 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA') INSERT INTO dbo.VaiTro(MaVaiTroCode,TenVaiTro) VALUES('BARISTA',N'Pha chế');
IF NOT EXISTS(SELECT 1 FROM dbo.VaiTro WHERE MaVaiTroCode='STAFF') INSERT INTO dbo.VaiTro(MaVaiTroCode,TenVaiTro) VALUES('STAFF',N'Nhân viên phục vụ');
IF NOT EXISTS(SELECT 1 FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội') INSERT INTO dbo.ChiNhanh(TenChiNhanh,DiaChi,SoDienThoai,TrangThai) VALUES(N'Chi nhánh Cầu Giấy - Hà Nội',N'122 Cầu Giấy, Hà Nội','0988111222','open');
IF NOT EXISTS(SELECT 1 FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội') INSERT INTO dbo.ChiNhanh(TenChiNhanh,DiaChi,SoDienThoai,TrangThai) VALUES(N'Chi nhánh Hà Đông - Hà Nội',N'45 Nguyễn Trãi, Hà Đông','0988333444','open');
INSERT INTO dbo.MayPOS(MaChiNhanh,TenMay) SELECT MaChiNhanh,N'Quầy POS chính' FROM dbo.ChiNhanh cn WHERE NOT EXISTS(SELECT 1 FROM dbo.MayPOS p WHERE p.MaChiNhanh=cn.MaChiNhanh);
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0900000000') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT NULL,MaVaiTro,N'Chủ chuỗi KiotCafe','0900000000','b76af29204030ec89b1ffdc5b9ef4cbe:ad7be664961a0b94dd826e0f7478fb48565926e8ac644f826688588904b6d64b5c16699480117feec953a4b86a83245d1a9be603571c98b36594fc2ddd31f9e9',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='ADMIN';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0901000001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Quản lý (Cầu Giấy)','0901000001','23868f5013f9840b56250364c289980f:9381db39fd876a44c274519bb70181f6d039edac0b2ebb47d2c1889076f5a47e8a87a43982d232b04545bc7b9068f9718febda91ee8e13fc10aabb75a5a6b545',40000 FROM dbo.VaiTro WHERE MaVaiTroCode='MANAGER';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0902000001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Thu ngân 1 (Cầu Giấy)','0902000001','fdb60c28ff3f95d44c80b6e98c9da303:b41bd742703ae7963c12752872a1aa242bf99fb149f66799e6addb41b92d6aa4b6ba3116870b8ad180a245da26713d97e2dcd08c9712362bcfc7ef6e6aea715e',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='CASHIER';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0903000001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Pha chế 1 (Cầu Giấy)','0903000001','40fcaedb67f51792d7b91967de19819f:2d42cb798edd83e6af6d622c29e33b90293b0adf842aec397e9b8b8cc10e1ae30b77759c53616bb603de0df9afed861ac1c8f08c0d63148b7b898aaa196e0a00',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0902100001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Thu ngân 2 (Cầu Giấy)','0902100001','a244ec51af55e7b4b571aeae8f22b6b2:de8782065836d4ebbb3916f24521fc3438407ff539a6f1ee318427c2b156b76cfa05f1dcebd49a1630b83471cce743897b31d4e8032b9345cd8ef5101833b558',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='CASHIER';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0903100001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Pha chế 2 (Cầu Giấy)','0903100001','89d21a490d20f697dcd3346ae63e21f2:c063fc5e34ee754e452d6f41640a8944c36e40bf1626f9319e1069198d94f68233864c6a53d189db5f11c2a64062cae06fd387680bd9a40fb17da103c0c09249',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0903200001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Pha chế 3 (Cầu Giấy)','0903200001','640b2f6d8783c636894b2dbf31bc5f5b:fa5fb93b93a7a5ba0a9058a64833f60b1467ad5dec652f4f9a4e8a758242ab07471e2521c097c574a77c44708ef856948c68d8dfebf1fcd0afb47fb501fefd67',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0904000001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Phục vụ 1 (Cầu Giấy)','0904000001','a74c99b92914da3c44d41d83589f5b62:5021586bbef17f1a237d4cab16c589aeec2aab202bf3f0c4de88ba44743e5d5fe0fa7f1e71d71dc78d1997674403b41a599633c32f66c8ed46c95d15d5d306b7',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='STAFF';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0904100001') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Cầu Giấy - Hà Nội'),MaVaiTro,N'Phục vụ 2 (Cầu Giấy)','0904100001','3a5a6d4fdbc884b6de4529b947cfa61d:14159d771584e9cbdd240e9332611d1aee9d8d3d822f85706069def492d4f0d340d8efb81642a424cd0651303750932b3688ef17da16d4f86060eab5c6f4b0a2',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='STAFF';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0901000002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Quản lý (Hà Đông)','0901000002','31bfaa177ec251ee6ef9288a61d1353d:fe4381cb95b506e2a69fa63cbf39c69a6630fbaf0e12b51cfb3695a0e553bfb31b4cc219feb8810270a7db4b1da5be68bce7963a39aca233a7a87333d6e7adbe',40000 FROM dbo.VaiTro WHERE MaVaiTroCode='MANAGER';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0902000002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Thu ngân 1 (Hà Đông)','0902000002','c02d0155d8e6faf11a9186d5f3223ed6:63678d7d456fc867db75e88f84152e006c497ab7a4588e80119baef7e55d80d017e61407a0fcbed49400d83d4817f05ab4f6e81595241c2e29e6df7443e74ed1',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='CASHIER';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0903000002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Pha chế 1 (Hà Đông)','0903000002','2eb87dff27cca745aecf4f8b42ad7a13:2a501b9a7affd3ddcbd337c07947a94162530916eaa7334c2ecfc515dfd2a94ede05a4ca94cea820762fcd4b4b6968fc13328f12f59092c9953c0b5c5471335b',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0902100002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Thu ngân 2 (Hà Đông)','0902100002','b139c49f7e90de549f50d927bfc46fbe:09c0304e7c1be6b9a2bb5ce27f12411dbd78b28c282b72c04b235108051588e59087769e9161847ae551ab389a1c98c3bf7e19b872c3998ee0b7e2925ac9b91b',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='CASHIER';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0903100002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Pha chế 2 (Hà Đông)','0903100002','aa1d658d422e46901abf3d4325f3af8b:36b36109e2b0f59823c5c4890947f029ab3291eff29090a5186ab446ddbb621c7f137ca4c9aebdb694864eeae61ec4e7150f30aefc3df0770b0baad0b1a36618',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0903200002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Pha chế 3 (Hà Đông)','0903200002','8ac10148942bdf14d50551c962f44fce:f5573173dbe569dee448734c18270dec6bd1fd250c209518359254dff4c5bc2877993b4d7a6cdc90107ecfadfb6ad94975908a072fb454dad6b3cfd3f6de9987',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='BARISTA';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0904000002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Phục vụ 1 (Hà Đông)','0904000002','b5707e8b254f8a0ce463c99f6c5be52e:ef6e57868d0203f5730a5def11dd07d060a87120cc8e3c7f1000dac1b0561fab08856391e5da339b898b41cb2ce012309abb1f822615da2fe10eac8f3a14fdbf',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='STAFF';
IF NOT EXISTS(SELECT 1 FROM dbo.NhanVien WHERE SoDienThoai='0904100002') INSERT INTO dbo.NhanVien(MaChiNhanh,MaVaiTro,HoTen,SoDienThoai,MaPINHash,LuongTheoGio) SELECT (SELECT TOP 1 MaChiNhanh FROM dbo.ChiNhanh WHERE TenChiNhanh=N'Chi nhánh Hà Đông - Hà Nội'),MaVaiTro,N'Phục vụ 2 (Hà Đông)','0904100002','916d23718bda927db970cde55fc70555:704dd275ad3b99514100b7b6376ef07de29e3e2a54b4ae6a905e54d2c80b03858959db2c511aaa496fb7499ccc6e16f3006bb927c7629412d90beb4da89616e9',25000 FROM dbo.VaiTro WHERE MaVaiTroCode='STAFF';
IF NOT EXISTS(SELECT 1 FROM dbo.CaLamViecMau WHERE TenCa=N'Ca sáng') INSERT INTO dbo.CaLamViecMau(TenCa,GioBatDau,GioKetThuc,QuaDem) VALUES(N'Ca sáng','06:00','12:00',0);
IF NOT EXISTS(SELECT 1 FROM dbo.CaLamViecMau WHERE TenCa=N'Ca chiều') INSERT INTO dbo.CaLamViecMau(TenCa,GioBatDau,GioKetThuc,QuaDem) VALUES(N'Ca chiều','12:00','18:00',0);
IF NOT EXISTS(SELECT 1 FROM dbo.CaLamViecMau WHERE TenCa=N'Ca tối') INSERT INTO dbo.CaLamViecMau(TenCa,GioBatDau,GioKetThuc,QuaDem) VALUES(N'Ca tối','18:00','22:00',0);
IF NOT EXISTS(SELECT 1 FROM dbo.CaLamViecMau WHERE TenCa=N'Ca ngắn buổi sáng') INSERT INTO dbo.CaLamViecMau(TenCa,GioBatDau,GioKetThuc,QuaDem) VALUES(N'Ca ngắn buổi sáng','08:00','12:00',0);
IF NOT EXISTS(SELECT 1 FROM dbo.CaLamViecMau WHERE TenCa=N'Ca qua đêm') INSERT INTO dbo.CaLamViecMau(TenCa,GioBatDau,GioKetThuc,QuaDem) VALUES(N'Ca qua đêm','22:00','02:00',1);
DECLARE @Today DATE=CAST(DATEADD(minute,420,SYSUTCDATETIME()) AS DATE);
DECLARE @Monday DATE=DATEADD(day,-(DATEDIFF(day,'19000101',@Today)%7),@Today);
DECLARE @Owner INT=(SELECT TOP 1 MaNhanVien FROM dbo.NhanVien WHERE SoDienThoai='0900000000');
-- Giữ lịch đã có và chỉ xếp ca mẫu cho tài khoản còn làm tại chi nhánh.
INSERT INTO dbo.LichPhanCa(MaChiNhanh,MaNhanVien,NgayLamViec,BatDauLam,KetThucLam,ViTriLamViec,GhiChu,NguoiTao,NguoiCapNhat)
SELECT n.MaChiNhanh,n.MaNhanVien,d.NgayLamViec,gio.BatDauLam,gio.KetThucLam,m.ViTriLamViec,N'Lịch mẫu tuần hiện tại',@Owner,@Owner
FROM (VALUES
        ('0901000001',1080,1320,N'Quản lý ca'),
        ('0902000001',360,720,N'Thu ngân'),
        ('0903000001',360,720,N'Pha chế'),
        ('0902100001',720,1080,N'Thu ngân'),
        ('0903100001',720,1080,N'Pha chế'),
        ('0903200001',1080,1320,N'Pha chế'),
        ('0904000001',360,720,N'Phục vụ'),
        ('0904100001',720,1080,N'Phục vụ'),
        ('0901000002',1080,1320,N'Quản lý ca'),
        ('0902000002',360,720,N'Thu ngân'),
        ('0903000002',360,720,N'Pha chế'),
        ('0902100002',720,1080,N'Thu ngân'),
        ('0903100002',720,1080,N'Pha chế'),
        ('0903200002',1080,1320,N'Pha chế'),
        ('0904000002',360,720,N'Phục vụ'),
        ('0904100002',720,1080,N'Phục vụ')
    ) m(SoDienThoai,PhutBatDau,PhutKetThuc,ViTriLamViec)
JOIN dbo.NhanVien n ON n.SoDienThoai=m.SoDienThoai
CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5)) lich(NgayTrongTuan)
CROSS APPLY (VALUES (DATEADD(day,lich.NgayTrongTuan,@Monday))) d(NgayLamViec)
CROSS APPLY (VALUES (
    DATEADD(minute,m.PhutBatDau-420,CAST(d.NgayLamViec AS DATETIME2)),
    DATEADD(minute,m.PhutKetThuc-420,CAST(d.NgayLamViec AS DATETIME2))
)) gio(BatDauLam,KetThucLam)
WHERE n.TrangThai='active' AND n.MaChiNhanh IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM dbo.LichPhanCa pc
      WHERE pc.MaNhanVien=n.MaNhanVien
        AND (pc.NgayLamViec=d.NgayLamViec OR (
            pc.TrangThai IN ('scheduled','Leave_Requested')
            AND pc.BatDauLam<gio.KetThucLam AND pc.KetThucLam>gio.BatDauLam
        ))
  );
IF NOT EXISTS(SELECT 1 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Cà phê') INSERT INTO dbo.DanhMuc(TenDanhMuc) VALUES(N'Cà phê');
IF NOT EXISTS(SELECT 1 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Trà & trà sữa') INSERT INTO dbo.DanhMuc(TenDanhMuc) VALUES(N'Trà & trà sữa');
IF NOT EXISTS(SELECT 1 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Bánh ngọt') INSERT INTO dbo.DanhMuc(TenDanhMuc) VALUES(N'Bánh ngọt');
IF NOT EXISTS(SELECT 1 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Đồ ăn') INSERT INTO dbo.DanhMuc(TenDanhMuc) VALUES(N'Đồ ăn');
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Bạc xỉu') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Bạc xỉu','DO_UONG','/src/assets/menu/latte.jpg',39000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Cà phê';
DECLARE @p_latte INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_latte,'M',39000),(@p_latte,'L',45000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Cà phê đen') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Cà phê đen','DO_UONG','/src/assets/menu/coffee.jpg',29000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Cà phê';
DECLARE @p_coffee INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_coffee,'M',29000),(@p_coffee,'L',35000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Trà chanh') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Trà chanh','DO_UONG','/src/assets/menu/tea.jpg',45000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Trà & trà sữa';
DECLARE @p_tea INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_tea,'M',45000),(@p_tea,'L',51000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Trà sữa ô long') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Trà sữa ô long','DO_UONG','/src/assets/menu/milk-tea.jpg',42000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Trà & trà sữa';
DECLARE @p_milk_tea INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_milk_tea,'M',42000),(@p_milk_tea,'L',48000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Bánh sừng bò') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Bánh sừng bò','MON_AN','/src/assets/menu/croissant.jpg',35000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Bánh ngọt';
DECLARE @p_croissant INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_croissant,'PHAN',35000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Bánh cheesecake') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Bánh cheesecake','MON_AN','/src/assets/menu/cheesecake.jpg',49000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Bánh ngọt';
DECLARE @p_cheesecake INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_cheesecake,'PHAN',49000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Sandwich trứng') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Sandwich trứng','MON_AN','/src/assets/menu/sandwich.jpg',45000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Đồ ăn';
DECLARE @p_sandwich INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_sandwich,'PHAN',45000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.SanPham WHERE TenSanPham=N'Bánh mì kẹp') BEGIN
INSERT INTO dbo.SanPham(MaDanhMuc,TenSanPham,LoaiSanPham,HinhAnh,GiaBanCoBan) SELECT MaDanhMuc,N'Bánh mì kẹp','MON_AN','/src/assets/menu/banh-mi.jpg',39000 FROM dbo.DanhMuc WHERE TenDanhMuc=N'Đồ ăn';
DECLARE @p_banh_mi INT=SCOPE_IDENTITY();
INSERT INTO dbo.SanPham_Size(MaSanPham,TenSize,GiaBan) VALUES(@p_banh_mi,'PHAN',39000);
END;
IF NOT EXISTS(SELECT 1 FROM dbo.Topping WHERE TenTopping=N'Trân châu trắng') INSERT INTO dbo.Topping(TenTopping,GiaBan) VALUES(N'Trân châu trắng',8000);
IF NOT EXISTS(SELECT 1 FROM dbo.Topping WHERE TenTopping=N'Thêm sữa') INSERT INTO dbo.Topping(TenTopping,GiaBan) VALUES(N'Thêm sữa',5000);
IF NOT EXISTS(SELECT 1 FROM dbo.Topping WHERE TenTopping=N'Kem cheese') INSERT INTO dbo.Topping(TenTopping,GiaBan) VALUES(N'Kem cheese',10000);
IF NOT EXISTS(SELECT 1 FROM dbo.ChuongTrinhKhuyenMai WHERE MaCode='CAFE10') INSERT INTO dbo.ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,GiamToiDa,NgayBatDau,NgayKetThuc) VALUES('CAFE10',N'Giảm 10% đơn từ 50.000đ','PERCENT',10,50000,30000,DATEADD(day,-1,SYSUTCDATETIME()),DATEADD(year,1,SYSUTCDATETIME()));
IF NOT EXISTS(SELECT 1 FROM dbo.ChuongTrinhKhuyenMai WHERE MaCode='WELCOME20') INSERT INTO dbo.ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,GioiHanLuotDung,NgayBatDau,NgayKetThuc) VALUES('WELCOME20',N'Giảm 20.000đ đơn từ 100.000đ','FIXED',20000,100000,100,DATEADD(day,-1,SYSUTCDATETIME()),DATEADD(month,3,SYSUTCDATETIME()));
-- Voucher mẫu để demo lọc trạng thái/thời gian/đối tượng: thành viên, đang tắt, đã hết hạn, sắp diễn ra.
IF NOT EXISTS(SELECT 1 FROM dbo.ChuongTrinhKhuyenMai WHERE MaCode='THANHVIEN15') INSERT INTO dbo.ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,GiamToiDa,NgayBatDau,NgayKetThuc,DoiTuongApDung) VALUES('THANHVIEN15',N'Thành viên giảm 15% đơn từ 60.000đ','PERCENT',15,60000,30000,DATEADD(day,-1,SYSUTCDATETIME()),DATEADD(month,6,SYSUTCDATETIME()),'MEMBER');
IF NOT EXISTS(SELECT 1 FROM dbo.ChuongTrinhKhuyenMai WHERE MaCode='TAMTAT5K') INSERT INTO dbo.ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,NgayBatDau,NgayKetThuc,TrangThai) VALUES('TAMTAT5K',N'Giảm 5.000đ (đang tắt)','FIXED',5000,30000,DATEADD(day,-1,SYSUTCDATETIME()),DATEADD(month,1,SYSUTCDATETIME()),'inactive');
IF NOT EXISTS(SELECT 1 FROM dbo.ChuongTrinhKhuyenMai WHERE MaCode='HETHAN') INSERT INTO dbo.ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,NgayBatDau,NgayKetThuc) VALUES('HETHAN',N'Khuyến mãi tháng trước (đã hết hạn)','PERCENT',20,0,DATEADD(month,-2,SYSUTCDATETIME()),DATEADD(day,-1,SYSUTCDATETIME()));
IF NOT EXISTS(SELECT 1 FROM dbo.ChuongTrinhKhuyenMai WHERE MaCode='SAPDIENRA') INSERT INTO dbo.ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,NgayBatDau,NgayKetThuc) VALUES('SAPDIENRA',N'Khuyến mãi tuần sau (chưa bắt đầu)','FIXED',10000,50000,DATEADD(day,7,SYSUTCDATETIME()),DATEADD(day,14,SYSUTCDATETIME()));
IF EXISTS(SELECT 1 FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSeedVersion') EXEC sys.sp_updateextendedproperty @name=N'KiotCafeSeedVersion',@value=4; ELSE EXEC sys.sp_addextendedproperty @name=N'KiotCafeSeedVersion',@value=4;
COMMIT TRANSACTION;
EXEC sys.sp_set_session_context @key=N'KiotCafeV4SetupStage', @value=N'seed';
END TRY
BEGIN CATCH
IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
THROW;
END CATCH;
GO

IF DB_NAME() = N'CoffeeChainCafeV4_KiotCafe'
    AND CONVERT(NVARCHAR(20),SESSION_CONTEXT(N'KiotCafeV4SetupStage')) = N'seed'
    AND EXISTS (SELECT 1 FROM sys.extended_properties WHERE class=0
        AND name=N'KiotCafeSeedVersion' AND TRY_CONVERT(INT,value)=4)
    SELECT DB_NAME() AS TenDatabase,
           (SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID(N'dbo') AND name IN (
              N'VaiTro', N'ChiNhanh', N'NhanVien', N'CaLamViecMau',
        N'LichPhanCa', N'BangChamCong', N'MayPOS', N'PhienLamViecPOS',
        N'PhieuThuChiNoiBo', N'DanhMuc', N'SanPham', N'SanPham_Size',
        N'KhachHang', N'ChuongTrinhKhuyenMai', N'DonHang', N'ChiTietDonHang',
        N'GiaoDichThanhToan', N'PhienDangNhap', N'Topping', N'ChiTietDon_Topping'
           )) AS SoBang,
           (SELECT COUNT(*) FROM sys.views WHERE schema_id=SCHEMA_ID(N'dbo') AND name=N'HangDoiPhaChe_KDS') AS SoView;
GO
