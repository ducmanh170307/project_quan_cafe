import { ApiClient, UI } from "./services/api.js";
import { BillQuote } from "./services/billing.js";
const Customer = {
  branches: [],
  products: [],
  toppings: [],
  cart: [],
  key: null,
  signature: null,
  epoch: 0,
  bill: null,
  sending: false,
  items() {
    return this.cart.map((l) => ({
      MaSanPham: l.MaSanPham,
      TenSize: l.TenSize,
      SoLuong: l.SoLuong,
      Toppings: l.Toppings.map((t) => ({
        MaTopping: t.MaTopping,
        SoLuong: t.SoLuong,
      })),
    }));
  },
  getBill() {
    if (!this.bill)
      this.bill = new BillQuote({
        endpoint: "/public/quote",
        getPayload: () => ({
          MaChiNhanh: UI.value("branch"),
          Items: this.items(),
        }),
        onChange: () => this.renderBill(),
      });
    return this.bill;
  },
  async init() {
    const r = await ApiClient.get("/public/branches");
    this.branches = r.branches;
    UI.el("branch").innerHTML = UI.options(
      this.branches,
      "MaChiNhanh",
      "TenChiNhanh",
    );
    await this.loadMenu();
  },
  async loadMenu() {
    const epoch = ++this.epoch;
    this.cart = [];
    this.products = [];
    this.key = null;
    this.signature = null;
    UI.el("voucher").value = "";
    this.getBill().reset();
    this.renderCart();
    UI.el("menu").innerHTML = "";
    const branch = Number(UI.value("branch")),
      b = this.branches.find((b) => b.MaChiNhanh === branch);
    UI.el("branchStatus").textContent =
      b?.TrangThai === "open"
        ? "Đang nhận đơn"
        : "Chi nhánh đang tạm ngừng nhận đơn";
    if (!branch) return;
    const results = await Promise.all([
      ApiClient.get(`/public/menu?branchId=${branch}`),
      ApiClient.get(`/public/vouchers?branchId=${branch}`),
    ]);
    if (epoch !== this.epoch) return;
    this.products = results[0].products;
    this.toppings = results[0].toppings || [];
    UI.el("voucherSelect").innerHTML =
      '<option value="">Chọn voucher</option>' +
      results[1].vouchers
        .map(
          (v) =>
            `<option value="${UI.escape(v.MaCode)}">${UI.escape(v.MaCode)} · ${UI.escape(v.TenChuongTrinh)}</option>`,
        )
        .join("");
    this.renderMenu();
  },
  renderMenu() {
    const kind = UI.value("menuKind"),
      text = UI.value("menuSearch").toLocaleLowerCase("vi");
    UI.el("menu").innerHTML =
      this.products
        .map((p, i) => ({ p, i }))
        .filter(
          ({ p }) =>
            (!kind || p.LoaiSanPham === kind) &&
            p.TenSanPham.toLocaleLowerCase("vi").includes(text),
        )
        .map(
          ({ p, i }) =>
            `<article class="card product-card"><img class="product-photo" src="${UI.escape(p.HinhAnh || "/src/assets/menu/placeholder.svg")}" alt="${UI.escape(p.TenSanPham)}" loading="lazy" onerror="this.onerror=null;this.src='/src/assets/menu/placeholder.svg'"><h3>${UI.escape(p.TenSanPham)} · ${p.TenSize === "PHAN" ? "Phần" : UI.escape(p.TenSize)}</h3><p>${UI.money(p.GiaBan)}đ</p>${p.LoaiSanPham === "MON_AN" ? "" : `<label class="muted">Topping</label><select multiple id="customerToppings_${i}" aria-label="Topping">${this.toppings.map((t) => `<option value="${t.MaTopping}">${UI.escape(t.TenTopping)} +${UI.money(t.GiaBan)}đ</option>`).join("")}</select>`}<button class="btn btn-green" onclick="Customer.add(${i})">+ Chọn</button></article>`,
        )
        .join("") || "<p>Chưa có món phù hợp.</p>";
  },
  add(i) {
    if (this.sending) return;
    const p = this.products[i],
      select = UI.el(`customerToppings_${i}`),
      chosen = select
        ? [...select.selectedOptions]
            .map((o) =>
              this.toppings.find((t) => t.MaTopping === Number(o.value)),
            )
            .sort((a, b) => a.MaTopping - b.MaTopping)
        : [],
      Toppings = chosen.map((t) => ({
        MaTopping: t.MaTopping,
        SoLuong: 1,
        TenTopping: t.TenTopping,
      })),
      key = JSON.stringify(Toppings.map((t) => t.MaTopping)),
      found = this.cart.find(
        (l) =>
          l.MaSanPham === p.MaSanPham &&
          l.TenSize === p.TenSize &&
          JSON.stringify(l.Toppings.map((t) => t.MaTopping)) === key,
      );
    if (found) found.SoLuong++;
    else
      this.cart.push({
        ...p,
        GiaBan:
          Number(p.GiaBan) + chosen.reduce((s, t) => s + Number(t.GiaBan), 0),
        SoLuong: 1,
        Toppings,
      });
    this.touch();
  },
  changeQty(i, delta) {
    if (this.sending) return;
    this.cart[i].SoLuong += delta;
    if (this.cart[i].SoLuong <= 0) this.cart.splice(i, 1);
    this.touch();
  },
  remove(i) {
    if (this.sending) return;
    this.cart.splice(i, 1);
    this.touch();
  },
  touch() {
    this.renderCart();
    this.getBill()
      .update()
      .catch((error) => UI.notify(error.message, true));
  },
  renderCart() {
    UI.el("cart").innerHTML =
      this.cart
        .map(
          (l, i) =>
            `<tr><td>${UI.escape(l.TenSanPham)} ${l.TenSize === "PHAN" ? "Phần" : UI.escape(l.TenSize)}<br><small>${l.Toppings.map((t) => UI.escape(t.TenTopping)).join(", ")}</small></td><td><div class="cart-qty"><button class="btn small-btn" onclick="Customer.changeQty(${i},-1)">−</button>${l.SoLuong}<button class="btn small-btn" onclick="Customer.changeQty(${i},1)">+</button></div></td><td>${UI.money(l.SoLuong * l.GiaBan)}</td><td><button class="btn small-btn" onclick="Customer.remove(${i})">Xóa</button></td></tr>`,
        )
        .join("") || UI.empty(4, "Chọn món để bắt đầu");
    this.renderBill();
  },
  renderBill() {
    const b = this.bill,
      d = b?.data,
      subtotal =
        d?.subtotal ??
        this.cart.reduce((sum, l) => sum + l.SoLuong * l.GiaBan, 0);
    UI.el("total").textContent = UI.money(subtotal);
    UI.el("discount").textContent = UI.money(d?.discount || 0);
    UI.el("payable").textContent = UI.money(d?.total ?? subtotal);
    UI.el("voucherMessage").textContent =
      b?.error || (b?.code ? `Đã áp dụng ${b.code}.` : "Chưa áp dụng voucher.");
    UI.el("quoteState").textContent = b?.busy
      ? "Đang tính tiền..."
      : d
        ? "Giá và ưu đãi đã được kiểm tra."
        : "";
    UI.el("btnSubmitOrder").disabled =
      this.sending || !!b?.busy || !d || !this.cart.length;
  },
  async applyVoucher() {
    await this.getBill().update(UI.value("voucher"));
  },
  async clearVoucher() {
    UI.el("voucher").value = "";
    UI.el("voucherSelect").value = "";
    await this.getBill().update("");
  },
  async pickVoucher(code) {
    UI.el("voucher").value = code;
    await this.applyVoucher();
  },
  async submit() {
    if (!this.cart.length) throw new Error("Chưa chọn món.");
    const total = this.getBill().require(),
      payload = {
        MaChiNhanh: UI.value("branch"),
        TenKhachHang: UI.value("customerName"),
        SoDienThoaiKhach: UI.value("customerPhone"),
        MaCode: this.bill.code,
        TongDuKien: total.total,
        HinhThucNhan: UI.value("fulfillment"),
        DiaChiGiaoHang: UI.value("address"),
        Items: this.items(),
      },
      signature = JSON.stringify(payload);
    if (this.signature !== signature) {
      this.signature = signature;
      this.key = UI.uuid();
    }
    this.sending = true;
    UI.el("branch").disabled = true;
    this.renderBill();
    try {
      const r = await ApiClient.post("/public/orders", {
        ...payload,
        IdempotencyKey: this.key,
      });
      this.cart = [];
      this.signature = null;
      this.key = null;
      this.getBill().reset();
      this.renderCart();
      UI.el("orderResult").textContent =
        `Đã nhận ${r.order.MaDonHienThi} · Tiền hàng ${UI.money(r.order.TongTienHang)}đ · Giảm ${UI.money(r.order.TienGiamGia)}đ · Cần thanh toán ${UI.money(r.order.TongPhaiTra)}đ. ${r.message}`;
      UI.notify("Đã gửi đơn.");
    } catch (error) {
      if (error.status === 409)
        await this.getBill()
          .update()
          .catch(() => {});
      throw error;
    } finally {
      this.sending = false;
      UI.el("branch").disabled = false;
      this.renderBill();
    }
  },
};
Object.assign(window, { UI, Customer });
Customer.init().catch((error) => UI.notify(error.message, true));
