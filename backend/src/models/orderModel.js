// Phụ trách: Trúc.
const { randomUUID, createHash } = require("node:crypto");
const db = require("../config/db");
const v = require("../lib/validation");
const access = require("../lib/access");
const { assert } = require("../lib/errors");
const { normalizeItems, calculateTotals } = require("../lib/business");
const { lockBranch, lockShift } = require("../lib/locks");
const products = require("./productModel");
const promos = require("./promoModel");
async function getInitDataByBranch(branchId, actor) {
  access.role(actor, access.sellers);
  const branch = access.branch(actor, branchId);
  return {
    products: await products.catalog(branch),
    toppings: await products.getToppings(),
    vouchers: await promos.available(branch),
  };
}
async function receipt(id, tx) {
  const r = await db.query(
    `/* order:receipt */ SELECT dh.MaDonHang,dh.MaDonHienThi,dh.SoThuTuGoiMon,dh.TongTienHang,dh.TienGiamGia,dh.TongPhaiTra,dh.TrangThaiThanhToan,dh.TrangThaiDonHang,ISNULL(gd.TienThuaTraKhach,0) AS TienThua FROM DonHang dh LEFT JOIN GiaoDichThanhToan gd ON dh.MaDonHang=gd.MaDonHang AND gd.LoaiGiaoDich='PAYMENT' WHERE dh.MaDonHang=@id`,
    { id },
    tx,
  );
  return r.recordset[0];
}
async function customer(data, tx) {
  if (!data.phone) return null;
  const r = await db.query(
    "SELECT MaKhachHang FROM KhachHang WITH(UPDLOCK,HOLDLOCK) WHERE SoDienThoai=@phone",
    { phone: data.phone },
    tx,
  );
  if (r.recordset[0]) return r.recordset[0].MaKhachHang;
  const n = await db.query(
    "INSERT INTO KhachHang(HoTen,SoDienThoai) OUTPUT INSERTED.MaKhachHang VALUES(@name,@phone)",
    { phone: data.phone, name: data.name || "Khách thành viên" },
    tx,
  );
  return n.recordset[0].MaKhachHang;
}
async function creditCustomer(order, tx, sign) {
  if (!order.MaKhachHang) return;
  const points =
    sign > 0
      ? Math.floor(Number(order.TongPhaiTra) / 10000)
      : Number(order.DiemDaCong);
  await db.query(
    `UPDATE KhachHang SET DiemTichLuy=CASE WHEN DiemTichLuy+@points<0 THEN 0 ELSE DiemTichLuy+@points END,TongChiTieu=CASE WHEN TongChiTieu+@money<0 THEN 0 ELSE TongChiTieu+@money END WHERE MaKhachHang=@id; UPDATE KhachHang SET HangThanhVien=CASE WHEN TongChiTieu>=3000000 THEN 'Gold' WHEN TongChiTieu>=1000000 THEN 'Silver' ELSE 'Member' END WHERE MaKhachHang=@id`,
    {
      id: order.MaKhachHang,
      points: sign * points,
      money: sign * Number(order.TongPhaiTra),
    },
    tx,
  );
  if (sign > 0)
    await db.query(
      "UPDATE DonHang SET DiemDaCong=@points WHERE MaDonHang=@id",
      { points, id: order.MaDonHang },
      tx,
    );
}
async function capture(tx, order, shiftId, payment, actor) {
  if (order.TrangThaiThanhToan === "paid") return receipt(order.MaDonHang, tx);
  const shift = await lockShift(tx, shiftId, actor);
  assert(
    shift.MaChiNhanh === order.MaChiNhanh,
    400,
    "Phiên ca không thuộc chi nhánh của đơn.",
  );
  assert(
    order.TrangThaiThanhToan === "unpaid" &&
      order.TrangThaiDonHang !== "Cancelled",
    409,
    "Đơn không thể thanh toán.",
  );
  const voucher = Object.hasOwn(payment, "MaCode")
    ? payment.MaCode
      ? await promos.find(payment.MaCode, tx)
      : null
    : order.MaKhuyenMai
      ? await promos.byId(order.MaKhuyenMai, tx)
      : null;
  const discount = require("../lib/business").calculateDiscount(
    Number(order.TongTienHang),
    voucher,
    new Date(),
    order.MaChiNhanh,
  );
  const revisedTotal = Number(order.TongTienHang) - discount;
  if (payment.TongDuKien !== undefined)
    assert(
      v.money(payment.TongDuKien, "Tổng dự kiến") === revisedTotal,
      409,
      "Voucher hoặc tổng tiền đã thay đổi. Hãy áp dụng lại.",
    );
  await db.query(
    "/* order:repricing */ UPDATE DonHang SET MaKhuyenMai=@promo,TienGiamGia=@discount,TongPhaiTra=@total WHERE MaDonHang=@id",
    {
      id: order.MaDonHang,
      promo: voucher?.MaKhuyenMai ?? null,
      discount,
      total: revisedTotal,
    },
    tx,
  );
  Object.assign(order, {
    MaKhuyenMai: voucher?.MaKhuyenMai ?? null,
    TienGiamGia: discount,
    TongPhaiTra: revisedTotal,
  });
  const method = v.choice(
    payment.PhuongThucThanhToan,
    ["CASH", "CARD", "TRANSFER"],
    "Phương thức thanh toán",
  );
  const total = Number(order.TongPhaiTra),
    tendered =
      method === "CASH"
        ? v.money(payment.TienKhachDua, "Tiền khách đưa")
        : total;
  assert(tendered >= total, 400, "Tiền khách đưa không đủ thanh toán.");
  assert(
    method === "CASH" || payment.XacNhanThanhToan === true,
    400,
    "Thu ngân cần xác nhận đã kiểm tra giao dịch thẻ/chuyển khoản.",
  );

  await promos.claim(voucher, order.MaChiNhanh, tx);
  await db.query(
    `/* order:payment */ INSERT INTO GiaoDichThanhToan(MaDonHang,MaPhienCa,PhuongThuc,LoaiGiaoDich,SoTienThanhToan,TienKhachDua,TienThuaTraKhach,NguoiTao) VALUES(@id,@shift,@method,'PAYMENT',@total,@tendered,@change,@actor); UPDATE DonHang SET MaPhienCa=@shift,TrangThaiThanhToan='paid',TrangThaiDonHang='Preparing' WHERE MaDonHang=@id`,
    {
      id: order.MaDonHang,
      shift: shiftId,
      method,
      total,
      tendered,
      change: tendered - total,
      actor: actor.MaNhanVien,
    },
    tx,
  );
  if (method === "CASH")
    await db.query(
      "UPDATE PhienLamViecPOS SET TongThuTienMat=TongThuTienMat+@total WHERE MaPhienCa=@shift",
      { total, shift: shiftId },
      tx,
    );
  await creditCustomer(order, tx, 1);
  return {
    ...(await receipt(order.MaDonHang, tx)),
    TienThua: tendered - total,
  };
}
async function createOrderTransaction(data, actor = null, online = false) {
  if (!online) access.role(actor, access.sellers);
  const branch = online
    ? v.id(data.MaChiNhanh, "Chi nhánh")
    : access.branch(actor, data.MaChiNhanh);
  const normalized = {
    branch,
    actor: online ? null : actor.MaNhanVien,
    source: online ? "APP" : "POS",
    items: normalizeItems(data.Items),
    phone: v.phone(data.SoDienThoaiKhach, !online),
    name: v.text(data.TenKhachHang, "Tên khách", 100, !online),
    code: v.text(data.MaCode, "Voucher", 40, true).toUpperCase(),
    delivery: v.choice(
      data.HinhThucNhan || (online ? "Take_Away" : "Dine_In"),
      ["Dine_In", "Take_Away", "Delivery"],
      "Hình thức nhận",
    ),
    address: v.text(data.DiaChiGiaoHang, "Địa chỉ giao hàng", 300, true),
  };
  if (normalized.delivery === "Delivery")
    assert(normalized.address, 400, "Vui lòng nhập địa chỉ giao hàng.");
  if (!online) {
    normalized.shift = v.id(data.MaPhienCa, "Phiên ca");
    normalized.method = v.choice(
      data.PhuongThucThanhToan,
      ["CASH", "CARD", "TRANSFER"],
      "Thanh toán",
    );
    normalized.tendered =
      normalized.method === "CASH"
        ? v.money(data.TienKhachDua, "Tiền khách đưa")
        : 0;
    normalized.confirmed = data.XacNhanThanhToan === true;
  }
  const key = v.uuid(data.IdempotencyKey),
    fingerprint = createHash("sha256")
      .update(JSON.stringify(normalized))
      .digest("hex");
  return db.tx(async (tx) => {
    const cn = await lockBranch(tx, branch);
    const duplicate = await db.query(
      "/* order:duplicate */ SELECT * FROM DonHang WITH(UPDLOCK,HOLDLOCK) WHERE IdempotencyKey=@key",
      { key },
      tx,
    );
    if (duplicate.recordset[0]) {
      assert(
        duplicate.recordset[0].YeuCauHash === fingerprint &&
          duplicate.recordset[0].MaChiNhanh === branch,
        409,
        "Mã gửi đơn đã được dùng cho nội dung khác.",
      );
      return {
        ...(await receipt(duplicate.recordset[0].MaDonHang, tx)),
        repeated: true,
      };
    }
    assert(
      online ? cn.TrangThai === "open" : cn.TrangThai !== "closed",
      409,
      "Chi nhánh hiện tạm ngừng nhận đơn.",
    );
    if (!online) {
      const shift = await lockShift(tx, normalized.shift, actor);
      assert(
        shift.MaChiNhanh === branch,
        400,
        "Phiên ca không thuộc chi nhánh.",
      );
    }
    const prices = await products.catalog(branch, tx),
      promo = normalized.code ? await promos.find(normalized.code, tx) : null;
    const totals = calculateTotals(
        normalized.items,
        prices,
        promo,
        await products.getToppings(null, tx),
        branch,
      ),
      customerId = await customer(normalized, tx);
    if (data.TongDuKien !== undefined)
      assert(
        v.money(data.TongDuKien, "Tổng dự kiến") === totals.total,
        409,
        "Giá hoặc voucher đã thay đổi. Hãy tính lại đơn trước khi thanh toán.",
      );
    const code = `${normalized.source}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 12)}`;
    const r = await db.query(
      `/* order:insert */ INSERT INTO DonHang(MaDonHienThi,SoThuTuGoiMon,MaChiNhanh,MaNhanVienTao,MaKhachHang,MaKhuyenMai,IdempotencyKey,YeuCauHash,KenhBan,HinhThucNhan,DiaChiGiaoHang,TongTienHang,TienGiamGia,TongPhaiTra,TrangThaiThanhToan,TrangThaiDonHang) OUTPUT INSERTED.* VALUES(@code,0,@branch,@actor,@customerId,@promoId,@key,@fingerprint,@source,@delivery,@address,@subtotal,@discount,@total,'unpaid','Pending_Payment')`,
      {
        code,
        branch,
        actor: normalized.actor,
        customerId,
        promoId: promo?.MaKhuyenMai ?? null,
        key,
        fingerprint,
        source: normalized.source,
        delivery: normalized.delivery,
        address: normalized.address,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
      },
      tx,
    );
    const order = r.recordset[0],
      id = order.MaDonHang;
    await db.query(
      "UPDATE DonHang SET SoThuTuGoiMon=MaDonHang WHERE MaDonHang=@id",
      { id },
      tx,
    );
    for (const item of totals.lines) {
      const line = await db.query(
        `/* order:line */ INSERT INTO ChiTietDonHang(MaDonHang,MaSanPham,TenSanPhamLuuTru,TenSize,SoLuong,DonGiaBan,MucDuong,MucDa,GhiChuMon) OUTPUT INSERTED.MaChiTietDon VALUES(@id,@product,@name,@size,@qty,@price,@sugar,@ice,@note)`,
        {
          id,
          product: item.MaSanPham,
          name: item.TenSanPham,
          size: item.TenSize,
          qty: item.SoLuong,
          price: item.DonGia,
          sugar: item.MucDuong,
          ice: item.MucDa,
          note: item.GhiChu,
        },
        tx,
      );
      for (const topping of item.Toppings) {
        const lineId = line.recordset[0].MaChiTietDon;
        await db.query(
          "/* order:topping */ INSERT INTO ChiTietDon_Topping(MaChiTietDon,MaTopping,TenToppingLuuTru,DonGia,SoLuong) VALUES(@line,@topping,@name,@price,@quantity)",
          {
            line: lineId,
            topping: topping.MaTopping,
            name: topping.TenTopping,
            price: topping.DonGia,
            quantity: topping.SoLuong,
          },
          tx,
        );
      }
    }
    return online
      ? receipt(id, tx)
      : capture(tx, order, normalized.shift, data, actor);
  });
}
async function quote(data, actor = null, online = false) {
  if (!online) access.role(actor, access.sellers);
  const branch = online
      ? v.id(data.MaChiNhanh)
      : access.branch(actor, data.MaChiNhanh),
    items = normalizeItems(data.Items);
  const code = v.text(data.MaCode, "Voucher", 40, true).toUpperCase(),
    promo = code ? await promos.find(code) : null;
  const totals = calculateTotals(
    items,
    await products.catalog(branch),
    promo,
    await products.getToppings(),
    branch,
  );
  return {
    ...totals,
    voucher: promo
      ? { MaCode: promo.MaCode, TenChuongTrinh: promo.TenChuongTrinh }
      : null,
  };
}
async function quotePayment(data, actor) {
  access.role(actor, access.sellers);
  const id = v.id(data.MaDonHang),
    branch = await orderBranch(id, actor);
  const order = (
    await db.query("SELECT * FROM DonHang WHERE MaDonHang=@id", { id })
  ).recordset[0];
  assert(
    order.TrangThaiThanhToan === "unpaid" &&
      order.TrangThaiDonHang !== "Cancelled",
    409,
    "Đơn không còn ở trạng thái chờ thanh toán.",
  );
  const code = v.text(data.MaCode, "Voucher", 40, true).toUpperCase(),
    promo = code ? await promos.find(code) : null,
    discount = require("../lib/business").calculateDiscount(
      Number(order.TongTienHang),
      promo,
      new Date(),
      branch,
    );
  return {
    subtotal: Number(order.TongTienHang),
    discount,
    total: Number(order.TongTienHang) - discount,
    voucher: promo
      ? { MaCode: promo.MaCode, TenChuongTrinh: promo.TenChuongTrinh }
      : null,
  };
}
async function orderBranch(id, actor) {
  const r = await db.query(
    "SELECT MaChiNhanh FROM DonHang WHERE MaDonHang=@id",
    { id },
  );
  assert(r.recordset[0], 404, "Không tìm thấy đơn hàng.");
  return access.branch(actor, r.recordset[0].MaChiNhanh);
}
async function pay(data, actor) {
  access.role(actor, access.sellers);
  const id = v.id(data.MaDonHang),
    shift = v.id(data.MaPhienCa),
    branch = await orderBranch(id, actor);
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    const r = await db.query(
      "SELECT * FROM DonHang WITH(UPDLOCK,HOLDLOCK) WHERE MaDonHang=@id",
      { id },
      tx,
    );
    return capture(tx, r.recordset[0], shift, data, actor);
  });
}
async function list(query, actor) {
  access.role(actor, access.sellers);
  const branch = access.branch(actor, query.branchId),
    r = await db.query(
      `SELECT TOP 100 dh.*,km.MaCode,kh.HoTen AS TenKhachHang,kh.SoDienThoai AS SoDienThoaiKhach FROM DonHang dh LEFT JOIN KhachHang kh ON dh.MaKhachHang=kh.MaKhachHang LEFT JOIN ChuongTrinhKhuyenMai km ON dh.MaKhuyenMai=km.MaKhuyenMai WHERE dh.MaChiNhanh=@branch ORDER BY dh.MaDonHang DESC`,
      { branch },
    );
  const lines = await db.query(
    "SELECT ct.* FROM HangDoiPhaChe_KDS ct JOIN DonHang dh ON ct.MaDonHang=dh.MaDonHang WHERE dh.MaChiNhanh=@branch AND ct.MaDonHang IN(SELECT TOP 100 MaDonHang FROM DonHang WHERE MaChiNhanh=@branch ORDER BY MaDonHang DESC)",
    { branch },
  );
  return r.recordset.map((o) => {
    const { YeuCauHash, IdempotencyKey, ...safe } = o;
    return {
      ...safe,
      Items: lines.recordset.filter((l) => l.MaDonHang === o.MaDonHang),
    };
  });
}
async function cancelAndRefundOrder(data, actor) {
  access.role(actor, access.sellers);
  const id = v.id(data.MaDonHang),
    reason = v.text(data.LyDo, "Lý do hủy/hoàn", 500),
    branch = await orderBranch(id, actor);
  return db.tx(async (tx) => {
    await lockBranch(tx, branch);
    const r = await db.query(
        "/* order:refund-lock */ SELECT * FROM DonHang WITH(UPDLOCK,HOLDLOCK) WHERE MaDonHang=@id",
        { id },
        tx,
      ),
      order = r.recordset[0];
    if (order.TrangThaiDonHang === "Cancelled")
      return { message: "Đơn đã hủy trước đó.", repeated: true };
    if (order.TrangThaiThanhToan === "paid") {
      access.role(actor, access.managers);
      const p = await db.query(
        `SELECT * FROM GiaoDichThanhToan WHERE MaDonHang=@id AND LoaiGiaoDich='PAYMENT'`,
        { id },
        tx,
      );
      assert(p.recordset[0], 409, "Không tìm thấy giao dịch để hoàn tiền.");
      // Khóa ca gốc: không sửa sổ đã chốt. Đây là quy tắc phạm vi đồ án.
      await lockShift(tx, order.MaPhienCa, actor);
      const payment = p.recordset[0],
        total = Number(order.TongPhaiTra);
      await db.query(
        `INSERT INTO GiaoDichThanhToan(MaDonHang,MaPhienCa,PhuongThuc,LoaiGiaoDich,SoTienThanhToan,NguoiTao) VALUES(@id,@shift,@method,'REFUND',@total,@actor)`,
        {
          id,
          shift: order.MaPhienCa,
          method: payment.PhuongThuc,
          total,
          actor: actor.MaNhanVien,
        },
        tx,
      );
      if (payment.PhuongThuc === "CASH")
        await db.query(
          "UPDATE PhienLamViecPOS SET TongHoanTienMat=TongHoanTienMat+@total WHERE MaPhienCa=@shift",
          { total, shift: order.MaPhienCa },
          tx,
        );
      await creditCustomer(order, tx, -1);
    }
    await db.query(
      `UPDATE DonHang SET TrangThaiDonHang='Cancelled',TrangThaiThanhToan=CASE WHEN TrangThaiThanhToan='paid' THEN 'refunded' ELSE TrangThaiThanhToan END,LyDoHuyHoan=@reason WHERE MaDonHang=@id; UPDATE ChiTietDonHang SET TrangThaiPhaChe='Cancelled' WHERE MaDonHang=@id`,
      { id, reason },
      tx,
    );
    return {
      message:
        "Đã hủy đơn và ghi nhận hoàn tiền theo phương thức gốc nếu đã thanh toán.",
    };
  });
}
async function detail(id, actor) {
  access.role(actor, access.sellers);
  const orderId = v.id(id);
  await orderBranch(orderId, actor);
  const r = await db.query(
    "SELECT dh.MaDonHang,dh.MaDonHienThi,dh.ThoiGianDat,dh.TongTienHang,dh.TienGiamGia,dh.TongPhaiTra,dh.TrangThaiThanhToan,dh.TrangThaiDonHang,km.MaCode FROM DonHang dh LEFT JOIN ChuongTrinhKhuyenMai km ON dh.MaKhuyenMai=km.MaKhuyenMai WHERE dh.MaDonHang=@id",
    { id: orderId },
  );
  const lines = await db.query(
    "SELECT TenSanPhamLuuTru,TenSize,SoLuong,DonGiaBan,ToppingMoTa FROM HangDoiPhaChe_KDS WHERE MaDonHang=@id",
    { id: orderId },
  );
  return { ...r.recordset[0], Items: lines.recordset };
}
module.exports = {
  quote,
  quotePayment,
  detail,
  getInitDataByBranch,
  createOrderTransaction,
  orderBranch,
  receipt,
  pay,
  list,
  cancelAndRefundOrder,
};
