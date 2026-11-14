const { assert } = require("./errors");
const v = require("./validation");
function calculateDiscount(subtotal, promo, now = new Date(), branchId = null) {
  if (!promo) return 0;
  assert(
    promo.TrangThai === "active" &&
      new Date(promo.NgayBatDau) <= now &&
      now <= new Date(promo.NgayKetThuc),
    400,
    "Mã khuyến mãi đã hết hạn hoặc chưa có hiệu lực.",
  );
  assert(
    subtotal >= Number(promo.DonToiThieu),
    400,
    "Đơn hàng chưa đạt giá trị tối thiểu của khuyến mãi.",
  );
  assert(
    promo.MaChiNhanh == null || Number(promo.MaChiNhanh) === Number(branchId),
    400,
    "Voucher không áp dụng cho chi nhánh này.",
  );
  assert(
    promo.GioiHanLuotDung == null ||
      Number(promo.SoLuotDaDung || 0) < Number(promo.GioiHanLuotDung),
    400,
    "Voucher đã hết lượt sử dụng.",
  );
  const discount =
    promo.LoaiKhuyenMai === "PERCENT"
      ? Math.floor((subtotal * Number(promo.GiaTriGiam)) / 100)
      : Number(promo.GiaTriGiam);
  return Math.min(
    subtotal,
    promo.GiamToiDa == null
      ? discount
      : Math.min(discount, Number(promo.GiamToiDa)),
  );
}
function expectedCash(shift) {
  return (
    Number(shift.TienMatDauCa) +
    Number(shift.TongThuTienMat) -
    Number(shift.TongHoanTienMat) +
    Number(shift.TongThuNoiBo) -
    Number(shift.TongChiNoiBo)
  );
}
function normalizeItems(items) {
  return v.list(items, "Giỏ hàng").map((raw) => {
    const item = v.object(raw, "Món");
    return {
      MaSanPham: v.id(item.MaSanPham, "Sản phẩm"),
      TenSize: v.choice(item.TenSize || "M", ["S", "M", "L", "PHAN"], "Size"),
      SoLuong: v.number(item.SoLuong, "Số lượng món", {
        min: 1,
        max: 1000,
        integer: true,
      }),
      MucDuong: v.choice(
        item.MucDuong || "100%",
        ["0%", "30%", "50%", "70%", "100%"],
        "Mức đường",
      ),
      MucDa: v.choice(item.MucDa || "100%", ["0%", "50%", "100%"], "Mức đá"),
      GhiChu: v.text(item.GhiChu, "Ghi chú món", 300, true),
      Toppings: normalizeToppings(item.Toppings),
    };
  });
}
function normalizeToppings(toppings = []) {
  assert(
    Array.isArray(toppings) && toppings.length <= 10,
    400,
    "Tối đa 10 loại topping cho một món.",
  );
  const normalized = toppings.map((raw) => {
    const t = v.object(raw, "Topping");
    return {
      MaTopping: v.id(t.MaTopping, "Mã topping"),
      SoLuong: v.number(t.SoLuong ?? 1, "Số phần topping", {
        min: 1,
        max: 5,
        integer: true,
      }),
    };
  });
  assert(
    new Set(normalized.map((t) => t.MaTopping)).size === normalized.length,
    400,
    "Không được lặp topping trên cùng một món.",
  );
  return normalized.sort((a, b) => a.MaTopping - b.MaTopping);
}
function calculateTotals(
  items,
  prices,
  promo = null,
  toppings = [],
  branchId = null,
) {
  let subtotal = 0;
  const lines = items.map((item) => {
    const product = prices.find(
      (p) => p.MaSanPham === item.MaSanPham && p.TenSize === item.TenSize,
    );
    assert(
      product &&
        product.TrangThai === "active" &&
        product.DangBan !== false &&
        product.DangBan !== 0,
      400,
      "Món hoặc size đã ngừng bán. Vui lòng tải lại menu.",
    );
    assert(
      product.LoaiSanPham !== "MON_AN" || !(item.Toppings || []).length,
      400,
      "Topping đồ uống không áp dụng cho món ăn.",
    );
    const basePrice = Number(product.GiaBan);
    assert(
      Number.isSafeInteger(basePrice) && basePrice > 0,
      409,
      "Giá bán món chưa hợp lệ.",
    );
    const chosen = (item.Toppings || []).map((t) => {
      const source = toppings.find((x) => x.MaTopping === t.MaTopping);
      assert(
        source && source.TrangThai === "active",
        400,
        "Topping đã ngừng bán hoặc không tồn tại.",
      );
      const unit = Number(source.GiaBan);
      assert(
        Number.isSafeInteger(unit) && unit >= 0,
        409,
        "Giá topping chưa hợp lệ.",
      );
      return {
        ...t,
        TenTopping: source.TenTopping,
        DonGia: unit,
      };
    });
    const price =
      basePrice + chosen.reduce((sum, t) => sum + t.DonGia * t.SoLuong, 0);
    assert(
      Number.isSafeInteger(price) && price > 0,
      409,
      "Giá bán chưa được cấu hình hợp lệ.",
    );
    subtotal += price * item.SoLuong;
    return {
      ...item,
      TenSanPham: product.TenSanPham,
      DonGia: price,
      DonGiaGoc: basePrice,
      Toppings: chosen,
    };
  });
  assert(subtotal <= 1e12, 400, "Giá trị đơn hàng quá lớn.");
  const discount = calculateDiscount(subtotal, promo, new Date(), branchId);
  return { lines, subtotal, discount, total: subtotal - discount };
}
module.exports = {
  normalizeToppings,
  calculateDiscount,
  expectedCash,
  normalizeItems,
  calculateTotals,
};
