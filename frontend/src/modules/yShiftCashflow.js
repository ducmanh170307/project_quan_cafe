import { ApiClient, UI } from "../services/api.js";
import { ManhModule } from "./manhBranchHr.js";
/* Ý: ca POS, phiếu thu chi, đối soát và Voucher/CRM. */
const PAGE_SIZE = 8;
const YModule = {
  promos: [],
  promoPage: 1,
  customers: [],
  customerPage: 1,
  lastClosed: null,
  activeShift: null,
  theoreticalMoney: 0,
  reset() {
    this.activeShift = null;
    this.lastClosed = null;
    this.theoreticalMoney = 0;
    UI.el("theoreticalCash").value = 0;
    UI.el("globalShiftBadge").textContent = "Chưa xác định trạng thái ca";
    UI.el("globalShiftBadge").className = "shift-badge shift-closed";
    UI.el("cashflowTableBody").innerHTML = "";
    UI.el("shiftHistoryBody").innerHTML = "";
    UI.el("shiftSummary").textContent = "";
    UI.el("shiftReconcileResult").textContent = "";
    UI.el("differencePreview").textContent = "";
    delete UI.el("openShiftMoney").dataset.touched;
    UI.el("shiftBanner").textContent = "Đang tải trạng thái ca...";
    UI.el("shiftBanner").className = "status-banner";
    UI.el("posShiftWarning").hidden = true;
  },
  /*
   * Logic mở/chốt ca (làm rõ theo góp ý của thầy):
   *  - Mỗi chi nhánh chỉ có 1 ca mở tại một thời điểm.
   *  - Chưa có ca mở: chỉ hiện bước ① Mở ca; bước ② ③ và POS bị khóa.
   *  - Đang có ca mở: ẩn form mở ca, cho phép thu chi, bán hàng và chốt ca.
   *  - Tiền đầu ca nên bằng tiền thực đếm của ca trước; nếu lệch phải ghi lý do.
   */
  hydrate(data) {
    this.activeShift = data.activeShift;
    this.lastClosed =
      data.historyShifts.find((s) => s.TrangThai === "closed") || null;
    this.theoreticalMoney = Number(data.theoreticalCash);
    const shift = this.activeShift,
      badge = UI.el("globalShiftBadge");
    badge.textContent = shift
      ? `Ca #${shift.MaPhienCa} · ${shift.TenThuNgan}`
      : "Chưa mở ca POS";
    badge.className = "shift-badge " + (shift ? "shift-open" : "shift-closed");
    UI.el("theoreticalCash").value = this.theoreticalMoney;
    UI.el("shiftSummary").textContent = shift
      ? `Đầu ca: ${UI.money(shift.TienMatDauCa)}đ · Thu tiền mặt: ${UI.money(shift.TongThuTienMat)}đ · Hoàn tiền mặt: ${UI.money(shift.TongHoanTienMat)}đ · Thu nội bộ: ${UI.money(shift.TongThuNoiBo)}đ · Chi nội bộ: ${UI.money(shift.TongChiNoiBo)}đ`
      : "Chưa có ca đang mở để chốt.";
    this.renderShiftState();
    this.previewDifference();
    UI.el("cashflowTableBody").innerHTML =
      data.cashflows
        .map(
          (p) =>
            `<tr><td>${UI.escape(p.LoaiPhieu)}</td><td>${UI.money(p.SoTien)}</td><td>${UI.escape(p.LyDo)}</td><td>${UI.escape(p.TenNguoiTao)}</td></tr>`,
        )
        .join("") || UI.empty(4);
    UI.el("shiftHistoryBody").innerHTML =
      data.historyShifts
        .map(
          (s) =>
            `<tr><td>#${s.MaPhienCa}</td><td>${UI.escape(s.TenThuNgan)}</td><td>${UI.date(s.ThoiGianMo)}<br>${UI.date(s.ThoiGianDong)}</td><td>${UI.escape(s.TrangThai)}</td><td>${UI.money(s.TienMatDauCa)}</td><td>${s.TienMatThucTeCuoiCa == null ? "—" : UI.money(s.TienMatThucTeCuoiCa)}</td><td>${s.TienChenhLech == null ? "—" : UI.money(s.TienChenhLech)}</td></tr>`,
        )
        .join("") || UI.empty(7);
  },
  renderShiftState() {
    const shift = this.activeShift,
      last = this.lastClosed,
      banner = UI.el("shiftBanner");
    banner.className =
      "status-banner " + (shift ? "status-open" : "status-closed");
    banner.textContent = shift
      ? `Ca #${shift.MaPhienCa} đang mở · thu ngân ${shift.TenThuNgan} · mở lúc ${UI.date(shift.ThoiGianMo)}. Có thể bán hàng, lập phiếu thu chi và chốt ca.`
      : "Chi nhánh chưa có ca mở. Hãy mở ca (bước ①) trước khi bán hàng.";
    UI.el("posShiftWarning").hidden = !!shift;
    // Thanh bước: bước đã xong / đang làm / chưa tới.
    const state = shift
      ? { open: "done", cash: "current", close: "current" }
      : { open: "current", cash: "todo", close: "todo" };
    UI.el("shiftSteps")
      .querySelectorAll("li")
      .forEach((li) => (li.className = state[li.dataset.step]));
    UI.el("openShiftForm").hidden = !!shift;
    UI.el("cashForm").hidden = !shift;
    UI.el("closeForm").hidden = !shift;
    UI.el("openShiftHint").textContent = shift
      ? `Ca #${shift.MaPhienCa} đang mở nên không thể mở thêm. Muốn mở ca mới, hãy chốt ca hiện tại ở bước ③.`
      : last
        ? `Ca trước (#${last.MaPhienCa}) chốt két ${UI.money(last.TienMatThucTeCuoiCa)}đ. Tiền đầu ca nên đúng số này; nếu khác, bắt buộc ghi lý do.`
        : "Chưa có ca nào trước đó. Nhập số tiền mặt có trong két lúc bắt đầu.";
    UI.el("cashHint").textContent = shift
      ? "Ghi mọi khoản thu/chi tiền mặt ngoài bán hàng (mua đá, đổi tiền lẻ...)."
      : "Cần mở ca trước khi lập phiếu thu chi.";
    // Gợi ý tiền đầu ca = tiền thực đếm cuối ca trước (không ghi đè nếu người dùng đã gõ).
    const money = UI.el("openShiftMoney");
    if (!shift && last && !money.dataset.touched)
      money.value = Number(last.TienMatThucTeCuoiCa ?? 0);
  },
  previewDifference() {
    const box = UI.el("differencePreview"),
      raw = UI.value("actualCash");
    if (!this.activeShift || raw === "") {
      box.textContent = "";
      return;
    }
    const diff = Number(raw) - this.theoreticalMoney;
    box.textContent =
      diff === 0
        ? "Khớp với tiền lý thuyết."
        : `Chênh lệch ${diff > 0 ? "thừa" : "thiếu"} ${UI.money(Math.abs(diff))}đ — cần ghi lý do.`;
  },
  requireShift() {
    if (!this.activeShift)
      throw new Error("Vui lòng mở ca POS tại chi nhánh đang chọn.");
    return this.activeShift.MaPhienCa;
  },
  async openShift() {
    const last = this.lastClosed;
    if (
      last &&
      Number(UI.value("openShiftMoney")) !== Number(last.TienMatThucTeCuoiCa) &&
      !UI.value("openShiftReason")
    )
      throw new Error(
        `Tiền đầu ca khác tiền chốt ca trước (${UI.money(last.TienMatThucTeCuoiCa)}đ). Hãy ghi lý do lệch.`,
      );
    const r = await ApiClient.post("/shifts/open", {
      MaChiNhanh: ManhModule.currentBranchId,
      TienMatDauCa: UI.value("openShiftMoney"),
      LyDoLechDauCa: UI.value("openShiftReason"),
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async createCashflow() {
    const r = await ApiClient.post("/shifts/cashflow", {
      MaPhienCa: this.requireShift(),
      LoaiPhieu: UI.value("cashflowType"),
      SoTien: UI.value("cashflowAmount"),
      LyDo: UI.value("cashflowReason"),
    });
    UI.el("cashflowAmount").value = "";
    UI.el("cashflowReason").value = "";
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async closeShift() {
    const r = await ApiClient.post("/shifts/close", {
      MaPhienCa: this.requireShift(),
      TienMatThucTeCuoiCa: UI.value("actualCash"),
      LyDoChenhLechCuoiCa: UI.value("closeShiftReason"),
    });
    await ManhModule.refresh();
    UI.el("shiftReconcileResult").textContent =
      `Lý thuyết ${UI.money(r.theoreticalCash)}đ · Thực đếm ${UI.money(r.actualCash)}đ · Chênh lệch ${UI.money(r.difference)}đ`;
    UI.notify(r.message);
    UI.el("actualCash").value = "";
    delete UI.el("openShiftMoney").dataset.touched;
    UI.el("differencePreview").textContent = "";
  },
  async createPromo() {
    const start = UI.value("promoStart"),
      end = UI.value("promoEnd");
    if (!start || !end)
      throw new Error("Vui lòng chọn ngày bắt đầu và kết thúc.");
    const r = await ApiClient.post("/promos", {
      MaCode: UI.value("promoCodeInput"),
      TenChuongTrinh: UI.value("promoName"),
      LoaiKhuyenMai: UI.value("promoType"),
      GiaTriGiam: UI.value("promoValue"),
      DonToiThieu: UI.value("promoMin"),
      GiamToiDa: UI.value("promoMax"),
      MaChiNhanh: UI.value("promoBranch"),
      DoiTuongApDung: UI.value("promoAudience"),
      GioiHanLuotDung: UI.value("promoLimit"),
      NgayBatDau: new Date(start).toISOString(),
      NgayKetThuc: new Date(end).toISOString(),
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  hydratePromos(rows) {
    const selected = UI.el("promoBranch").value;
    UI.el("promoBranch").innerHTML =
      (ManhModule.user.Role === "ADMIN"
        ? '<option value="">Toàn chuỗi</option>'
        : "") + UI.options(ManhModule.branches, "MaChiNhanh", "TenChiNhanh");
    if (ManhModule.user.Role !== "ADMIN")
      UI.el("promoBranch").value = ManhModule.currentBranchId;
    else if (ManhModule.branches.some((b) => String(b.MaChiNhanh) === selected))
      UI.el("promoBranch").value = selected;
    this.promos = rows;
    this.renderPromos();
  },
  /** Tình trạng thực tế của voucher = bật/tắt + thời gian + lượt dùng. */
  promoState(p, now = new Date()) {
    if (p.TrangThai !== "active")
      return { key: "inactive", label: "Đã tắt", css: "badge-off" };
    if (new Date(p.NgayBatDau) > now)
      return { key: "upcoming", label: "Sắp diễn ra", css: "badge-wait" };
    if (new Date(p.NgayKetThuc) < now)
      return { key: "expired", label: "Đã hết hạn", css: "badge-off" };
    if (p.GioiHanLuotDung != null && p.SoLuotDaDung >= p.GioiHanLuotDung)
      return { key: "exhausted", label: "Hết lượt", css: "badge-off" };
    return { key: "running", label: "Đang chạy", css: "badge-on" };
  },
  filterPromos() {
    this.promoPage = 1;
    this.renderPromos();
  },
  movePromoPage(delta) {
    this.promoPage += delta;
    this.renderPromos();
  },
  renderPromos() {
    const rows = this.promos || [],
      text = UI.value("promoSearch").toLocaleLowerCase("vi"),
      status = UI.value("promoFilterStatus"),
      time = UI.value("promoFilterTime"),
      audience = UI.value("promoFilterAudience"),
      now = new Date(),
      withState = rows.map((p) => ({ p, st: this.promoState(p, now) }));
    const count = (key) => withState.filter((x) => x.st.key === key).length;
    UI.el("promoSummary").innerHTML =
      `<span class="badge badge-on">Đang chạy ${count("running")}</span><span class="badge badge-wait">Sắp diễn ra ${count("upcoming")}</span><span class="badge badge-off">Đã tắt ${count("inactive")}</span><span class="badge badge-off">Hết hạn / hết lượt ${count("expired") + count("exhausted")}</span>`;
    const shown = withState.filter(
      ({ p, st }) =>
        (!text ||
          `${p.MaCode} ${p.TenChuongTrinh}`.toLocaleLowerCase("vi").includes(text)) &&
        (!status || p.TrangThai === status) &&
        (!time || st.key === time) &&
        (!audience || (p.DoiTuongApDung || "ALL") === audience),
    );
    const page = UI.paginate(shown, this.promoPage, PAGE_SIZE);
    this.promoPage = page.page;
    UI.el("promoPager").innerHTML = UI.pagerHtml(page, "YModule.movePromoPage");
    UI.el("promoTableBody").innerHTML =
      page.items
        .map(
          ({ p, st }) =>
            `<tr><td><b>${UI.escape(p.MaCode)}</b><br>${UI.escape(p.TenChuongTrinh)}</td><td>${UI.money(p.GiaTriGiam)}${p.LoaiKhuyenMai === "PERCENT" ? "%" : "đ"}<br>Từ ${UI.money(p.DonToiThieu)}đ${p.GiamToiDa ? `<br>Tối đa ${UI.money(p.GiamToiDa)}đ` : ""}</td><td>${p.DoiTuongApDung === "MEMBER" ? "Khách thành viên" : "Mọi khách"}<br><small>${UI.escape(p.TenChiNhanh || "Toàn chuỗi")}</small></td><td>${UI.date(p.NgayBatDau)}<br>→ ${UI.date(p.NgayKetThuc)}</td><td>${p.SoLuotDaDung || 0} / ${p.GioiHanLuotDung ?? "∞"}</td><td><span class="badge ${st.css}">${st.label}</span></td><td><button class="btn small-btn" onclick="UI.run(this,()=>YModule.togglePromo(${p.MaKhuyenMai},'${p.TrangThai === "active" ? "inactive" : "active"}'))">${p.TrangThai === "active" ? "Tắt voucher" : "Bật voucher"}</button> <button class="btn btn-red small-btn" onclick="UI.run(this,()=>YModule.deletePromo(${p.MaKhuyenMai},'${UI.escape(p.MaCode)}'))">Xóa</button></td></tr>`,
        )
        .join("") ||
      UI.empty(
        7,
        rows.length ? "Không có voucher khớp bộ lọc." : "Chưa có voucher.",
      );
  },
  async deletePromo(id, code) {
    if (!confirm(`Xóa voucher ${code}? Không thể hoàn tác.`)) return;
    const r = await ApiClient.delete(`/promos/${id}`);
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  async togglePromo(id, status) {
    const r = await ApiClient.put(`/promos/${id}/status`, {
      TrangThai: status,
    });
    UI.notify(r.message);
    await ManhModule.refresh();
  },
  hydrateCustomers(rows) {
    this.customers = rows;
    this.renderCustomers();
  },
  moveCustomerPage(delta) {
    this.customerPage += delta;
    this.renderCustomers();
  },
  renderCustomers() {
    const page = UI.paginate(this.customers, this.customerPage, PAGE_SIZE);
    this.customerPage = page.page;
    UI.el("customerPager").innerHTML = UI.pagerHtml(
      page,
      "YModule.moveCustomerPage",
    );
    UI.el("customerTableBody").innerHTML =
      page.items
        .map(
          (c) =>
            `<tr><td>${UI.escape(c.HoTen)}</td><td>${UI.escape(c.SoDienThoai)}</td><td>${c.DiemTichLuy}</td><td>${UI.money(c.TongChiTieu)}</td><td>${UI.escape(c.HangThanhVien)}</td></tr>`,
        )
        .join("") || UI.empty(5);
  },
};

export { YModule };
