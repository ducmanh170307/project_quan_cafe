// Phụ trách: Mạnh.
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
async function getAllBranches(actor) {
  const r = await db.query(
    `SELECT cn.* FROM ChiNhanh cn WHERE @all=1 OR MaChiNhanh=@branch ORDER BY MaChiNhanh`,
    { all: actor.Role === "ADMIN", branch: actor.MaChiNhanh },
  );
  return r.recordset;
}
async function manage(data, actor) {
  access.role(actor, ["ADMIN"]);
  if (data.action === "create") {
    const name = v.text(data.TenChiNhanh, "Tên chi nhánh", 150),
      address = v.text(data.DiaChi, "Địa chỉ", 255),
      phone = v.phone(data.SoDienThoai);
    return db.tx(async (tx) => {
      const r = await db.query(
        `INSERT INTO ChiNhanh(TenChiNhanh,DiaChi,SoDienThoai,TrangThai) OUTPUT INSERTED.* VALUES(@name,@address,@phone,'open')`,
        { name, address, phone },
        tx,
      );
      const id = r.recordset[0].MaChiNhanh;
      await db.query(
        "INSERT INTO MayPOS(MaChiNhanh,TenMay) VALUES(@id,N'Quầy POS chính')",
        { id },
        tx,
      );
      return {
        branch: r.recordset[0],
        message: "Đã tạo chi nhánh và quầy POS.",
      };
    });
  }
  assert(data.action === "status", 400, "Thao tác chi nhánh không hợp lệ.");
  const id = v.id(data.MaChiNhanh),
    status = v.choice(data.TrangThai, ["open", "busy", "closed"], "Trạng thái");
  const r = await db.query(
    "UPDATE ChiNhanh SET TrangThai=@status OUTPUT INSERTED.* WHERE MaChiNhanh=@id",
    { id, status },
  );
  assert(r.recordset[0], 404, "Không tìm thấy chi nhánh.");
  return { branch: r.recordset[0], message: "Đã cập nhật chi nhánh." };
}
async function getReport(query, actor) {
  access.role(actor, access.managers);
  const branch = access.branch(actor, query.branchId);
  const fromDate = v.date(query.from),
    toDate = v.date(query.to);
  assert(toDate >= fromDate, 400, "Ngày kết thúc phải sau ngày bắt đầu.");
  const from = new Date(fromDate + "T00:00:00+07:00"),
    to = new Date(new Date(toDate + "T00:00:00+07:00").getTime() + 86400000);
  const summary = await db.query(
    `SELECT COUNT(*) AS SoDon,ISNULL(SUM(CASE WHEN TrangThaiThanhToan='paid' THEN TongPhaiTra ELSE 0 END),0) AS DoanhThu,ISNULL(SUM(CASE WHEN TrangThaiThanhToan='refunded' THEN TongPhaiTra ELSE 0 END),0) AS TienHoan,ISNULL(SUM(CASE WHEN TrangThaiDonHang='Cancelled' THEN 1 ELSE 0 END),0) AS DonHuy FROM DonHang WHERE MaChiNhanh=@branch AND ThoiGianDat>=@from AND ThoiGianDat<@to`,
    { branch, from, to },
  );
  const top = await db.query(
    `SELECT TOP 10 ct.TenSanPhamLuuTru,SUM(ct.SoLuong) AS SoLuong,SUM(ct.SoLuong*ct.DonGiaBan) AS TienHang FROM ChiTietDonHang ct JOIN DonHang dh ON ct.MaDonHang=dh.MaDonHang WHERE dh.MaChiNhanh=@branch AND dh.ThoiGianDat>=@from AND dh.ThoiGianDat<@to AND dh.TrangThaiThanhToan='paid' GROUP BY ct.TenSanPhamLuuTru ORDER BY SoLuong DESC`,
    { branch, from, to },
  );
  const methods = await db.query(
    `SELECT gd.PhuongThuc,SUM(CASE WHEN gd.LoaiGiaoDich='PAYMENT' THEN gd.SoTienThanhToan ELSE -gd.SoTienThanhToan END) AS ThuRong FROM GiaoDichThanhToan gd JOIN DonHang dh ON gd.MaDonHang=dh.MaDonHang WHERE dh.MaChiNhanh=@branch AND gd.ThoiGian>=@from AND gd.ThoiGian<@to GROUP BY gd.PhuongThuc`,
    { branch, from, to },
  );
  return {
    summary: summary.recordset[0],
    topProducts: top.recordset,
    paymentMethods: methods.recordset,
  };
}

module.exports = { getAllBranches, manage, getReport };
