import { ApiClient, UI } from "../services/api.js";
import { BillQuote } from "../services/billing.js";
import { OptionPicker, lineKey, optionText } from "../services/optionPicker.js";
import { ManhModule } from "./manhBranchHr.js";
import { YModule } from "./yShiftCashflow.js";
const TrucModule = {
  products: [],
  toppings: [],
  vouchers: [],
  category: "",
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
      MucDuong: c.MucDuong,
      MucDa: c.MucDa,
      GhiChu: c.GhiChu,
      Toppings: c.Toppings.map((t) => ({
        MaTopping: t.MaTopping,
        SoLuong: t.SoLuong,
      })),
    }));
  },
  /** Chỉ gửi số điện thoại khi đã nhập đủ/đúng, để voucher "chỉ cho thành viên" được kiểm tra đúng. */
  customerPhone() {
    const phone = UI.value("posPhone");
    return /^0\d{9,10}$/.test(phone) ? phone : "";
  },
  getBill() {
    if (!this.bill)
      this.bill = new BillQuote({
        endpoint: "/orders/quote",
        getPayload: () => ({
          MaChiNhanh: ManhModule.currentBranchId,
          SoDienThoaiKhach: this.customerPhone(),
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
    this.category = "";
    this.orders = [];
    this.orderPage = 1;
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
    UI.el("orderPager").innerHTML = "";
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
            `<option value="${UI.escape(v.MaCode)}">${UI.escape(v.MaCode)} · ${UI.escape(v.TenChuongTrinh)}${v.DoiTuongApDung === "MEMBER" ? " [Thành viên]" : ""}</option>`,
        )
        .join("");
    if (vouchers.some((v) => v.MaCode === selected))
      UI.el("posVoucherSelect").value = selected;
    this.renderVoucherInfo();
  },
  /** Mô tả điều kiện của voucher đang chọn: giảm bao nhiêu, đơn tối thiểu, hạn, đối tượng. */
  renderVoucherInfo() {
    const v = this.vouchers.find(
        (x) => x.MaCode === UI.value("posVoucherSelect"),
      ),
      box = UI.el("posVoucherInfo");
    box.textContent = v
      ? `Giảm ${UI.money(v.GiaTriGiam)}${v.LoaiKhuyenMai === "PERCENT" ? "%" : "đ"}${v.GiamToiDa ? ` (tối đa ${UI.money(v.GiamToiDa)}đ)` : ""} · đơn từ ${UI.money(v.DonToiThieu)}đ · dùng đến ${UI.date(v.NgayKetThuc)} · ${v.DoiTuongApDung === "MEMBER" ? "chỉ khách thành viên (cần nhập SĐT)" : "mọi khách"}`
      : "";
    box.hidden = !v;
  },
  orderPage: 1,
  hydrateOrders(rows) {
    this.orders = rows;
    this.renderOrders();
  },
  moveOrderPage(delta) {
    this.orderPage += delta;
    this.renderOrders();
  },
  hydrateKds(rows) {
    this.kdsOrders = rows;
    this.renderKds();
  },
  /** Danh mục lấy từ chính danh sách món đang bán ở chi nhánh. */
  categories() {
    const map = new Map();
    for (const p of this.products)
      if (!map.has(p.MaDanhMuc))
        map.set(p.MaDanhMuc, { id: p.MaDanhMuc, name: p.TenDanhMuc, count: 0 });
    for (const p of this.products) map.get(p.MaDanhMuc).count++;
    return [...map.values()];
  },
  setCategory(id) {
    this.category = String(id);
    this.renderPosMenu();
  },
  renderPosMenu() {
    const text = UI.value("posSearch").toLocaleLowerCase("vi"),
      kind = UI.value("posKind"),
      categories = this.categories();
    if (this.category && !categories.some((c) => String(c.id) === this.category))
      this.category = "";
    UI.el("posCategories").innerHTML =
      `<button class="pill ${this.category ? "" : "active"}" onclick="TrucModule.setCategory('')">Tất cả (${this.products.length})</button>` +
      categories
        .map(
          (c) =>
            `<button class="pill ${String(c.id) === this.category ? "active" : ""}" onclick="TrucModule.setCategory(${c.id})">${UI.escape(c.name)} (${c.count})</button>`,
        )
        .join("");
    UI.el("posProductGrid").innerHTML =
      this.products
        .map((p, index) => ({ p, index }))
        .filter(
          ({ p }) =>
            (!kind || p.LoaiSanPham === kind) &&
            (!this.category || String(p.MaDanhMuc) === this.category) &&
            p.TenSanPham.toLocaleLowerCase("vi").includes(text),
        )
        .map(
          ({ p, index }) =>
            `<article class="card product-card"><img class="product-photo" src="${UI.escape(p.HinhAnh || "/src/assets/menu/placeholder.svg")}" alt="${UI.escape(p.TenSanPham)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/src/assets/menu/placeholder.svg'"><b>${UI.escape(p.TenSanPham)} · ${UI.escape(p.TenSize === "PHAN" ? "Phần" : p.TenSize)}</b><small class="muted">${UI.escape(p.TenDanhMuc)}</small><p>${UI.money(p.GiaBan)} đ</p><button class="btn btn-green" onclick="TrucModule.addToCart(${index})">${p.LoaiSanPham === "MON_AN" ? "+ Thêm vào giỏ" : "Chọn đường, đá, topping"}</button></article>`,
        )
        .join("") || '<p class="muted">Không có món phù hợp.</p>';
  },
  addToCart(index) {
    if (this.checkingOut) return;
    const p = this.products[index];
    if (!p) return;
    if (p.LoaiSanPham === "MON_AN")
      return this.pushLine(p, {
        SoLuong: 1,
        MucDuong: "100%",
        MucDa: "100%",
        GhiChu: "",
        Toppings: [],
        GiaBan: Number(p.GiaBan),
      });
    // Đồ uống: mở hộp chọn đường/đá/topping trước khi vào giỏ.
    OptionPicker.open(p, this.toppings, (choice) => this.pushLine(p, choice));
  },
  pushLine(p, choice) {
    const line = { ...p, ...choice },
      old = this.cart.find((c) => lineKey(c) === lineKey(line));
    if (old) old.SoLuong += line.SoLuong;
    else this.cart.push(line);
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
            `<tr><td>${UI.escape(c.TenSanPham)} · ${UI.escape(c.TenSize === "PHAN" ? "Phần" : c.TenSize)}<br><small class="line-options">${UI.escape(optionText(c))}</small><br><input aria-label="Ghi chú món" maxlength="300" value="${UI.escape(c.GhiChu)}" onchange="TrucModule.setNote(${index},this.value)"></td><td><div class="cart-qty"><button class="btn small-btn" onclick="TrucModule.changeQty(${index},-1)">−</button>${c.SoLuong}<button class="btn small-btn" onclick="TrucModule.changeQty(${index},1)">+</button></div></td><td>${UI.money(c.GiaBan * c.SoLuong)}</td><td><button class="btn small-btn" onclick="TrucModule.changeQty(${index},-${c.SoLuong})">Xóa</button></td></tr>`,
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
    this.renderVoucherInfo();
    await this.getBill().update("");
  },
  async pickVoucher(code) {
    UI.el("posVoucher").value = code;
    this.renderVoucherInfo();
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
    const page = UI.paginate(this.orders, this.orderPage, 8);
    this.orderPage = page.page;
    UI.el("orderPager").innerHTML = UI.pagerHtml(page, "TrucModule.moveOrderPage");
    UI.el("orderTableBody").innerHTML =
      page.items
        .map(
          (o) =>
            `<tr><td>${UI.escape(o.MaDonHienThi)}<br><small>${UI.date(o.ThoiGianDat)}</small></td><td>${UI.escape(o.TenKhachHang || "Khách lẻ")}<br>${UI.escape(o.SoDienThoaiKhach)}<br>${o.Items.map((l) => `${UI.escape(l.TenSanPhamLuuTru)} ${UI.escape(l.TenSize === "PHAN" ? "Phần" : l.TenSize)} × ${l.SoLuong}${l.MucDuong && l.TenSize !== "PHAN" ? `<br><small>Đường ${UI.escape(l.MucDuong)} · Đá ${UI.escape(l.MucDa)}${l.ToppingMoTa ? " · " + UI.escape(l.ToppingMoTa) : ""}</small>` : ""}`).join("<br>")}</td><td>${UI.money(o.TongPhaiTra)}<br><small>${UI.escape(o.MaCode || "")}</small></td><td>${UI.escape(o.TrangThaiThanhToan)}</td><td>${UI.escape(o.TrangThaiDonHang)}</td><td><button class="btn small-btn" onclick="UI.run(this,()=>TrucModule.showReceipt(${o.MaDonHang}))">Hóa đơn</button>${o.TrangThaiThanhToan === "unpaid" && o.TrangThaiDonHang !== "Cancelled" ? `<button class="btn btn-green small-btn" onclick="UI.run(this,()=>TrucModule.payOnline(${o.MaDonHang}))">Thu tiền</button>` : ""}${o.TrangThaiDonHang !== "Cancelled" && (o.TrangThaiThanhToan === "unpaid" || ManhModule.isManager) ? `<button class="btn btn-red small-btn" onclick="UI.run(this,()=>TrucModule.cancel(${o.MaDonHang}))">Hủy / hoàn</button>` : ""}</td></tr>`,
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
            `<tr><td><b>#${o.SoThuTuGoiMon}</b><br>${UI.escape(o.MaDonHienThi)}<br>${UI.date(o.ThoiGianDat)}</td><td>${o.Items.map((l) => `<p><b>${UI.escape(l.TenSanPhamLuuTru)} · ${UI.escape(l.TenSize === "PHAN" ? "Phần" : l.TenSize)} × ${l.SoLuong}</b><br>${l.TenSize === "PHAN" ? "" : `Đường ${UI.escape(l.MucDuong)} · Đá ${UI.escape(l.MucDa)}`}<br>${UI.escape(l.ToppingMoTa || "")}<br>${UI.escape(l.GhiChuMon || "")}<br><small>Làm lại ${l.SoLanLamLai} món</small>${canMake ? ` <button class="btn small-btn" onclick="UI.run(this,()=>TrucModule.remake(${o.MaDonHang},${l.MaChiTietDon}))">Làm lại</button>` : ""}</p>`).join("")}</td><td>${UI.escape(o.TrangThaiDonHang)}</td><td>${canMake ? `<button class="btn btn-green" onclick="UI.run(this,()=>TrucModule.completeKdsOrder(${o.MaDonHang}))">Hoàn tất & giao món</button>` : "Chế độ xem"}</td></tr>`,
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
      `<h2>KIOTCAFE</h2><p>${UI.escape(order.MaDonHienThi)}</p><p>${UI.date(order.ThoiGianDat)} · ${UI.escape(order.TrangThaiThanhToan)}</p><table><thead><tr><th>Món</th><th>SL</th><th>Tiền</th></tr></thead><tbody>${order.Items.map((l) => `<tr><td>${UI.escape(l.TenSanPhamLuuTru)} ${UI.escape(l.TenSize === "PHAN" ? "Phần" : l.TenSize)}<br><small>${l.TenSize === "PHAN" ? "" : `Đường ${UI.escape(l.MucDuong)} · Đá ${UI.escape(l.MucDa)}`}${l.ToppingMoTa ? " · " + UI.escape(l.ToppingMoTa) : ""}${l.GhiChuMon ? "<br>Ghi chú: " + UI.escape(l.GhiChuMon) : ""}</small></td><td>${l.SoLuong}</td><td>${UI.money(l.SoLuong * l.DonGiaBan)}</td></tr>`).join("")}</tbody></table><p class="section-gap">Tiền hàng ${UI.money(order.TongTienHang)}đ<br>Voucher ${UI.escape(order.MaCode || "—")} · Giảm ${UI.money(order.TienGiamGia)}đ</p><p class="receipt-total">Tổng ${UI.money(order.TongPhaiTra)}đ</p><p>Hóa đơn nội bộ · Cảm ơn quý khách!</p>`;
    UI.el("receiptDialog").showModal();
  },
};
export { TrucModule };
