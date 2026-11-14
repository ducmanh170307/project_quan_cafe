// Phụ trách: Ý.
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
const { expectedCash } = require("../lib/business");
const { lockBranch, lockShift, shiftBranch } = require("../lib/locks");
async function getShiftByBranch(branchId, actor) {
  access.role(actor, access.sellers);
  const branch = access.branch(actor, branchId);
  const r = await db.query(
    `SELECT TOP 20 pc.*,nv.HoTen AS TenThuNgan FROM PhienLamViecPOS pc JOIN NhanVien nv ON pc.ThuNganMoCa=nv.MaNhanVien WHERE pc.MaChiNhanh=@branch ORDER BY pc.MaPhienCa DESC`,
    { branch },
  );
  const activeShift = r.recordset.find((s) => s.TrangThai === "open") || null;
  const cash = activeShift
    ? await db.query(
        `SELECT p.*,nv.HoTen AS TenNguoiTao FROM PhieuThuChiNoiBo p JOIN NhanVien nv ON p.NguoiTao=nv.MaNhanVien WHERE MaPhienCa=@id ORDER BY MaPhieu DESC`,
        { id: activeShift.MaPhienCa },
      )
    : { recordset: [] };
  return {
    activeShift,
    theoreticalCash: activeShift ? expectedCash(activeShift) : 0,
    historyShifts: r.recordset,
    cashflows: cash.recordset,
  };
}
async function createOpenShift(data, actor) {
  access.role(actor, access.sellers);
  const branch = access.branch(actor, data.MaChiNhanh),
    money = v.money(data.TienMatDauCa, "Tiền đầu ca"),
    reason = v.text(data.LyDoLechDauCa, "Ghi chú đầu ca", 500, true);
  return db.tx(async (tx) => {
    const cn = await lockBranch(tx, branch);
    assert(cn.TrangThai !== "closed", 409, "Chi nhánh đang đóng cửa.");
    const current = await db.query(
      `/* shift:current */ SELECT MaPhienCa FROM PhienLamViecPOS WITH(UPDLOCK,HOLDLOCK) WHERE MaChiNhanh=@branch AND TrangThai='open'`,
      { branch },
      tx,
    );
    assert(!current.recordset.length, 409, "Chi nhánh đang có phiên ca mở.");
    const pos = await db.query(
      "SELECT TOP 1 MaMayPOS FROM MayPOS WHERE MaChiNhanh=@branch ORDER BY MaMayPOS",
      { branch },
      tx,
    );
    assert(pos.recordset[0], 409, "Chi nhánh chưa cấu hình máy POS.");
    const r = await db.query(
      `INSERT INTO PhienLamViecPOS(MaMayPOS,MaChiNhanh,ThuNganMoCa,TienMatDauCa,LyDoLechDauCa) OUTPUT INSERTED.* VALUES(@pos,@branch,@actor,@money,@reason)`,
      {
        pos: pos.recordset[0].MaMayPOS,
        branch,
        actor: actor.MaNhanVien,
        money,
        reason,
      },
      tx,
    );
    return { shift: r.recordset[0], message: "Đã mở ca POS." };
  });
}
async function addCashFlow(data, actor) {
  access.role(actor, access.sellers);
  const id = v.id(data.MaPhienCa),
    type = v.choice(data.LoaiPhieu, ["THU", "CHI"], "Loại phiếu"),
    money = v.money(data.SoTien, "Số tiền", 1),
    reason = v.text(data.LyDo, "Lý do thu chi", 500);
  const branch = await shiftBranch(id, actor);
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    const shift = await lockShift(tx, id, actor);
    assert(
      type !== "CHI" || expectedCash(shift) >= money,
      409,
      "Tiền chi vượt số dư tiền mặt của ca.",
    );
    await db.query(
      `INSERT INTO PhieuThuChiNoiBo(MaPhienCa,LoaiPhieu,SoTien,LyDo,NguoiTao) VALUES(@id,@type,@money,@reason,@actor)`,
      { id, type, money, reason, actor: actor.MaNhanVien },
      tx,
    );
    const col = type === "THU" ? "TongThuNoiBo" : "TongChiNoiBo";
    await db.query(
      `UPDATE PhienLamViecPOS SET ${col}=${col}+@money WHERE MaPhienCa=@id`,
      { id, money },
      tx,
    );
    return { message: "Đã lưu phiếu thu chi." };
  });
}
async function closeShiftRecord(data, actor) {
  access.role(actor, access.sellers);
  const id = v.id(data.MaPhienCa),
    actual = v.money(data.TienMatThucTeCuoiCa, "Tiền thực đếm"),
    reason = v.text(data.LyDoChenhLechCuoiCa, "Lý do chênh lệch", 500, true);
  const branch = await shiftBranch(id, actor);
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    const shift = await lockShift(tx, id, actor);
    const pending = await db.query(
      `/* shift:pending */ SELECT COUNT(*) AS Total FROM DonHang WHERE MaPhienCa=@id AND TrangThaiDonHang NOT IN ('Completed','Cancelled')`,
      { id },
      tx,
    );
    assert(
      !pending.recordset[0].Total,
      409,
      "Còn đơn của ca chưa hoàn tất. Hãy xử lý tại màn hình KDS trước.",
    );
    const theoretical = expectedCash(shift),
      difference = actual - theoretical;
    assert(
      difference === 0 || reason.length > 0,
      400,
      "Cần ghi lý do khi két tiền có chênh lệch.",
    );
    await db.query(
      `UPDATE PhienLamViecPOS SET ThoiGianDong=SYSUTCDATETIME(),ThuNganDongCa=@actor,TienMatThucTeCuoiCa=@actual,TienChenhLech=@difference,LyDoChenhLechCuoiCa=@reason,TrangThai='closed' WHERE MaPhienCa=@id`,
      { id, actor: actor.MaNhanVien, actual, difference, reason },
      tx,
    );
    return {
      theoreticalCash: theoretical,
      actualCash: actual,
      difference,
      message: "Đã chốt ca và khóa sổ.",
    };
  });
}
module.exports = {
  getShiftByBranch,
  createOpenShift,
  addCashFlow,
  closeShiftRecord,
};
