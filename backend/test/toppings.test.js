const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { normalizeItems, calculateTotals } = require("../src/lib/business");
const db = require("../src/config/db"),
  products = require("../src/models/productModel"),
  orders = require("../src/models/orderModel"),
  { memoryDB } = require("./helpers/memory-db");
const catalog = [
  {
    MaSanPham: 1,
    TenSize: "M",
    GiaBan: 39000,
    TenSanPham: "Bạc xỉu",
    LoaiSanPham: "DO_UONG",
    TrangThai: "active",
    DangBan: true,
  },
];
const top = {
  MaTopping: 21,
  TenTopping: "Thêm sữa",
  GiaBan: 5000,
  TrangThai: "active",
};
test("Topping tính theo giá server × phần mỗi ly × số ly", () => {
  const items = normalizeItems([
    {
      MaSanPham: 1,
      SoLuong: 2,
      Toppings: [{ MaTopping: 21, SoLuong: 3, DonGia: 1 }],
    },
  ]);
  assert.equal(calculateTotals(items, catalog, null, [top]).total, 108000);
});
test("Topping ẩn/không tồn tại bị từ chối", () => {
  const items = normalizeItems([
    { MaSanPham: 1, SoLuong: 1, Toppings: [{ MaTopping: 21 }] },
  ]);
  assert.throws(() => calculateTotals(items, catalog, null, []), {
    status: 400,
  });
  assert.throws(
    () =>
      calculateTotals(items, catalog, null, [{ ...top, TrangThai: "hidden" }]),
    { status: 400 },
  );
});
test("Topping lặp, số phần sai và null bị từ chối", () => {
  for (const Toppings of [
    [{ MaTopping: 21 }, { MaTopping: 21 }],
    [{ MaTopping: 21, SoLuong: 0 }],
    [{ MaTopping: 21, SoLuong: 6 }],
    [null],
  ])
    assert.throws(
      () => normalizeItems([{ MaSanPham: 1, SoLuong: 1, Toppings }]),
      { status: 400 },
    );
  assert.throws(() => normalizeItems([null]), { status: 400 });
});
test("Món ăn theo phần không nhận topping đồ uống", () => {
  const food = [{ ...catalog[0], LoaiSanPham: "MON_AN", TenSize: "PHAN" }];
  assert.throws(
    () =>
      calculateTotals(
        normalizeItems([
          {
            MaSanPham: 1,
            TenSize: "PHAN",
            SoLuong: 1,
            Toppings: [{ MaTopping: 21 }],
          },
        ]),
        food,
        null,
        [top],
      ),
    { status: 400 },
  );
});
test("Hóa đơn lưu topping và tổng tiền thực thu", async (t) => {
  const m = memoryDB(t, db, products);
  const r = await orders.createOrderTransaction(
    {
      MaChiNhanh: 1,
      MaPhienCa: 1,
      IdempotencyKey: randomUUID(),
      PhuongThucThanhToan: "CASH",
      TienKhachDua: 100000,
      Items: [{ MaSanPham: 1, SoLuong: 2, Toppings: [{ MaTopping: 21 }] }],
    },
    { MaNhanVien: 1, MaChiNhanh: 1, Role: "ADMIN" },
  );
  assert.equal(r.TongPhaiTra, 88000);
  assert.equal(m.state.toppingLines.length, 1);
  assert.equal(m.state.lines[0].DonGiaBan, 44000);
});
