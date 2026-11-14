const db = require("../config/db");
const access = require("./access");
const { assert } = require("./errors");
async function lockBranch(tx, id) {
  const r = await db.query(
    "/* lock:branch */ SELECT * FROM ChiNhanh WITH(UPDLOCK,HOLDLOCK) WHERE MaChiNhanh=@id",
    { id },
    tx,
  );
  assert(r.recordset[0], 404, "Không tìm thấy chi nhánh.");
  return r.recordset[0];
}
async function lockShift(tx, id, actor) {
  const r = await db.query(
    "/* lock:shift */ SELECT * FROM PhienLamViecPOS WITH(UPDLOCK,HOLDLOCK) WHERE MaPhienCa=@id",
    { id },
    tx,
  );
  const shift = r.recordset[0];
  assert(shift, 404, "Không tìm thấy phiên ca.");
  access.branch(actor, shift.MaChiNhanh);
  assert(
    shift.TrangThai === "open",
    409,
    "Phiên ca đã đóng. Vui lòng tải lại trạng thái ca.",
  );
  return shift;
}
async function shiftBranch(id, actor) {
  const r = await db.query(
    "SELECT MaChiNhanh FROM PhienLamViecPOS WHERE MaPhienCa=@id",
    { id },
  );
  assert(r.recordset[0], 404, "Không tìm thấy phiên ca.");
  return access.branch(actor, r.recordset[0].MaChiNhanh);
}
module.exports = { lockBranch, lockShift, shiftBranch };
