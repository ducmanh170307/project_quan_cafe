import { ApiClient, UI } from "../services/api.js";
import { BillQuote } from "../services/billing.js";
import { ManhModule } from "./manhBranchHr.js";
import { YModule } from "./yShiftCashflow.js";
const TrucModule = {
  products: [],
  toppings: [],
  vouchers: [],
  cart: [],
  orders: [],
  kdsOrders: [],
  requestKey: null,
  requestSignature: null,
  bill: null,
  paymentBill: null,
  checkingOut: false,
  items() {
    return this.cart.map((c) => ({
      MaSanPham: c.MaSanPham,
      TenSize: c.TenSize,
      SoLuong: c.SoLuong,
      GhiChu: c.GhiChu,
      Toppings: c.Toppings.map((t) => ({
        MaTopping: t.MaTopping,
        SoLuong: t.SoLuong,
      })),
    }));
  },
  getBill() {
    if (!this.bill)
      this.bill = new BillQuote({
        endpoint: "/orders/quote",
        getPayload: () => ({
          MaChiNhanh: ManhModule.currentBranchId,
          Items: this.items(),
        }),
        onChange: () => this.renderBill(),
      });
    return this.bill;
  },
  reset() {
    this.products = [];
    this.toppings = [];
    this.vouchers = [];
    this.cart = [];
    this.orders = [];
    this.kdsOrders = [];
    this.requestKey = null;
    this.requestSignature = null;
    for (const id of ["posVoucher", "posPhone", "posName", "cashTendered"])
      UI.el(id).value = "";
    UI.el("paymentConfirmed").checked = false;
    UI.el("posVoucherSelect").innerHTML =
      '<option value="">Chọn voucher</option>';
    UI.el("posVoucherMessage").textContent = "";
    this.getBill().reset();
    this.paymentBill?.reset();
    if (UI.el("onlinePaymentDialog").open) UI.el("onlinePaymentDialog").close();
    this.renderCart();
    this.renderPosMenu();
    this.renderKds();
    UI.el("orderTableBody").innerHTML = "";
  },
  hydrateProducts(products, toppings = [], vouchers = []) {
    this.products = products;
    this.toppings = toppings;
    this.vouchers = vouchers;
    this.renderPosMenu();
    const selected = UI.el("posVoucherSelect").value;
    UI.el("posVoucherSelect").innerHTML =
      '<option value="">Chọn voucher</option>' +
      vouchers
        .map(
          (v) =>
            `<option value="${UI.escape(v.MaCode)}">${UI.escape(v.MaCode)} · ${UI.escape(v.TenChuongTrinh)}</option>`,
        )
        .join("");
    if (vouchers.some((v) => v.MaCode === selected))
      UI.el("posVoucherSelect").value = selected;
  },
  hydrateOrders(rows) {
    this.orders = rows;
    this.renderOrders();
  },
  hydrateKds(rows) {
    this.kdsOrders = rows;
    this.renderKds();
  },
  renderPosMenu() {
    const selections = new Map(
      [...UI.el("posProductGrid").querySelectorAll("select")].map((s) => [
        s.id,
        [...s.selectedOptions].map((o) => o.value),
      ]),
    );
    const text = UI.value("posSearch").toLocaleLowerCase("vi"),
      kind = UI.value("posKind");
    UI.el("posProductGrid").innerHTML =
      this.products
        .map((p, index) => ({ p, index }))
        .filter(
          ({ p }) =>
            (!kind || p.LoaiSanPham === kind) &&
            p.TenSanPham.toLocaleLowerCase("vi").includes(text),
        )
        .map(
          ({ p, index }) =>
            `<article class="card product-card"><img class="product-photo" src="${UI.escape(p.HinhAnh || "/src/assets/menu/placeholder.svg")}" alt="${UI.escape(p.TenSanPham)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/src/assets/menu/placeholder.svg'"><b>${UI.escape(p.TenSanPham)} · ${UI.escape(p.TenSize === "PHAN" ? "Phần" : p.TenSize)}</b><p>${UI.money(p.GiaBan)} đ</p>${p.LoaiSanPham === "MON_AN" ? "" : `<label class="muted">Topping (có thể chọn nhiều)</label><select multiple id="posToppings_${p.MaSanPham}_${p.TenSize}" aria-label="Topping">${this.toppings.map((t) => `<option value="${t.MaTopping}">${UI.escape(t.TenTopping)} +${UI.money(t.GiaBan)}đ</option>`).join("")}</select>`}<button class="btn btn-green" onclick="TrucModule.addToCart(${index})">+ Chọn món</button></article>`,
        )
        .join("") || '<p class="muted">Không có món phù hợp.</p>';
    for (const select of UI.el("posProductGrid").querySelectorAll("select"))
      for (const option of select.options)
        option.selected = (selections.get(select.id) || []).includes(
          option.value,
        );
  },
  addToCart(index) {
    if (this.checkingOut) return;
    const p = this.products[index];
    if (!p) return;
    const select = UI.el(`posToppings_${p.MaSanPham}_${p.TenSize}`),
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
      key = JSON.stringify(Toppings.map((t) => t.MaTopping));
    const old = this.cart.find(
      (c) =>
        c.MaSanPham === p.MaSanPham &&
        c.TenSize === p.TenSize &&
        JSON.stringify(c.Toppings.map((t) => t.MaTopping)) === key,
    );
    if (old) old.SoLuong++;
    else
      this.cart.push({
        ...p,
        GiaBan:
          Number(p.GiaBan) +
          chosen.reduce((sum, t) => sum + Number(t.GiaBan), 0),
        SoLuong: 1,
        GhiChu: "",
        Toppings,
      });
    this.touchCart();
  },
  changeQty(index, delta) {
    if (this.checkingOut) return;
    this.cart[index].SoLuong += delta;
    if (this.cart[index].SoLuong <= 0) this.cart.splice(index, 1);
    this.touchCart();
  },
  setNote(index, value) {
    this.cart[index].GhiChu = value;
  },
  touchCart() {
    this.renderCart();
    this.getBill()
      .update()
      .catch((error) => UI.notify(error.message, true));
  },
  renderCart() {
    UI.el("posCartBody").innerHTML =
      this.cart
        .map(
          (c, index) =>
            `<tr><td>${UI.escape(c.TenSanPham)} · ${UI.escape(c.TenSize === "PHAN" ? "Phần" : c.TenSize)}<br><small>${c.Toppings.map((t) => UI.escape(t.TenTopping)).join(", ")}</small><br><input aria-label="Ghi chú món" maxlength="300" value="${UI.escape(c.GhiChu)}" onchange="TrucModule.setNote(${index},this.value)"></td><td><div class="cart-qty"><button class="btn small-btn" onclick="TrucModule.changeQty(${index},-1)">−</button>${c.SoLuong}<button class="btn small-btn" onclick="TrucModule.changeQty(${index},1)">+</button></div></td><td>${UI.money(c.GiaBan * c.SoLuong)}</td><td><button class="btn small-btn" onclick="TrucModule.changeQty(${index},-${c.SoLuong})">Xóa</button></td></tr>`,
        )
        .join("") || UI.empty(4, "Chọn đồ uống hoặc món ăn");
    this.renderBill();
  },
  renderBill() {
    const bill = this.bill,
      data = bill?.data,
      subtotal =
        data?.subtotal ??
        this.cart.reduce((sum, c) => sum + Number(c.GiaBan) * c.SoLuong, 0);
    UI.el("posTotalAmount").textContent = UI.money(subtotal);
    UI.el("posDiscountAmount").textContent = UI.money(data?.discount || 0);
    UI.el("posPayableAmount").textContent = UI.money(data?.total ?? subtotal);
    UI.el("posQuoteState").textContent = bill?.busy
      ? "Đang tính tiền..."
      : data
        ? "Giá và voucher đã được kiểm tra."
        : "";
    UI.el("posVoucherMessage").textContent =
      bill?.error ||
      (bill?.code
        ? `Đã áp dụng ${bill.code}, giảm ${UI.money(data?.discount)}đ.`
        : "Chưa áp dụng voucher.");
    UI.el("posVoucherMessage").className = bill?.error
      ? "muted quote-error"
      : "muted";
    UI.el("btnCheckout").disabled =
      this.checkingOut || !!bill?.busy || !data || !this.cart.length;
  },
  async applyVoucher() {
    const data = await this.getBill().update(UI.value("posVoucher"));
    if (data)
      UI.notify(
        data.voucher
          ? `Đã áp dụng ${data.voucher.MaCode}.`
          : "Đã tính tiền hàng.",
      );
  },
  async clearVoucher() {
    UI.el("posVoucher").value = "";
    UI.el("posVoucherSelect").value = "";
    await this.getBill().update("");
  },
  async pickVoucher(code) {
    UI.el("posVoucher").value = code;
    await this.applyVoucher();
  },
  payment() {
    return {
      PhuongThucThanhToan: UI.value("paymentMethod"),
      TienKhachDua: UI.value("cashTendered"),
      XacNhanThanhToan: UI.el("paymentConfirmed").checked,
    };
  },
  async checkoutPosOrder() {
    if (!this.cart.length) throw new Error("Giỏ hàng đang trống.");
    const totals = this.getBill().require(),
      payload = {
        MaChiNhanh: ManhModule.currentBranchId,
        MaPhienCa: YModule.requireShift(),
        SoDienThoaiKhach: UI.value("posPhone"),
        TenKhachHang: UI.value("posName"),
        MaCode: this.bill.code,
        TongDuKien: totals.total,
        HinhThucNhan: UI.value("posFulfillment"),
        Items: this.items(),
        ...this.payment(),
      };
    const signature = JSON.stringify(payload);
    if (signature !== this.requestSignature) {
      this.requestSignature = signature;
      this.requestKey = UI.uuid();
    }
    payload.IdempotencyKey = this.requestKey;
    this.checkingOut = true;
    UI.el("globalBranchSelect").disabled = true;
    this.renderBill();
    try {
      const r = await ApiClient.post("/orders", payload);
      this.cart = [];
      this.requestKey = null;
      this.requestSignature = null;
      this.getBill().reset();
      UI.el("posVoucher").value = "";
      UI.el("cashTendered").value = "";
      UI.el("paymentConfirmed").checked = false;
      this.renderCart();
      UI.notify(
        `Đã thanh toán ${UI.money(r.order.TongPhaiTra)}đ · Giảm ${UI.money(r.order.TienGiamGia)}đ · Tiền thừa ${UI.money(r.order.TienThua)}đ.`,
      );
      await ManhModule.refresh();
      await this.showReceipt(r.order.MaDonHang);
    } catch (error) {
      if (error.status === 409)
        await this.getBill()
          .update()
          .catch(() => {});
      throw error;
    } finally {
      this.checkingOut = false;
      UI.el("globalBranchSelect").disabled = false;
      this.renderBill();
    }
  },
  renderOrders() {
    UI.el("orderTableBody").innerHTML =
      this.orders
        .map(
          (o) =>
            `<tr><td>${UI.escape(o.MaDonHienThi)}<br><small>${UI.date(o.ThoiGianDat)}</small></td><td>${UI.escape(o.TenKhachHang || "Khách lẻ")}<br>${UI.escape(o.SoDienThoaiKhach)}<br>${o.Items.map((l) => `${UI.escape(l.TenSanPhamLuuTru)} ${UI.escape(l.TenSize === "PHAN" ? "Phần" : l.TenSize)} × ${l.SoLuong}`).join("<br>")}</td><td>${UI.money(o.TongPhaiTra)}<br><small>${UI.escape(o.MaCode || "")}</small></td><td>${UI.escape(o.TrangThaiThanhToan)}</td><td>${UI.escape(o.TrangThaiDonHang)}</td><td><button class="btn small-btn" onclick="UI.run(this,()=>TrucModule.showReceipt(${o.MaDonHang}))">Hóa đơn</button>${o.TrangThaiThanhToan === "unpaid" && o.TrangThaiDonHang !== "Cancelled" ? `<button class="btn btn-green small-btn" onclick="UI.run(this,()=>TrucModule.payOnline(${o.MaDonHang}))">Thu tiền</button>` : ""}${o.TrangThaiDonHang !== "Cancelled" && (o.TrangThaiThanhToan === "unpaid" || ManhModule.isManager) ? `<button class="btn btn-red small-btn" onclick="UI.run(this,()=>TrucModule.cancel(${o.MaDonHang}))">Hủy / hoàn</button>` : ""}</td></tr>`,
        )
        .join("") || UI.empty(6);
  },
  async payOnline(id) {
    YModule.requireShift();
    const order = this.orders.find((o) => o.MaDonHang === id);
    UI.el("onlinePayId").value = id;
    UI.el("onlinePayTitle").textContent = order.MaDonHienThi;
    UI.el("onlinePayVoucher").value = order.MaCode || "";
    UI.el("onlinePayMethod").value = "CASH";
    UI.el("onlinePayConfirmed").checked = false;
    this.paymentBill = new BillQuote({
      endpoint: "/orders/quote-payment",
      getPayload: () => ({ MaDonHang: Number(UI.value("onlinePayId")) }),
      onChange: (b) => {
        UI.el("onlinePaySubtotal").textContent = UI.money(b.data?.subtotal);
        UI.el("onlinePayDiscount").textContent = UI.money(b.data?.discount);
        UI.el("onlinePayTotal").textContent = UI.money(b.data?.total);
        UI.el("onlinePayVoucherMessage").textContent = b.busy
          ? "Đang tính..."
          : b.error ||
            (b.code ? `Đã áp dụng ${b.code}` : "Không dùng voucher.");
      },
    });
    UI.el("onlinePaymentDialog").showModal();
    const data = await this.paymentBill.update(order.MaCode || "");
    if (data) UI.el("onlinePayTendered").value = data.total;
  },
  async applyOnlineVoucher() {
    await this.paymentBill.update(UI.value("onlinePayVoucher"));
  },
  async confirmOnlinePayment() {
    const total = this.paymentBill.require(),
      id = Number(UI.value("onlinePayId")),
      r = await ApiClient.post("/orders/pay", {
        MaDonHang: id,
        MaPhienCa: YModule.requireShift(),
        MaCode: this.paymentBill.code,
        TongDuKien: total.total,
        PhuongThucThanhToan: UI.value("onlinePayMethod"),
        TienKhachDua: UI.value("onlinePayTendered"),
        XacNhanThanhToan: UI.el("onlinePayConfirmed").checked,
      });
    UI.el("onlinePaymentDialog").close();
    UI.notify(
      `Đã thu ${UI.money(r.order.TongPhaiTra)}đ, trả lại ${UI.money(r.order.TienThua)}đ.`,
    );
    await ManhModule.refresh();
  },
  async cancel(id) {
    const reason = prompt("Lý do hủy / hoàn tiền:");
    if (reason === null) return;
    const r = await ApiClient.post("/orders/cancel", {
      MaDonHang: id,
      LyDo: reason,
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  renderKds() {
    const map = new Map();
    for (const l of this.kdsOrders) {
      if (!map.has(l.MaDonHang)) map.set(l.MaDonHang, { ...l, Items: [] });
      map.get(l.MaDonHang).Items.push(l);
    }
    const canMake = ["ADMIN", "MANAGER", "BARISTA"].includes(
      ManhModule.user?.Role,
    );
    UI.el("kdsQueueBody").innerHTML =
      [...map.values()]
        .map(
          (o) =>
            `<tr><td><b>#${o.SoThuTuGoiMon}</b><br>${UI.escape(o.MaDonHienThi)}<br>${UI.date(o.ThoiGianDat)}</td><td>${o.Items.map((l) => `<p><b>${UI.escape(l.TenSanPhamLuuTru)} · ${UI.escape(l.TenSize === "PHAN" ? "Phần" : l.TenSize)} × ${l.SoLuong}</b><br>${UI.escape(l.ToppingMoTa || "")}<br>${UI.escape(l.GhiChuMon || "")}<br><small>Làm lại ${l.SoLanLamLai} món</small>${canMake ? ` <button class="btn small-btn" onclick="UI.run(this,()=>TrucModule.remake(${o.MaDonHang},${l.MaChiTietDon}))">Làm lại</button>` : ""}</p>`).join("")}</td><td>${UI.escape(o.TrangThaiDonHang)}</td><td>${canMake ? `<button class="btn btn-green" onclick="UI.run(this,()=>TrucModule.completeKdsOrder(${o.MaDonHang}))">Hoàn tất & giao món</button>` : "Chế độ xem"}</td></tr>`,
        )
        .join("") || UI.empty(4, "Không có đơn chờ chuẩn bị");
  },
  async completeKdsOrder(id) {
    const r = await ApiClient.post("/kds/update", {
      Action: "complete_order",
      MaDonHang: id,
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async remake(id, line) {
    const qty = prompt("Số món cần làm lại:", "1");
    if (qty === null) return;
    const r = await ApiClient.post("/kds/update", {
      Action: "remake_item",
      MaDonHang: id,
      MaChiTietDon: line,
      SoLuongLamLai: qty,
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async showReceipt(id) {
    const { order } = await ApiClient.get(`/orders/${id}`);
    UI.el("receiptContent").innerHTML =
      `<h2>KIOTCAFE</h2><p>${UI.escape(order.MaDonHienThi)}</p><p>${UI.date(order.ThoiGianDat)} · ${UI.escape(order.TrangThaiThanhToan)}</p><table><thead><tr><th>Món</th><th>SL</th><th>Tiền</th></tr></thead><tbody>${order.Items.map((l) => `<tr><td>${UI.escape(l.TenSanPhamLuuTru)} ${UI.escape(l.TenSize === "PHAN" ? "Phần" : l.TenSize)}<br><small>${UI.escape(l.ToppingMoTa || "")}</small></td><td>${l.SoLuong}</td><td>${UI.money(l.SoLuong * l.DonGiaBan)}</td></tr>`).join("")}</tbody></table><p class="section-gap">Tiền hàng ${UI.money(order.TongTienHang)}đ<br>Voucher ${UI.escape(order.MaCode || "—")} · Giảm ${UI.money(order.TienGiamGia)}đ</p><p class="receipt-total">Tổng ${UI.money(order.TongPhaiTra)}đ</p><p>Hóa đơn nội bộ · Cảm ơn quý khách!</p>`;
    UI.el("receiptDialog").showModal();
  },
};
export { TrucModule };
