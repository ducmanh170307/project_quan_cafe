const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateDiscount,
  calculateTotals,
  expectedCash,
  normalizeItems,
} = require("../src/lib/business");
const v = require("../src/lib/validation");
const access = require("../src/lib/access");
const { hashPin, verifyPin } = require("../src/lib/security");
const promo = {
  TrangThai: "active",
  NgayBatDau: "2020-01-01",
  NgayKetThuc: "2099-01-01",
  LoaiKhuyenMai: "PERCENT",
  GiaTriGiam: 20,
  DonToiThieu: 50000,
  GiamToiDa: 30000,
};
test("Tổng tiền luôn dùng giá catalog, bỏ qua giá và tổng tiền khách gửi", () => {
  const items = normalizeItems([
    { MaSanPham: 1, SoLuong: 2, DonGia: 1, TenSanPham: "Giả" },
  ]);
  const r = calculateTotals(
    items,
    [
      {
        MaSanPham: 1,
        TenSize: "M",
        GiaBan: 39000,
        TenSanPham: "Bạc xỉu",
        TrangThai: "active",
        DangBan: true,
      },
    ],
    promo,
  );
  assert.equal(r.subtotal, 78000);
  assert.equal(r.discount, 15600);
  assert.equal(r.total, 62400);
  assert.equal(r.lines[0].TenSanPham, "Bạc xỉu");
});
test("Voucher bị giới hạn bởi trần và tiền hàng", () => {
  assert.equal(calculateDiscount(500000, promo), 30000);
  assert.equal(
    calculateDiscount(60000, {
      ...promo,
      LoaiKhuyenMai: "FIXED",
      GiaTriGiam: 100000,
      GiamToiDa: null,
    }),
    60000,
  );
});
test("Chặn voucher hết hạn, chưa có hiệu lực, tắt và đơn thiếu tối thiểu", () => {
  for (const changes of [
    { NgayKetThuc: "2021-01-01" },
    { NgayBatDau: "2090-01-01" },
    { TrangThai: "inactive" },
  ])
    assert.throws(() => calculateDiscount(100000, { ...promo, ...changes }));
  assert.throws(() => calculateDiscount(49000, promo));
});
test("Không bán món ẩn, size không tồn tại hoặc chi nhánh ngừng bán", () => {
  const i = normalizeItems([{ MaSanPham: 1, SoLuong: 1 }]);
  for (const p of [
    [],
    [{ MaSanPham: 1, TenSize: "L", TrangThai: "active" }],
    [{ MaSanPham: 1, TenSize: "M", TrangThai: "hidden" }],
    [{ MaSanPham: 1, TenSize: "M", TrangThai: "active", DangBan: false }],
  ])
    assert.throws(() => calculateTotals(i, p));
});
test("Công thức đối soát trừ hoàn tiền mặt", () =>
  assert.equal(
    expectedCash({
      TienMatDauCa: 1000000,
      TongThuTienMat: 78000,
      TongHoanTienMat: 39000,
      TongThuNoiBo: 100000,
      TongChiNoiBo: 50000,
    }),
    1089000,
  ));
test("Kiểm tra ID, số tiền và số lượng tại backend", () => {
  for (const n of ["", null, undefined, true, NaN, Infinity, -1, 1.5, "1abc"])
    assert.throws(() => v.id(n));
  assert.equal(v.money(0), 0);
  assert.throws(() => v.money(""));
});
test("Giỏ rỗng, số lượng sai, ghi chú vượt giới hạn đều bị từ chối", () => {
  for (const x of [
    [],
    [{ MaSanPham: 1, SoLuong: 0 }],
    [{ MaSanPham: 1, SoLuong: 1.5 }],
    [{ MaSanPham: 1, SoLuong: 1, GhiChu: "x".repeat(301) }],
  ])
    assert.throws(() => normalizeItems(x));
});
test("Ngày lịch không hợp lệ và UUID sai bị từ chối", () => {
  assert.throws(() => v.date("2026-02-30"));
  assert.throws(() => v.date("2026-2-1"));
  assert.equal(v.date("2028-02-29"), "2028-02-29");
  assert.throws(() => v.uuid("duplicate"));
});
test("Phân quyền dựa trên tài khoản server và chi nhánh", () => {
  const a = { Role: "CASHIER", MaChiNhanh: 1 };
  assert.equal(access.branch(a, 1), 1);
  assert.throws(() => access.branch(a, 2));
  assert.throws(() => access.role(a, access.managers));
  assert.equal(access.branch({ Role: "ADMIN" }, 2), 2);
});
test("PIN được băm có salt, xác minh chính xác và không lộ PIN", () => {
  const one = hashPin("123456"),
    two = hashPin("123456");
  assert.notEqual(one, two);
  assert.equal(verifyPin("123456", one), true);
  assert.equal(verifyPin("000000", one), false);
  assert.equal(verifyPin("123456", "bad"), false);
  assert.ok(!one.includes("123456"));
});

test("Voucher giới hạn đúng chi nhánh và chặn hết lượt", () => {
  const sample = {
    TrangThai: "active",
    NgayBatDau: "2020-01-01",
    NgayKetThuc: "2099-01-01",
    LoaiKhuyenMai: "PERCENT",
    GiaTriGiam: 10,
    DonToiThieu: 0,
    MaChiNhanh: 2,
    GioiHanLuotDung: 1,
    SoLuotDaDung: 0,
  };
  assert.throws(() => calculateDiscount(100000, sample, new Date(), 1), {
    status: 400,
  });
  assert.equal(calculateDiscount(100000, sample, new Date(), 2), 10000);
  assert.throws(
    () =>
      calculateDiscount(100000, { ...sample, SoLuotDaDung: 1 }, new Date(), 2),
    { status: 400 },
  );
});
