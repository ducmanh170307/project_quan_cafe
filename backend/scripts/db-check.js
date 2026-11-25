const db = require("../src/config/db");
(async () => {
  try {
    const r = await db.query(`
      SELECT DB_NAME() AS DatabaseName,SUSER_SNAME() AS LoginName,
        MAX(CASE WHEN name=N'KiotCafeSchemaVersion' THEN TRY_CONVERT(INT,value) END) AS SchemaVersion,
        MAX(CASE WHEN name=N'KiotCafeSeedVersion' THEN TRY_CONVERT(INT,value) END) AS SeedVersion
      FROM sys.extended_properties WHERE class=0;
      SELECT expected.Name AS MissingObject
      FROM (VALUES
        ('VaiTro'),('ChiNhanh'),('NhanVien'),('CaLamViecMau'),('LichPhanCa'),
        ('BangChamCong'),('MayPOS'),('PhienLamViecPOS'),('PhieuThuChiNoiBo'),
        ('DanhMuc'),('SanPham'),('SanPham_Size'),('KhachHang'),('ChuongTrinhKhuyenMai'),
        ('DonHang'),('ChiTietDonHang'),('GiaoDichThanhToan'),('PhienDangNhap'),
        ('Topping'),('ChiTietDon_Topping')
      ) expected(Name)
      WHERE OBJECT_ID(N'dbo.'+expected.Name,N'U') IS NULL
      UNION ALL SELECT 'HangDoiPhaChe_KDS' WHERE OBJECT_ID(N'dbo.HangDoiPhaChe_KDS',N'V') IS NULL
      UNION ALL SELECT 'ChuongTrinhKhuyenMai.DoiTuongApDung'
      WHERE OBJECT_ID(N'dbo.ChuongTrinhKhuyenMai',N'U') IS NOT NULL
        AND COL_LENGTH(N'dbo.ChuongTrinhKhuyenMai',N'DoiTuongApDung') IS NULL;
    `);
    console.log("Kết nối SQL Server thành công.");
    console.table(r.recordsets[0]);
    const { SchemaVersion, SeedVersion } = r.recordsets[0][0];
    if (r.recordsets[1].length) console.table(r.recordsets[1]);
    if (SchemaVersion !== 4 || r.recordsets[1].length)
      throw new Error("Sai phiên bản hoặc thiếu cấu trúc database. Kiểm tra 01_create_database.sql.");
    if (SeedVersion !== 4)
      throw new Error("Chưa nạp đủ dữ liệu mẫu. Kiểm tra 02_insert_data.sql.");
    const counts = await db.query(`
      SELECT (SELECT COUNT(*) FROM dbo.NhanVien WHERE MaPINHash IS NOT NULL) AS StaffCount,
        (SELECT COUNT(*) FROM dbo.SanPham_Size) AS MenuCount;
    `);
    console.table(counts.recordset);
  } catch (e) {
    console.error(
      "Không kiểm tra được database:",
      e.code || e.number || "",
      e.message,
    );
    console.error(
      "Xem docs/HUONG_DAN_VSCODE.md. Không dùng cổng 1433 làm PORT của web.",
    );
    process.exitCode = 1;
  } finally {
    await db.close().catch(() => {});
  }
})();
