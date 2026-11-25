const db = require("../src/config/db");
(async () => {
  try {
    const r = await db.query(
      `SELECT DB_NAME() AS DatabaseName,SUSER_SNAME() AS LoginName,(SELECT TRY_CONVERT(INT,value) FROM sys.extended_properties WHERE class=0 AND name=N'KiotCafeSchemaVersion') AS SchemaVersion; SELECT COUNT(*) AS StaffCount FROM NhanVien WHERE MaPINHash IS NOT NULL; SELECT COUNT(*) AS MenuCount FROM SanPham_Size`,
    );
    console.log("Kết nối SQL Server thành công.");
    console.table(r.recordsets[0]);
    console.table(r.recordsets[1]);
    console.table(r.recordsets[2]);
    if (r.recordsets[0][0].SchemaVersion !== 4)
      throw new Error("Sai phiên bản schema.");
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
