const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const db = require("../src/config/db"),
  products = require("../src/models/productModel"),
  orders = require("../src/models/orderModel"),
  shifts = require("../src/models/shiftModel"),
  kds = require("../src/models/kdsModel"),
  { memoryDB } = require("./helpers/memory-db");
const actor = { MaNhanVien: 1, MaChiNhanh: 1, Role: "ADMIN" };
const payload = (extra) => ({
  MaChiNhanh: 1,
  MaPhienCa: 1,
  IdempotencyKey: randomUUID(),
  PhuongThucThanhToan: "CASH",
  TienKhachDua: 100000,
  Items: [{ MaSanPham: 1, SoLuong: 2 }],
  ...extra,
});
const promo = (extra) => ({
  MaKhuyenMai: 1,
  MaCode: "CAFE10",
  TenChuongTrinh: "Giảm 10%",
  TrangThai: "active",
  NgayBatDau: new Date("2020-01-01"),
  NgayKetThuc: new Date("2099-01-01"),
  LoaiKhuyenMai: "PERCENT",
  GiaTriGiam: 10,
  DonToiThieu: 50000,
  GiamToiDa: 30000,
  GioiHanLuotDung: null,
  SoLuotDaDung: 0,
  MaChiNhanh: null,
  ...extra,
});
test("Bán hàng tính giá server và số dư tiền mặt", async (t) => {
  const m = memoryDB(t, db, products),
    r = await orders.createOrderTransaction(payload({ TongPhaiTra: 1 }), actor);
  assert.equal(r.TongPhaiTra, 78000);
  assert.equal(r.TienThua, 22000);
  assert.equal(m.state.shifts[0].TongThuTienMat, 78000);
});
test("Gửi trùng đồng thời chỉ có một hóa đơn và giao dịch", async (t) => {
  const m = memoryDB(t, db, products),
    p = payload(),
    [a, b] = await Promise.all([
      orders.createOrderTransaction(p, actor),
      orders.createOrderTransaction(p, actor),
    ]);
  assert.equal(a.MaDonHang, b.MaDonHang);
  assert.equal(m.state.orders.length, 1);
  assert.equal(m.state.payments.length, 1);
});
test("Reuse UUID với nội dung khác bị từ chối", async (t) => {
  memoryDB(t, db, products);
  const p = payload();
  await orders.createOrderTransaction(p, actor);
  await assert.rejects(
    () =>
      orders.createOrderTransaction(
        { ...p, Items: [{ MaSanPham: 1, SoLuong: 1 }] },
        actor,
      ),
    { status: 409 },
  );
});
test("Thiếu tiền rollback hóa đơn và lượt voucher", async (t) => {
  const m = memoryDB(t, db, products);
  m.state.promos.push(promo());
  await assert.rejects(
    () =>
      orders.createOrderTransaction(
        payload({ MaCode: "CAFE10", TienKhachDua: 100 }),
        actor,
      ),
    { status: 400 },
  );
  assert.equal(m.state.orders.length, 0);
  assert.equal(m.state.promos[0].SoLuotDaDung, 0);
});
test("Đơn món ăn theo phần và đồ uống có thể bán chung", async (t) => {
  const m = memoryDB(t, db, products),
    r = await orders.createOrderTransaction(
      payload({
        TienKhachDua: 200000,
        Items: [
          { MaSanPham: 1, SoLuong: 1 },
          { MaSanPham: 2, TenSize: "PHAN", SoLuong: 2 },
        ],
      }),
      actor,
    );
  assert.equal(r.TongPhaiTra, 109000);
  assert.equal(m.state.lines.length, 2);
});
test("Ca đóng hoặc thuộc chi nhánh khác không được bán", async (t) => {
  const m = memoryDB(t, db, products);
  m.state.shifts[0].TrangThai = "closed";
  await assert.rejects(() => orders.createOrderTransaction(payload(), actor), {
    status: 409,
  });
  m.state.shifts[0].TrangThai = "open";
  m.state.shifts[0].MaChiNhanh = 2;
  await assert.rejects(() => orders.createOrderTransaction(payload(), actor), {
    status: 400,
  });
});
test("Thẻ/chuyển khoản cần xác nhận và không cộng két tiền mặt", async (t) => {
  const m = memoryDB(t, db, products);
  await assert.rejects(
    () =>
      orders.createOrderTransaction(
        payload({ PhuongThucThanhToan: "TRANSFER" }),
        actor,
      ),
    { status: 400 },
  );
  await orders.createOrderTransaction(
    payload({ PhuongThucThanhToan: "TRANSFER", XacNhanThanhToan: true }),
    actor,
  );
  assert.equal(m.state.shifts[0].TongThuTienMat, 0);
});
test("Hoàn tiền mặt một lần, chuyển khoản không giảm két", async (t) => {
  const m = memoryDB(t, db, products),
    a = await orders.createOrderTransaction(payload(), actor);
  for (let i = 0; i < 2; i++)
    await orders.cancelAndRefundOrder(
      { MaDonHang: a.MaDonHang, LyDo: "Khách hủy" },
      actor,
    );
  assert.equal(m.state.shifts[0].TongHoanTienMat, 78000);
  const b = await orders.createOrderTransaction(
    payload({ PhuongThucThanhToan: "TRANSFER", XacNhanThanhToan: true }),
    actor,
  );
  await orders.cancelAndRefundOrder(
    { MaDonHang: b.MaDonHang, LyDo: "Khách hủy" },
    actor,
  );
  assert.equal(m.state.shifts[0].TongHoanTienMat, 78000);
  assert.equal(
    m.state.payments.filter((p) => p.LoaiGiaoDich === "REFUND").length,
    2,
  );
});
test("Cashier không được hoàn đơn đã thu tiền", async (t) => {
  memoryDB(t, db, products);
  const r = await orders.createOrderTransaction(payload(), actor);
  await assert.rejects(
    () =>
      orders.cancelAndRefundOrder(
        { MaDonHang: r.MaDonHang, LyDo: "Test" },
        { ...actor, Role: "CASHIER" },
      ),
    { status: 403 },
  );
});
test("KDS làm lại ghi số lượng; hoàn tất idempotent và mở đường chốt ca", async (t) => {
  const m = memoryDB(t, db, products),
    r = await orders.createOrderTransaction(payload(), actor);
  await assert.rejects(
    () =>
      shifts.closeShiftRecord(
        { MaPhienCa: 1, TienMatThucTeCuoiCa: 1078000 },
        actor,
      ),
    { status: 409 },
  );
  await kds.update(
    {
      Action: "remake_item",
      MaDonHang: r.MaDonHang,
      MaChiTietDon: 1,
      SoLuongLamLai: 1,
    },
    actor,
  );
  assert.equal(m.state.lines[0].SoLanLamLai, 1);
  await kds.update({ Action: "complete_order", MaDonHang: r.MaDonHang }, actor);
  await kds.update({ Action: "complete_order", MaDonHang: r.MaDonHang }, actor);
  await assert.rejects(
    () =>
      shifts.closeShiftRecord(
        { MaPhienCa: 1, TienMatThucTeCuoiCa: 1077000 },
        actor,
      ),
    { status: 400 },
  );
  const closed = await shifts.closeShiftRecord(
    {
      MaPhienCa: 1,
      TienMatThucTeCuoiCa: 1077000,
      LyDoChenhLechCuoiCa: "Thiếu khi đếm",
    },
    actor,
  );
  assert.equal(closed.difference, -1000);
});
test("Báo giá voucher không tạo đơn hoặc tiêu lượt", async (t) => {
  const m = memoryDB(t, db, products);
  m.state.promos.push(promo());
  const q = await orders.quote(
    { MaChiNhanh: 1, Items: [{ MaSanPham: 1, SoLuong: 2 }], MaCode: "CAFE10" },
    actor,
  );
  assert.equal(q.discount, 7800);
  assert.equal(q.total, 70200);
  assert.equal(m.state.orders.length, 0);
  assert.equal(m.state.promos[0].SoLuotDaDung, 0);
});
test("Áp voucher khi thanh toán, ghi lượt một lần và cộng điểm theo tiền đã giảm", async (t) => {
  const m = memoryDB(t, db, products);
  m.state.promos.push(promo());
  const p = payload({
      MaCode: "CAFE10",
      SoDienThoaiKhach: "0999999999",
      TongDuKien: 70200,
    }),
    r = await orders.createOrderTransaction(p, actor);
  await orders.createOrderTransaction(p, actor);
  assert.equal(r.TienGiamGia, 7800);
  assert.equal(r.TongPhaiTra, 70200);
  assert.equal(m.state.promos[0].SoLuotDaDung, 1);
  assert.equal(m.state.customers[0].TongChiTieu, 70200);
  assert.equal(m.state.customers[0].DiemTichLuy, 7);
});
test("Hai giao dịch tranh lượt cuối: chỉ một giao dịch được thu tiền", async (t) => {
  const m = memoryDB(t, db, products);
  m.state.promos.push(promo({ GioiHanLuotDung: 1 }));
  const r = await Promise.allSettled([
    orders.createOrderTransaction(payload({ MaCode: "CAFE10" }), actor),
    orders.createOrderTransaction(payload({ MaCode: "CAFE10" }), actor),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(m.state.payments.length, 1);
  assert.equal(m.state.promos[0].SoLuotDaDung, 1);
});
test("Thay đổi tổng tiền sau xem trước cần tính lại", async (t) => {
  const m = memoryDB(t, db, products);
  await assert.rejects(
    () => orders.createOrderTransaction(payload({ TongDuKien: 1 }), actor),
    { status: 409 },
  );
  assert.equal(m.state.orders.length, 0);
});
test("Đơn online chưa thu tiền chưa tiêu lượt; có thể áp mã khi thu tại quầy", async (t) => {
  const m = memoryDB(t, db, products);
  m.state.promos.push(promo());
  const r = await orders.createOrderTransaction(
    {
      MaChiNhanh: 1,
      IdempotencyKey: randomUUID(),
      SoDienThoaiKhach: "0999999999",
      TenKhachHang: "Ý",
      Items: [{ MaSanPham: 1, SoLuong: 2 }],
    },
    null,
    true,
  );
  assert.equal(r.TrangThaiThanhToan, "unpaid");
  assert.equal(m.state.promos[0].SoLuotDaDung, 0);
  const quote = await orders.quotePayment(
    { MaDonHang: r.MaDonHang, MaCode: "CAFE10" },
    actor,
  );
  assert.equal(quote.total, 70200);
  const paid = await orders.pay(
    {
      MaDonHang: r.MaDonHang,
      MaPhienCa: 1,
      MaCode: "CAFE10",
      TongDuKien: 70200,
      PhuongThucThanhToan: "CASH",
      TienKhachDua: 100000,
    },
    actor,
  );
  assert.equal(paid.TongPhaiTra, 70200);
  assert.equal(m.state.promos[0].SoLuotDaDung, 1);
});
