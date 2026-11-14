// Ý: tạo/đóng voucher, điều kiện áp dụng và lượt dùng khi thu tiền.
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
const { calculateDiscount } = require("../lib/business");
async function find(code, tx = null) {
  const r = await db.query(
    `SELECT * FROM ChuongTrinhKhuyenMai ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE MaCode=@code`,
    { code: v.text(code, "Mã voucher", 40).toUpperCase() },
    tx,
  );
  assert(r.recordset[0], 400, "Voucher không tồn tại.");
  return r.recordset[0];
}
async function byId(id, tx = null) {
  const r = await db.query(
    `SELECT * FROM ChuongTrinhKhuyenMai ${tx ? "WITH(UPDLOCK,HOLDLOCK)" : ""} WHERE MaKhuyenMai=@id`,
    { id: v.id(id) },
    tx,
  );
  assert(r.recordset[0], 400, "Voucher không còn tồn tại.");
  return r.recordset[0];
}
async function verify(data) {
  const branch = v.id(data.MaChiNhanh, "Chi nhánh"),
    promo = await find(data.MaCode),
    subtotal = v.money(data.TongTienHang, "Tiền hàng"),
    discount = calculateDiscount(subtotal, promo, new Date(), branch);
  return { promo, discount, total: subtotal - discount };
}
async function available(branchId) {
  const branch = v.id(branchId);
  return (
    await db.query(
      "SELECT MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,GiamToiDa,NgayKetThuc FROM ChuongTrinhKhuyenMai WHERE TrangThai='active' AND NgayBatDau<=SYSUTCDATETIME() AND NgayKetThuc>=SYSUTCDATETIME() AND (MaChiNhanh IS NULL OR MaChiNhanh=@branch) AND (GioiHanLuotDung IS NULL OR SoLuotDaDung<GioiHanLuotDung) ORDER BY NgayKetThuc,MaKhuyenMai",
      { branch },
    )
  ).recordset;
}
async function list(actor) {
  access.role(actor, access.managers);
  return (
    await db.query(
      "SELECT km.*,cn.TenChiNhanh FROM ChuongTrinhKhuyenMai km LEFT JOIN ChiNhanh cn ON km.MaChiNhanh=cn.MaChiNhanh WHERE @all=1 OR km.MaChiNhanh=@branch ORDER BY km.MaKhuyenMai DESC",
      { all: actor.Role === "ADMIN", branch: actor.MaChiNhanh },
    )
  ).recordset;
}
async function insertPromotion(data, actor) {
  access.role(actor, access.managers);
  const code = v.text(data.MaCode, "Mã voucher", 40).toUpperCase();
  assert(
    /^[A-Z0-9_-]+$/.test(code),
    400,
    "Mã chỉ gồm chữ không dấu, số, _ và -.",
  );
  const name = v.text(data.TenChuongTrinh, "Tên voucher", 150),
    type = v.choice(data.LoaiKhuyenMai, ["PERCENT", "FIXED"], "Loại giảm giá"),
    value = v.money(data.GiaTriGiam, "Giá trị giảm", 1),
    min = v.money(data.DonToiThieu ?? 0, "Đơn tối thiểu"),
    max = data.GiamToiDa ? v.money(data.GiamToiDa, "Giảm tối đa", 1) : null,
    limit = data.GioiHanLuotDung
      ? v.number(data.GioiHanLuotDung, "Giới hạn lượt", {
          min: 1,
          max: 1000000000,
          integer: true,
        })
      : null;
  assert(
    type !== "PERCENT" || value <= 100,
    400,
    "Phần trăm giảm không vượt 100.",
  );
  const start = new Date(data.NgayBatDau),
    end = new Date(data.NgayKetThuc);
  assert(
    !isNaN(start) && !isNaN(end) && end > start,
    400,
    "Thời hạn voucher không hợp lệ.",
  );
  const branch =
    actor.Role === "ADMIN"
      ? data.MaChiNhanh
        ? v.id(data.MaChiNhanh)
        : null
      : actor.MaChiNhanh;
  await db.query(
    "INSERT INTO ChuongTrinhKhuyenMai(MaCode,TenChuongTrinh,LoaiKhuyenMai,GiaTriGiam,DonToiThieu,GiamToiDa,NgayBatDau,NgayKetThuc,MaChiNhanh,GioiHanLuotDung) VALUES(@code,@name,@type,@value,@min,@max,@start,@end,@branch,@limit)",
    { code, name, type, value, min, max, start, end, branch, limit },
  );
  return { message: "Đã tạo voucher. Khách có thể áp dụng khi thanh toán." };
}
async function setStatus(id, data, actor) {
  access.role(actor, access.managers);
  const status = v.choice(
    data.TrangThai,
    ["active", "inactive"],
    "Trạng thái voucher",
  );
  const r = await db.query(
    "UPDATE ChuongTrinhKhuyenMai SET TrangThai=@status OUTPUT INSERTED.MaKhuyenMai WHERE MaKhuyenMai=@id AND (@all=1 OR MaChiNhanh=@branch)",
    {
      id: v.id(id),
      status,
      all: actor.Role === "ADMIN",
      branch: actor.MaChiNhanh,
    },
  );
  assert(r.recordset[0], 404, "Không tìm thấy voucher thuộc phạm vi quản lý.");
  return { message: "Đã cập nhật voucher." };
}
async function claim(promo, branch, tx) {
  if (!promo) return;
  calculateDiscount(Number.MAX_SAFE_INTEGER, promo, new Date(), branch);
  const r = await db.query(
    "/* voucher:claim */ UPDATE ChuongTrinhKhuyenMai SET SoLuotDaDung=SoLuotDaDung+1 OUTPUT INSERTED.MaKhuyenMai WHERE MaKhuyenMai=@id AND TrangThai='active' AND NgayBatDau<=SYSUTCDATETIME() AND NgayKetThuc>=SYSUTCDATETIME() AND (MaChiNhanh IS NULL OR MaChiNhanh=@branch) AND (GioiHanLuotDung IS NULL OR SoLuotDaDung<GioiHanLuotDung)",
    { id: promo.MaKhuyenMai, branch },
    tx,
  );
  assert(
    r.recordset[0],
    409,
    "Voucher vừa hết hạn/lượt dùng. Hãy áp dụng lại voucher.",
  );
}
async function customers(branchId, actor) {
  access.role(actor, access.managers);
  const branch = access.branch(actor, branchId);
  return (
    await db.query(
      "SELECT TOP 100 kh.HoTen,kh.SoDienThoai,kh.DiemTichLuy,kh.TongChiTieu,kh.HangThanhVien FROM KhachHang kh WHERE EXISTS(SELECT 1 FROM DonHang dh WHERE dh.MaKhachHang=kh.MaKhachHang AND dh.MaChiNhanh=@branch) ORDER BY kh.DiemTichLuy DESC",
      { branch },
    )
  ).recordset;
}
module.exports = {
  find,
  byId,
  verify,
  available,
  list,
  insertPromotion,
  setStatus,
  claim,
  customers,
};
