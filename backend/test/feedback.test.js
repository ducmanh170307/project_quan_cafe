// Kiểm thử cho các phần bổ sung theo góp ý của thầy: đá/đường/topping và đối tượng voucher.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateDiscount,
  calculateTotals,
  normalizeItems,
} = require("../src/lib/business");

const base = {
  TrangThai: "active",
  NgayBatDau: "2020-01-01",
  NgayKetThuc: "2099-01-01",
  LoaiKhuyenMai: "PERCENT",
  GiaTriGiam: 10,
  DonToiThieu: 0,
};

test("Mức đường và mức đá hợp lệ được giữ nguyên, mặc định là 100%", () => {
  const [a] = normalizeItems([
    { MaSanPham: 1, SoLuong: 1, MucDuong: "30%", MucDa: "0%" },
  ]);
  assert.equal(a.MucDuong, "30%");
  assert.equal(a.MucDa, "0%");
  const [b] = normalizeItems([{ MaSanPham: 1, SoLuong: 1 }]);
  assert.equal(b.MucDuong, "100%");
  assert.equal(b.MucDa, "100%");
});

test("Mức đường/đá ngoài danh sách bị từ chối", () => {
  assert.throws(
    () => normalizeItems([{ MaSanPham: 1, SoLuong: 1, MucDuong: "20%" }]),
    { status: 400 },
  );
  assert.throws(
    () => normalizeItems([{ MaSanPham: 1, SoLuong: 1, MucDa: "30%" }]),
    { status: 400 },
  );
});

test("Chọn nhiều topping với số lượng: giá = giá món + tổng topping × số phần", () => {
  const items = normalizeItems([
    {
      MaSanPham: 1,
      TenSize: "M",
      SoLuong: 2,
      Toppings: [
        { MaTopping: 1, SoLuong: 2 },
        { MaTopping: 2, SoLuong: 1 },
        { MaTopping: 3, SoLuong: 1 },
      ],
    },
  ]);
  const prices = [
    {
      MaSanPham: 1,
      TenSize: "M",
      TenSanPham: "Bạc xỉu",
      LoaiSanPham: "DO_UONG",
      TrangThai: "active",
      GiaBan: 39000,
    },
  ];
  const toppings = [
    { MaTopping: 1, TenTopping: "Trân châu", GiaBan: 8000, TrangThai: "active" },
    { MaTopping: 2, TenTopping: "Thêm sữa", GiaBan: 5000, TrangThai: "active" },
    { MaTopping: 3, TenTopping: "Kem cheese", GiaBan: 10000, TrangThai: "active" },
  ];
  const totals = calculateTotals(items, prices, null, toppings, 1);
  // 39.000 + 2×8.000 + 5.000 + 10.000 = 70.000 mỗi ly
  assert.equal(totals.lines[0].DonGia, 70000);
  assert.equal(totals.subtotal, 140000);
});

test("Voucher chỉ cho thành viên: cần khách có số điện thoại", () => {
  const member = { ...base, DoiTuongApDung: "MEMBER" };
  assert.throws(() => calculateDiscount(100000, member, new Date(), 1, false), {
    status: 400,
  });
  assert.throws(() => calculateDiscount(100000, member, new Date(), 1), {
    status: 400,
  });
  assert.equal(calculateDiscount(100000, member, new Date(), 1, true), 10000);
});

test("Voucher mọi khách (hoặc chưa có cột đối tượng) dùng được khi không có khách", () => {
  assert.equal(
    calculateDiscount(100000, { ...base, DoiTuongApDung: "ALL" }, new Date(), 1, false),
    10000,
  );
  assert.equal(calculateDiscount(100000, base, new Date(), 1), 10000);
});

test("Voucher đã tắt, chưa bắt đầu hoặc hết hạn đều bị từ chối", () => {
  for (const change of [
    { TrangThai: "inactive" },
    { NgayBatDau: "2099-01-01", NgayKetThuc: "2099-02-01" },
    { NgayBatDau: "2020-01-01", NgayKetThuc: "2020-02-01" },
  ])
    assert.throws(
      () => calculateDiscount(100000, { ...base, ...change }, new Date(), 1),
      { status: 400 },
    );
});

test("Phân ca theo khoảng ngày và các thứ trong tuần", () => {
  const { shiftDates } = require("../src/models/hrModel");
  // 16/11/2026 là Thứ 2. Từ T2 16/11 đến CN 22/11, chỉ tick T2–T6 => 5 ngày.
  assert.deepEqual(
    shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22", CacThu: [1, 2, 3, 4, 5] }),
    ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
  );
  // Không truyền CacThu: lấy cả tuần. Một ngày đơn vẫn dùng NgayLamViec.
  assert.equal(shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22" }).length, 7);
  assert.deepEqual(shiftDates({ NgayLamViec: "2026-11-16" }), ["2026-11-16"]);
  // Cuối tuần trong 2 tuần liên tiếp => 4 ngày.
  assert.equal(
    shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-29", CacThu: [6, 7] }).length,
    4,
  );
});

test("Khoảng ngày sai bị từ chối", () => {
  const { shiftDates } = require("../src/models/hrModel");
  assert.throws(() => shiftDates({ TuNgay: "2026-11-20", DenNgay: "2026-11-16" }), { status: 400 });
  assert.throws(() => shiftDates({ TuNgay: "2026-11-01", DenNgay: "2026-12-31" }), { status: 400 });
  assert.throws(() => shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22", CacThu: [] }), { status: 400 });
  assert.throws(() => shiftDates({ TuNgay: "2026-11-16", DenNgay: "2026-11-22", CacThu: [8] }), { status: 400 });
});
