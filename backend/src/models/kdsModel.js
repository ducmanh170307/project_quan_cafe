// Phụ trách: Trúc.
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
const { lockBranch } = require("../lib/locks");
const orders = require("./orderModel");
const allowed = ["ADMIN", "MANAGER", "BARISTA"];
async function getActiveKDSOrders(branchId, actor) {
  access.role(actor, [...allowed, "CASHIER"]);
  const branch = access.branch(actor, branchId);
  const r = await db.query(
    `SELECT * FROM HangDoiPhaChe_KDS WHERE MaChiNhanh=@branch AND TrangThaiThanhToan='paid' AND TrangThaiDonHang IN('Confirmed','Preparing','Ready') ORDER BY ThoiGianDat,MaChiTietDon`,
    { branch },
  );
  return r.recordset;
}
async function update(data, actor) {
  if (data.Action === "cancel_refund")
    return orders.cancelAndRefundOrder(data, actor);
  access.role(actor, allowed);
  const id = v.id(data.MaDonHang),
    branch = await orders.orderBranch(id, actor);
  assert(
    ["complete_order", "remake_item"].includes(data.Action),
    400,
    "Thao tác KDS không hợp lệ.",
  );
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    const r = await db.query(
        "SELECT * FROM DonHang WITH(UPDLOCK,HOLDLOCK) WHERE MaDonHang=@id",
        { id },
        tx,
      ),
      order = r.recordset[0];
    if (
      data.Action === "complete_order" &&
      order.TrangThaiDonHang === "Completed"
    )
      return { message: "Đơn đã hoàn tất.", repeated: true };
    assert(
      order.TrangThaiThanhToan === "paid" &&
        ["Confirmed", "Preparing", "Ready"].includes(order.TrangThaiDonHang),
      409,
      "Đơn không ở trạng thái có thể pha chế.",
    );
    if (data.Action === "complete_order") {
      await db.query(
        `UPDATE ChiTietDonHang SET TrangThaiPhaChe='Done' WHERE MaDonHang=@id; UPDATE DonHang SET TrangThaiDonHang='Completed' WHERE MaDonHang=@id`,
        { id },
        tx,
      );
      return {
        message: "Đã hoàn tất pha chế và giao món.",
      };
    }
    const lineId = v.id(data.MaChiTietDon),
      qty = v.number(data.SoLuongLamLai ?? 1, "Số món làm lại", {
        min: 1,
        max: 1000,
        integer: true,
      });
    const lines = await db.query(
      "SELECT * FROM ChiTietDonHang WHERE MaDonHang=@id AND MaChiTietDon=@lineId",
      { id, lineId },
      tx,
    );
    assert(
      lines.recordset[0] && qty <= lines.recordset[0].SoLuong,
      400,
      "Số món làm lại vượt số lượng của dòng đơn.",
    );

    await db.query(
      `UPDATE ChiTietDonHang SET SoLanLamLai=SoLanLamLai+@qty,TrangThaiPhaChe='Remake' WHERE MaChiTietDon=@lineId`,
      { lineId, qty },
      tx,
    );
    return {
      message: "Đã ghi nhận số món làm lại.",
    };
  });
}
module.exports = { getActiveKDSOrders, update };
