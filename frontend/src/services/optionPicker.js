import { UI } from "./api.js";

/*
 * Hộp chọn tùy chọn đồ uống dùng chung cho POS (nhân viên) và trang khách đặt món.
 * Thầy yêu cầu: chọn được nhiều topping (kèm số lượng), chọn mức đường, mức đá,
 * và mỗi lựa chọn phải hiển thị ngay bên dưới để người dùng kiểm tra lại.
 * Mức đường/đá phải trùng danh sách hợp lệ ở backend (lib/business.js).
 */
export const SUGAR_LEVELS = ["0%", "30%", "50%", "70%", "100%"];
export const ICE_LEVELS = ["0%", "50%", "100%"];
export const MAX_TOPPING_QTY = 5;

export const OptionPicker = {
  product: null,
  toppings: [],
  state: null,
  onConfirm: null,

  open(product, toppings, onConfirm) {
    this.product = product;
    this.toppings = toppings;
    this.onConfirm = onConfirm;
    this.state = { qty: 1, sugar: "100%", ice: "100%", tops: {}, note: "" };
    UI.el("optionBody").innerHTML = `
      <h2>${UI.escape(product.TenSanPham)} · size ${UI.escape(product.TenSize)}</h2>
      <p class="muted">Giá gốc ${UI.money(product.GiaBan)}đ</p>
      <h3 class="option-heading">Mức đường</h3>
      <div class="pill-row" id="optSugar"></div>
      <h3 class="option-heading">Mức đá</h3>
      <div class="pill-row" id="optIce"></div>
      <h3 class="option-heading">Topping <span class="muted">(tối đa ${MAX_TOPPING_QTY} phần mỗi loại)</span></h3>
      <div class="toolbar">
        <button type="button" class="btn small-btn" onclick="OptionPicker.selectAllToppings()">Chọn tất cả (×1)</button>
        <button type="button" class="btn small-btn" onclick="OptionPicker.clearToppings()">Bỏ hết</button>
      </div>
      <div id="optToppings" class="option-toppings"></div>
      <h3 class="option-heading">Ghi chú</h3>
      <input id="optNote" maxlength="300" placeholder="Ví dụ: ít sữa, không ống hút"
        oninput="OptionPicker.state.note=this.value" />
      <h3 class="option-heading">Số lượng</h3>
      <div class="cart-qty">
        <button class="btn small-btn" onclick="OptionPicker.changeQty(-1)">−</button>
        <b id="optQty">1</b>
        <button class="btn small-btn" onclick="OptionPicker.changeQty(1)">+</button>
      </div>
      <div class="option-summary" id="optSummary" aria-live="polite"></div>
      <div class="toolbar section-gap">
        <button class="btn btn-green" onclick="OptionPicker.confirm()">Thêm vào giỏ</button>
        <button class="btn" onclick="OptionPicker.close()">Hủy</button>
      </div>`;
    this.render();
    UI.el("optionDialog").showModal();
  },

  close() {
    UI.el("optionDialog").close();
  },

  setSugar(value) {
    this.state.sugar = value;
    this.render();
  },

  setIce(value) {
    this.state.ice = value;
    this.render();
  },

  changeTopping(id, delta) {
    const next = Math.min(
      MAX_TOPPING_QTY,
      Math.max(0, (this.state.tops[id] || 0) + delta),
    );
    if (next) this.state.tops[id] = next;
    else delete this.state.tops[id];
    this.render();
  },

  selectAllToppings() {
    for (const t of this.toppings)
      this.state.tops[t.MaTopping] = this.state.tops[t.MaTopping] || 1;
    this.render();
  },

  clearToppings() {
    this.state.tops = {};
    this.render();
  },

  changeQty(delta) {
    this.state.qty = Math.min(50, Math.max(1, this.state.qty + delta));
    this.render();
  },

  /** Các topping đã chọn, sắp theo mã để so sánh dòng giỏ hàng ổn định. */
  chosen() {
    return this.toppings
      .filter((t) => this.state.tops[t.MaTopping])
      .map((t) => ({
        MaTopping: t.MaTopping,
        TenTopping: t.TenTopping,
        GiaBan: Number(t.GiaBan),
        SoLuong: this.state.tops[t.MaTopping],
      }))
      .sort((a, b) => a.MaTopping - b.MaTopping);
  },

  unitPrice() {
    return (
      Number(this.product.GiaBan) +
      this.chosen().reduce((sum, t) => sum + t.GiaBan * t.SoLuong, 0)
    );
  },

  render() {
    const s = this.state,
      pill = (value, current, fn) =>
        `<button type="button" class="pill ${value === current ? "active" : ""}" onclick="OptionPicker.${fn}('${value}')">${value}</button>`;
    UI.el("optSugar").innerHTML = SUGAR_LEVELS.map((v) =>
      pill(v, s.sugar, "setSugar"),
    ).join("");
    UI.el("optIce").innerHTML = ICE_LEVELS.map((v) =>
      pill(v, s.ice, "setIce"),
    ).join("");
    UI.el("optToppings").innerHTML =
      this.toppings
        .map((t) => {
          const qty = s.tops[t.MaTopping] || 0;
          return `<div class="option-topping ${qty ? "picked" : ""}"><span>${UI.escape(t.TenTopping)} <small>+${UI.money(t.GiaBan)}đ</small></span><div class="cart-qty"><button class="btn small-btn" onclick="OptionPicker.changeTopping(${t.MaTopping},-1)" ${qty ? "" : "disabled"}>−</button><b>${qty}</b><button class="btn small-btn" onclick="OptionPicker.changeTopping(${t.MaTopping},1)" ${qty >= MAX_TOPPING_QTY ? "disabled" : ""}>+</button></div></div>`;
        })
        .join("") || '<p class="muted">Chưa có topping đang bán.</p>';
    UI.el("optQty").textContent = s.qty;
    const chosen = this.chosen(),
      toppingText = chosen.length
        ? chosen
            .map(
              (t) =>
                `${UI.escape(t.TenTopping)} ×${t.SoLuong} (+${UI.money(t.GiaBan * t.SoLuong)}đ)`,
            )
            .join(", ")
        : "không thêm";
    UI.el("optSummary").innerHTML =
      `<b>Đã chọn:</b> đường ${s.sugar} · đá ${s.ice} · topping: ${toppingText}${s.note ? ` · ghi chú: ${UI.escape(s.note)}` : ""}<br>` +
      `<b>${UI.money(this.unitPrice())}đ</b> / ly × ${s.qty} = <b>${UI.money(this.unitPrice() * s.qty)}đ</b>`;
  },

  confirm() {
    const s = this.state;
    this.onConfirm({
      SoLuong: s.qty,
      MucDuong: s.sugar,
      MucDa: s.ice,
      GhiChu: s.note.trim(),
      Toppings: this.chosen(),
      GiaBan: this.unitPrice(),
    });
    this.close();
  },
};

/** Khóa gộp dòng giỏ hàng: cùng món, size, đường, đá, topping và ghi chú thì cộng dồn số lượng. */
export function lineKey(line) {
  return JSON.stringify([
    line.MaSanPham,
    line.TenSize,
    line.MucDuong || "",
    line.MucDa || "",
    line.GhiChu || "",
    (line.Toppings || []).map((t) => [t.MaTopping, t.SoLuong]),
  ]);
}

/** Dòng mô tả lựa chọn hiển thị dưới tên món trong giỏ hàng/hóa đơn/KDS. */
export function optionText(line) {
  if (line.LoaiSanPham === "MON_AN") return "";
  const tops = (line.Toppings || [])
    .map((t) => `${t.TenTopping} ×${t.SoLuong}`)
    .join(", ");
  return `Đường ${line.MucDuong || "100%"} · Đá ${line.MucDa || "100%"}${tops ? ` · ${tops}` : ""}`;
}
